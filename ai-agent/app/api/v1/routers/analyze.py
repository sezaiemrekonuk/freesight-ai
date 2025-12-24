"""Unified analyze endpoint - Detection + LLM + TTS pipeline."""

import base64
import json
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal

from app.services.detection_service import DetectionService
from app.services.groq_client import GroqClient, GroqMessage, GroqChatOptions
from app.services.eleven_client import ElevenLabsTTSClient
from app.core.dependencies import get_groq_client, get_eleven_client, verify_api_token
from app.core.config import settings

router = APIRouter()
detection_service = DetectionService()


class DetectedObject(BaseModel):
    """Schema for a detected object."""
    class_id: int
    class_name: str
    confidence: float
    bbox: list[float]
    is_close: bool = False
    is_dangerous: bool = False
    position: str = "center"


class AnalyzeResponse(BaseModel):
    """Response schema for the analyze endpoint."""
    detections: list[DetectedObject] = Field(default_factory=list)
    description: str = Field(..., description="Navigation/safety description from LLM")
    panic: bool = Field(default=False, description="Whether immediate danger is detected")
    panic_level: Literal["none", "low", "medium", "high"] = Field(default="none")
    audio_base64: str | None = Field(default=None, description="Base64 encoded audio (mp3)")


# Dangerous object classes (common YOLO classes that could be hazardous)
DANGEROUS_CLASSES = {
    "car", "truck", "bus", "motorcycle", "bicycle", "train",
    "fire hydrant", "stop sign", "traffic light",
    "knife", "scissors", "dog", "horse", "cow", "bear"
}

# Close distance threshold (as percentage of image dimension)
CLOSE_THRESHOLD = 0.35  # Object taking >35% of image width/height is considered close


def analyze_detections(detections: list[dict], image_width: int = 640, image_height: int = 480) -> tuple[list[DetectedObject], bool, str]:
    """
    Analyze raw detections and enrich with safety metadata.
    
    Returns:
        Tuple of (enriched detections, panic flag, panic level)
    """
    enriched = []
    has_danger = False
    max_danger_score = 0.0
    
    for det in detections:
        bbox = det.get("bbox", [0, 0, 0, 0])
        x1, y1, x2, y2 = bbox
        
        # Calculate object size relative to image
        obj_width = (x2 - x1) / image_width
        obj_height = (y2 - y1) / image_height
        obj_size = max(obj_width, obj_height)
        
        # Determine position in frame
        center_x = (x1 + x2) / 2 / image_width
        if center_x < 0.33:
            position = "left"
        elif center_x > 0.66:
            position = "right"
        else:
            position = "center"
        
        # Check if object is close
        is_close = obj_size > CLOSE_THRESHOLD
        
        # Check if object is dangerous
        class_name = det.get("class_name", "").lower()
        is_dangerous = class_name in DANGEROUS_CLASSES
        
        # Calculate danger score
        danger_score = 0.0
        if is_dangerous:
            danger_score += 0.5
        if is_close:
            danger_score += 0.3
        if is_close and is_dangerous:
            danger_score += 0.2
        
        max_danger_score = max(max_danger_score, danger_score)
        
        if is_dangerous and is_close:
            has_danger = True
        
        enriched.append(DetectedObject(
            class_id=det.get("class_id", 0),
            class_name=det.get("class_name", "unknown"),
            confidence=det.get("confidence", 0.0),
            bbox=bbox,
            is_close=is_close,
            is_dangerous=is_dangerous,
            position=position
        ))
    
    # Determine panic level
    if max_danger_score >= 0.8:
        panic_level = "high"
    elif max_danger_score >= 0.5:
        panic_level = "medium"
    elif max_danger_score >= 0.3:
        panic_level = "low"
    else:
        panic_level = "none"
    
    return enriched, has_danger, panic_level


def format_detections_for_llm(detections: list[DetectedObject]) -> str:
    """Format detections as JSON for LLM input."""
    objects = []
    for det in detections:
        objects.append({
            "name": det.class_name,
            "position": det.position,
            "isClose": det.is_close,
            "isDangerous": det.is_dangerous,
            "confidence": round(det.confidence, 2)
        })
    return json.dumps(objects, indent=2)


@router.post("/", response_model=AnalyzeResponse, dependencies=[Depends(verify_api_token)])
async def analyze_image(
    file: UploadFile = File(...),
    groq_client: GroqClient = Depends(get_groq_client),
    eleven_client: ElevenLabsTTSClient | None = Depends(get_eleven_client),
):
    """
    Unified analysis endpoint: Detection + LLM Description + TTS Audio.
    
    Pipeline:
    1. Run YOLO object detection on uploaded image
    2. Analyze detections for danger/proximity
    3. Send to Groq LLM for navigation summary
    4. Convert description to speech via ElevenLabs
    5. Return complete analysis with audio
    
    **Authentication:** Requires a Bearer token in the Authorization header.
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid image type. Please upload a JPEG or PNG."
        )
    
    try:
        # Step 1: Read image and run detection
        image_bytes = await file.read()
        raw_detections = detection_service.predict(image_bytes)
        
        # Step 2: Analyze detections for safety metadata
        enriched_detections, panic, panic_level = analyze_detections(raw_detections)
        
        # Step 3: Generate LLM description
        if not enriched_detections:
            description = "The path ahead appears clear. No obstacles detected."
        else:
            # Format detections for LLM
            objects_json = format_detections_for_llm(enriched_detections)
            
            # Build messages for Groq
            system_prompt = """You are a navigation assistant for a blind user. Given detected objects with their positions and danger levels, provide a brief, clear safety summary.

Rules:
- Be extremely concise (1-2 sentences max)
- Prioritize dangers and close objects
- Use simple directions: left, right, ahead, behind
- If any object is dangerous and close, start with a warning
- Don't mention confidence scores or technical details
- Speak directly to the user

Example outputs:
- "Car approaching from the left. Step right to avoid."
- "Clear path ahead. Person standing to your right."
- "Stop! Fast-moving bicycle directly ahead."
- "All clear. Safe to proceed."""

            user_message = f"""Detected objects:
{objects_json}

Panic mode: {panic}
Provide a brief navigation instruction for the user."""

            messages = [
                GroqMessage(role="system", content=system_prompt),
                GroqMessage(role="user", content=user_message)
            ]
            
            options = GroqChatOptions(
                model="llama-3.1-8b-instant",
                temperature=0.3,
                max_tokens=100
            )
            
            response = await groq_client.chat_completion(messages, options=options)
            description = response.choices[0].message.content.strip()
        
        # Step 4: Generate TTS audio
        audio_base64 = None
        if eleven_client and settings.elevenlabs_voice_id:
            try:
                from app.models.schemas import TTSRequest
                
                tts_request = TTSRequest(
                    provider="elevenlabs",
                    model=settings.elevenlabs_tts_model,
                    input=description,
                    voice=settings.elevenlabs_voice_id,
                    response_format="mp3"
                )
                
                audio_bytes = await eleven_client.synthesize_speech(tts_request)
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            except Exception as tts_error:
                # Log but don't fail the request if TTS fails
                import logging
                logging.warning(f"TTS generation failed: {tts_error}")
        
        return AnalyzeResponse(
            detections=enriched_detections,
            description=description,
            panic=panic,
            panic_level=panic_level,
            audio_base64=audio_base64
        )
        
    except RuntimeError as re:
        raise HTTPException(status_code=503, detail=str(re))
    except Exception as e:
        import logging
        logging.error(f"Analyze endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

