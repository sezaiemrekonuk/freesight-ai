"""Prompt constants and enums."""

from enum import Enum


class Prompt(str, Enum):
    """Enum for available prompts."""

    MAIN = "Main"
    DESCRIBE = "Describe"

    def __str__(self) -> str:
        """Return the prompt name as string."""
        return self.value


__all__ = ["Prompt"]

