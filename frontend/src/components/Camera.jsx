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
          let borderColor = 'border-emerald-400';
          let bgColor = 'bg-emerald-400/20';
          if (det.is_dangerous && det.is_close) {
            borderColor = 'border-red-500';
            bgColor = 'bg-red-500/30';
          } else if (det.is_dangerous || det.is_close) {
            borderColor = 'border-amber-400';
            bgColor = 'bg-amber-400/20';
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
                className={`absolute -top-6 left-0 text-xs font-bold px-1 rounded ${
                  det.is_dangerous && det.is_close 
                    ? 'bg-red-500 text-white' 
                    : det.is_dangerous || det.is_close
                    ? 'bg-amber-400 text-black'
                    : 'bg-emerald-400 text-black'
                }`}
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
      <div className={`relative bg-zinc-900 rounded-2xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
          <p className="text-zinc-400 mb-4">
            FreeSight needs camera access to help you navigate safely.
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
            aria-label="Enable camera access"
          >
            Enable Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-zinc-900 rounded-2xl overflow-hidden ${className}`}>
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
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-white font-medium">LIVE</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
});

export default Camera;

