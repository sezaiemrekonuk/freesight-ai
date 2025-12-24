/**
 * FreeSight - Accessible Navigation for the Blind
 * Main Application Component
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Camera from './components/Camera';
import Controls from './components/Controls';
import AudioFeedback from './components/AudioFeedback';
import PhotoUpload from './components/PhotoUpload';
import { useHaptic } from './hooks/useHaptic';
import { useVoiceControl } from './hooks/useVoiceControl';
import { analyzeImage, checkHealth } from './services/api';

/**
 * Main App Component
 */
function App() {
  // State
  const [mode, setMode] = useState('manual'); // 'manual' | 'continuous'
  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'photo' for demo
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detections, setDetections] = useState([]);
  const [lastDescription, setLastDescription] = useState('');
  const [panicLevel, setPanicLevel] = useState('none');
  const [isPanic, setIsPanic] = useState(false);
  const [scanInterval, setScanInterval] = useState(3);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [error, setError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Refs
  const cameraRef = useRef(null);
  const audioRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Hooks
  const haptic = useHaptic();
  
  const handleVoiceCommand = useCallback((command) => {
    haptic.tap();
    
    switch (command) {
      case 'scan':
        handleScan();
        break;
      case 'stop':
        handleStop();
        break;
      case 'start':
        if (mode === 'continuous') {
          startContinuousScanning();
        } else {
          handleScan();
        }
        break;
      case 'mute':
        audioRef.current?.toggleMute();
        break;
      case 'unmute':
        if (audioRef.current?.isMuted) {
          audioRef.current.toggleMute();
        }
        break;
      case 'repeat':
        if (lastDescription) {
          audioRef.current?.speak(lastDescription, true);
        }
        break;
      case 'help':
        audioRef.current?.speak(
          'Available commands: Say "scan" to analyze, "stop" to pause, "mute" or "unmute" for audio, "repeat" to hear the last description again.',
          true
        );
        break;
      default:
        break;
    }
  }, [mode, lastDescription, haptic]);

  const voiceControl = useVoiceControl({ 
    onCommand: handleVoiceCommand,
    continuous: true 
  });

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await checkHealth();
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Perform a single scan
   */
  const handleScan = useCallback(async () => {
    if (!cameraRef.current?.isActive || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    haptic.tap();

    try {
      // Capture frame
      const imageBlob = await cameraRef.current.capture();
      
      // Analyze
      const result = await analyzeImage(imageBlob);
      
      // Update state
      setDetections(result.detections || []);
      setLastDescription(result.description);
      setPanicLevel(result.panic_level || 'none');
      setIsPanic(result.panic || false);

      // Haptic feedback based on danger level
      haptic.vibrateForDanger(result.panic_level, result.panic);

      // Play audio if available
      if (result.audio_base64) {
        audioRef.current?.playAudio(result.audio_base64, result.panic);
      } else if (result.description) {
        audioRef.current?.speak(result.description, result.panic);
      }

    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message);
      haptic.vibrate('low');
      audioRef.current?.speak('Scan failed. Please try again.', true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, haptic]);

  /**
   * Start continuous scanning
   */
  const startContinuousScanning = useCallback(() => {
    setIsScanning(true);
    handleScan();
    
    scanIntervalRef.current = setInterval(() => {
      if (!isAnalyzing) {
        handleScan();
      }
    }, scanInterval * 1000);
  }, [scanInterval, handleScan, isAnalyzing]);

  /**
   * Stop scanning
   */
  const handleStop = useCallback(() => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    haptic.tap();
  }, [haptic]);

  /**
   * Handle scan button click
   */
  const handleScanClick = useCallback(() => {
    if (mode === 'continuous') {
      if (isScanning) {
        handleStop();
      } else {
        startContinuousScanning();
      }
    } else {
      handleScan();
    }
  }, [mode, isScanning, handleStop, startContinuousScanning, handleScan]);

  /**
   * Handle mode change
   */
  const handleModeChange = useCallback((newMode) => {
    if (isScanning) {
      handleStop();
    }
    setMode(newMode);
    haptic.tap();
  }, [isScanning, handleStop, haptic]);

  /**
   * Handle input mode change (camera vs photo)
   */
  const handleInputModeChange = useCallback((newInputMode) => {
    if (isScanning) {
      handleStop();
    }
    setInputMode(newInputMode);
    setDetections([]);
    setLastDescription('');
    setPanicLevel('none');
    setIsPanic(false);
    setError(null);
    haptic.tap();
  }, [isScanning, handleStop, haptic]);

  /**
   * Handle uploaded photo selection
   */
  const handlePhotoSelect = useCallback((file) => {
    setUploadedImage(file);
    setDetections([]);
    setLastDescription('');
    setPanicLevel('none');
    setIsPanic(false);
    setError(null);
  }, []);

  /**
   * Analyze uploaded photo
   */
  const handleAnalyzePhoto = useCallback(async () => {
    if (!uploadedImage || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    haptic.tap();

    try {
      // Analyze the uploaded image
      const result = await analyzeImage(uploadedImage);
      
      // Update state
      setDetections(result.detections || []);
      setLastDescription(result.description);
      setPanicLevel(result.panic_level || 'none');
      setIsPanic(result.panic || false);

      // Haptic feedback based on danger level
      haptic.vibrateForDanger(result.panic_level, result.panic);

      // Play audio if available
      if (result.audio_base64) {
        audioRef.current?.playAudio(result.audio_base64, result.panic);
      } else if (result.description) {
        audioRef.current?.speak(result.description, result.panic);
      }

    } catch (err) {
      console.error('Photo analysis error:', err);
      setError(err.message);
      haptic.vibrate('low');
      audioRef.current?.speak('Photo analysis failed. Please try again.', true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedImage, isAnalyzing, haptic]);

  /**
   * Start camera on mount
   */
  useEffect(() => {
    // Auto-start camera after a short delay
    const timer = setTimeout(() => {
      cameraRef.current?.start();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Skip to main content for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-orange-500 focus:px-4 focus:py-2 focus:rounded-lg focus:text-white"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-base text-gray-900">FreeSight</h1>
              <p className="text-xs text-gray-500">Navigation Assistant</p>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}
              aria-label={`Connection status: ${connectionStatus}`}
            />
            
            {/* Voice control toggle */}
            <button
              onClick={voiceControl.toggle}
              className={`p-2 rounded-lg transition-colors ${
                voiceControl.isListening 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label={voiceControl.isListening ? 'Voice control active' : 'Enable voice control'}
              title={voiceControl.isListening ? 'Voice control on' : 'Voice control off'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Haptic toggle */}
            {haptic.isSupported && (
              <button
                onClick={haptic.toggle}
                className={`p-2 rounded-lg transition-colors ${
                  haptic.isEnabled 
                    ? 'bg-gray-100 text-gray-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}
                aria-label={haptic.isEnabled ? 'Disable haptic feedback' : 'Enable haptic feedback'}
                title={haptic.isEnabled ? 'Haptics on' : 'Haptics off'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        {/* Input mode toggle (Camera vs Photo Upload) */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => handleInputModeChange('camera')}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
              ${inputMode === 'camera' 
                ? 'bg-orange-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }
            `}
            aria-pressed={inputMode === 'camera'}
            aria-label="Use camera mode"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Camera
          </button>
          <button
            onClick={() => handleInputModeChange('photo')}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
              ${inputMode === 'photo' 
                ? 'bg-orange-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }
            `}
            aria-pressed={inputMode === 'photo'}
            aria-label="Use photo upload mode for demo"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upload Photo
          </button>
        </div>

        {/* Camera or Photo Upload view */}
        <div className="mb-6">
          {inputMode === 'camera' ? (
            <Camera
              ref={cameraRef}
              detections={detections}
              showOverlay={true}
              className="aspect-[4/3] w-full"
              onError={(err) => setError(err)}
            />
          ) : (
            <PhotoUpload
              onImageSelect={handlePhotoSelect}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>

        {/* Panic alert */}
        {isPanic && (
          <div 
            className="mb-4 p-4 bg-red-500 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-white">Danger Detected</p>
                <p className="text-sm text-white">Immediate attention required</p>
              </div>
            </div>
          </div>
        )}

        {/* Last description */}
        {lastDescription && (
          <div 
            className={`mb-4 p-4 rounded-lg ${
              panicLevel === 'high' ? 'bg-red-50 border border-red-300' :
              panicLevel === 'medium' ? 'bg-yellow-50 border border-yellow-300' :
              panicLevel === 'low' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-white border border-gray-200'
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-base leading-relaxed text-gray-900">{lastDescription}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <span>{detections.length} detected</span>
              {panicLevel !== 'none' && (
                <span className={`px-2 py-0.5 rounded font-medium ${
                  panicLevel === 'high' ? 'bg-red-100 text-red-800' :
                  panicLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {panicLevel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div 
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
          >
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Controls */}
        {inputMode === 'camera' ? (
          <Controls
            mode={mode}
            onModeChange={handleModeChange}
            onScan={handleScanClick}
            onStop={handleStop}
            isScanning={isScanning}
            isAnalyzing={isAnalyzing}
            scanInterval={scanInterval}
            onIntervalChange={setScanInterval}
          />
         ) : (
           /* Photo mode controls */
           <button
             onClick={handleAnalyzePhoto}
             disabled={!uploadedImage || isAnalyzing}
             className={`
               w-full py-4 rounded-lg font-medium text-base transition-colors
               ${isAnalyzing 
                 ? 'bg-gray-200 text-gray-500 cursor-wait'
                 : !uploadedImage
                 ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                 : 'bg-orange-500 hover:bg-orange-600 text-white'
               }
               disabled:opacity-60
             `}
             aria-label={
               isAnalyzing 
                 ? 'Analyzing...' 
                 : !uploadedImage 
                 ? 'Upload an image first' 
                 : 'Analyze uploaded photo'
             }
           >
             {isAnalyzing ? (
               <span className="flex items-center justify-center gap-2">
                 <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                 </svg>
                 Analyzing...
               </span>
             ) : !uploadedImage ? (
               'Upload an Image First'
             ) : (
               <span className="flex items-center justify-center gap-2">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                 </svg>
                 Analyze Photo
               </span>
             )}
           </button>
         )}

        {/* Audio controls */}
        <div className="mt-4 flex items-center justify-between">
          <AudioFeedback ref={audioRef} showControls={true} />
          
          {/* Voice control indicator */}
          {voiceControl.isListening && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span>Listening...</span>
            </div>
          )}
        </div>

        {/* Voice transcript */}
        {voiceControl.transcript && (
          <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
            "{voiceControl.transcript}"
          </div>
        )}
      </main>

      {/* Footer with help */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            {inputMode === 'photo' ? (
              <>Upload a photo to analyze</>
            ) : voiceControl.isSupported ? (
              <>Say "scan" to analyze or tap the button</>
            ) : (
              <>Tap the scan button to analyze</>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
