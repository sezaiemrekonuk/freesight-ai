/**
 * Camera Component
 * Displays camera feed with detection overlay
 */

import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useCamera } from '../hooks/useCamera';

/**
 * Camera component with detection overlay support
 */
const Camera = forwardRef(function Camera({ 
  onReady, 
  onError,
  detections = [],
  showOverlay = true,
  className = '' 
}, ref) {
  const {
    videoRef,
    canvasRef,
    isActive,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    toggleCamera,
    captureFrame,
  } = useCamera();

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    start: startCamera,
    stop: stopCamera,
    toggle: toggleCamera,
    capture: captureFrame,
    isActive,
  }), [startCamera, stopCamera, toggleCamera, captureFrame, isActive]);

  // Handle camera ready state
  useEffect(() => {
    if (isActive && onReady) {
      onReady();
    }
  }, [isActive, onReady]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Render detection boxes overlay
  const renderDetections = () => {
    if (!showOverlay || !detections.length || !videoRef.current) return null;

    const video = videoRef.current;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
    
    const scaleX = displayWidth / videoWidth;
    const scaleY = displayHeight / videoHeight;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {detections.map((det, idx) => {
          const [x1, y1, x2, y2] = det.bbox;
          const left = x1 * scaleX;
          const top = y1 * scaleY;
          const width = (x2 - x1) * scaleX;
          const height = (y2 - y1) * scaleY;

          // Color based on danger level
          let borderColor = 'border-green-500';
          let bgColor = 'bg-green-500/20';
          let labelColor = 'bg-green-500 text-white';
          
          if (det.is_dangerous && det.is_close) {
            borderColor = 'border-red-500';
            bgColor = 'bg-red-500/20';
            labelColor = 'bg-red-500 text-white';
          } else if (det.is_dangerous || det.is_close) {
            borderColor = 'border-yellow-500';
            bgColor = 'bg-yellow-500/20';
            labelColor = 'bg-yellow-500 text-gray-900';
          }

          return (
            <div
              key={`${det.class_name}-${idx}`}
              className={`absolute border-2 ${borderColor} ${bgColor} rounded`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              <span 
                className={`absolute -top-5 left-0 text-xs font-medium px-2 py-0.5 rounded ${labelColor}`}
              >
                {det.class_name} {Math.round(det.confidence * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Permission denied state
  if (hasPermission === false) {
    return (
      <div className={`relative bg-white rounded-lg overflow-hidden border-2 border-gray-200 ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h3>
          <p className="text-gray-600 mb-4 text-sm">
            FreeSight needs camera access to help you navigate safely.
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            aria-label="Enable camera access"
          >
            Enable Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        aria-label="Camera feed"
      />
      
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      
      {/* Detection overlay */}
      {renderDetections()}
      
      {/* Scanning indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-white font-medium">LIVE</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-3 left-3 right-3 bg-red-500 text-white px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
});

export default Camera;

