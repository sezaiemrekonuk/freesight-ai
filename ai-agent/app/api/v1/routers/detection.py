from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
from app.services.detection_service import DetectionService

router = APIRouter()
detection_service = DetectionService()

@router.post("/detect", response_model=List[dict])
async def detect_objects(file: UploadFile = File(...)):
    """
    Detect objects in the uploaded image using the YOLO model.
    """
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid image type. Please upload a JPEG or PNG.")

    try:
        image_bytes = await file.read()
        detections = detection_service.predict(image_bytes)
        return detections
    except RuntimeError as re:
        raise HTTPException(status_code=503, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
