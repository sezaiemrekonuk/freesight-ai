/**
 * useCamera Hook
 * Manages camera stream and frame capture for FreeSight
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Camera configuration options
 */
const CAMERA_CONFIG = {
  video: {
    facingMode: { ideal: 'environment' }, // Prefer back camera
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

/**
 * Hook for managing camera access and frame capture
 * @returns {Object} Camera controls and state
 */
export function useCamera() {
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /**
   * Start the camera stream
   */
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      const config = {
        ...CAMERA_CONFIG,
        video: {
          ...CAMERA_CONFIG.video,
          facingMode: { ideal: facingMode },
        },
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(config);
      
      setStream(mediaStream);
      setIsActive(true);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      return mediaStream;
    } catch (err) {
      console.error('Camera error:', err);
      setError(err.message);
      setHasPermission(false);
      setIsActive(false);
      throw err;
    }
  }, [facingMode]);

  /**
   * Stop the camera stream
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  /**
   * Toggle between front and back camera
   */
  const toggleCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    if (isActive) {
      stopCamera();
      // Small delay to ensure camera is released
      await new Promise(resolve => setTimeout(resolve, 100));
      await startCamera();
    }
  }, [facingMode, isActive, stopCamera, startCamera]);

  /**
   * Capture current frame as a Blob
   * @returns {Promise<Blob>} JPEG image blob
   */
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      throw new Error('Video or canvas not available');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture frame'));
          }
        },
        'image/jpeg',
        0.85 // Quality
      );
    });
  }, []);

  /**
   * Check if camera is available
   */
  const checkCameraAvailability = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      return cameras.length > 0;
    } catch {
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    // Refs
    videoRef,
    canvasRef,
    
    // State
    stream,
    isActive,
    error,
    hasPermission,
    facingMode,
    
    // Actions
    startCamera,
    stopCamera,
    toggleCamera,
    captureFrame,
    checkCameraAvailability,
  };
}

export default useCamera;

