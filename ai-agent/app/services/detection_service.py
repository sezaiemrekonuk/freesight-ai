import os
from ultralytics import YOLO
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class DetectionService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DetectionService, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        try:
            # Path relative to the working directory or absolute
            model_path = os.path.join(os.getcwd(), "app", "weights", "best.pt")
            logger.info(f"Loading model from {model_path}")
            if not os.path.exists(model_path):
                logger.warning(f"Model file not found at {model_path}. Inference will fail.")
                # We optionally could raise here, but let's allow service start and fail on predict
                return
            
            self._model = YOLO(model_path)
            logger.info("YOLO model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self._model = None

    def predict(self, image_bytes: bytes, conf_threshold: float = 0.25):
        if self._model is None:
            self._load_model()
            if self._model is None:
                 raise RuntimeError("Model is not loaded. Please check if 'best.pt' exists in 'app/weights/'.")

        try:
            image = Image.open(io.BytesIO(image_bytes))
            results = self._model.predict(image, conf=conf_threshold)
            
            # Process results into a JSON-friendly format
            detections = []
            for result in results:
                # result.boxes contains bounding boxes, confidences, and class ids
                for box in result.boxes:
                    detection = {
                        "class_id": int(box.cls[0]),
                        "class_name": self._model.names[int(box.cls[0])],
                        "confidence": float(box.conf[0]),
                        "bbox": box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    }
                    detections.append(detection)
            
            return detections
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise e
