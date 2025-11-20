"""Prompt manager for loading and processing YAML prompt files."""

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from app.services.groq_client import GroqMessage, GroqRole


class PromptMessage(BaseModel):
    """Prompt message model."""

    role: GroqRole
    content: str


class PromptConfig(BaseModel):
    """Prompt configuration model."""

    model: str = Field(..., description="Model name")
    provider: str = Field(default="groq", description="Provider name")
    messages: list[PromptMessage] = Field(..., description="List of messages")
    variables: list[str] = Field(default_factory=list, description="List of variable names")


class PromptManager:
    """Manages prompt loading, parsing, and variable substitution."""

    def __init__(self, prompts_dir: Path | None = None) -> None:
        """
        Initialize the prompt manager.

        Args:
            prompts_dir: Directory containing prompt YAML files. Defaults to app/prompts
        """
        if prompts_dir is None:
            prompts_dir = Path(__file__).resolve().parent.parent / "prompts"
        self.prompts_dir = prompts_dir
        self._cache: dict[str, PromptConfig] = {}

    def load_prompt(self, prompt_name: str) -> PromptConfig:
        """
        Load a prompt from YAML file.

        Args:
            prompt_name: Name of the prompt (without .prompt.yaml extension)

        Returns:
            PromptConfig instance

        Raises:
            FileNotFoundError: If prompt file doesn't exist
            ValueError: If prompt file is invalid
        """
        # Check cache first
        if prompt_name in self._cache:
            return self._cache[prompt_name]

        # Load from file
        prompt_file = self.prompts_dir / f"{prompt_name}.prompt.yaml"
        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")

        with open(prompt_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # Handle typo in YAML files (provoder -> provider)
        if "provoder" in data:
            data["provider"] = data.pop("provoder")

        # Parse messages
        messages = []
        for msg_data in data.get("messages", []):
            messages.append(
                PromptMessage(
                    role=msg_data["role"],
                    content=msg_data.get("content", ""),
                )
            )

        # Create config
        config = PromptConfig(
            model=data.get("model", "llama-3.1-8b-instant"),
            provider=data.get("provider", "groq"),
            messages=messages,
            variables=data.get("variables", []),
        )

        # Cache it
        self._cache[prompt_name] = config

        return config

    def render_prompt(
        self,
        prompt_name: str,
        variables: dict[str, Any] | None = None,
    ) -> tuple[list[GroqMessage], str]:
        """
        Render a prompt with variable substitution.

        Args:
            prompt_name: Name of the prompt
            variables: Dictionary of variables to substitute (e.g., {"user_input": "Hello"})

        Returns:
            Tuple of (list of GroqMessage, model_name)

        Raises:
            ValueError: If required variables are missing
        """
        config = self.load_prompt(prompt_name)
        variables = variables or {}

        # Check for missing required variables
        missing_vars = [var for var in config.variables if var not in variables]
        if missing_vars:
            raise ValueError(
                f"Missing required variables for prompt '{prompt_name}': {', '.join(missing_vars)}"
            )

        # Render messages with variable substitution
        rendered_messages: list[GroqMessage] = []
        for msg in config.messages:
            content = msg.content

            # Substitute variables in content
            # Support both {{variable}} and {variable} syntax
            for var_name, var_value in variables.items():
                # Handle {{variable}} syntax (double braces)
                content = content.replace(f"{{{{{var_name}}}}}", str(var_value))
                # Handle {variable} syntax (single braces)
                content = content.replace(f"{{{var_name}}}", str(var_value))

            # If this is a user message and has no content, use variables
            if msg.role == "user" and not content.strip() and variables:
                # For user messages, format variables based on prompt's variable list
                if config.variables:
                    # Use the order defined in the prompt file
                    var_parts = []
                    for var_name in config.variables:
                        if var_name in variables:
                            var_value = variables[var_name]
                            # Format based on variable name
                            if var_name == "objectsInImage":
                                var_parts.append(f"<Objects>\n{var_value}\n</Objects>")
                            elif var_name == "isPanic":
                                var_parts.append(f"<Panic>{var_value}</Panic>")
                            else:
                                var_parts.append(f"<{var_name}>\n{var_value}\n</{var_name}>")
                    content = "\n\n".join(var_parts) if var_parts else str(list(variables.values())[0])
                else:
                    # No variable list defined, use simple format
                    if len(variables) == 1:
                        content = str(list(variables.values())[0])
                    else:
                        content = "\n".join(f"{k}: {v}" for k, v in variables.items())

            rendered_messages.append(
                GroqMessage(
                    role=msg.role,
                    content=content,
                )
            )

        return rendered_messages, config.model

    def get_prompt_model(self, prompt_name: str) -> str:
        """
        Get the model name for a prompt.

        Args:
            prompt_name: Name of the prompt

        Returns:
            Model name
        """
        config = self.load_prompt(prompt_name)
        return config.model


# Singleton instance
_prompt_manager: PromptManager | None = None


def get_prompt_manager() -> PromptManager:
    """Get or create the global prompt manager instance."""
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
    return _prompt_manager

