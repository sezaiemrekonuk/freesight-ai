import requests
import sys
import os
import mimetypes

def test_endpoint(image_path):
    url = "http://localhost:8081/api/v1/vision/detect"
    
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found.")
        return

    print(f"Testing endpoint {url} with image {image_path}...")
    
    try:
        mime_type, _ = mimetypes.guess_type(image_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'
            
        with open(image_path, 'rb') as f:
            files = {'file': (os.path.basename(image_path), f, mime_type)}
            response = requests.post(url, files=files)
            
        if response.status_code == 200:
            print("\nSuccess! Detections:")
            print(response.json())
        else:
            print(f"\nFailed with status code {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_vision.py <path_to_image>")
        sys.exit(1)
        
    test_endpoint(sys.argv[1])
