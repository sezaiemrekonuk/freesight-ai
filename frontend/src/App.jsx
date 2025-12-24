/**
 * FreeSight - Accessible Navigation for the Blind
 * Main Application Component
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Camera from './components/Camera';
import Controls from './components/Controls';
import AudioFeedback from './components/AudioFeedback';
import { useHaptic } from './hooks/useHaptic';
import { useVoiceControl } from './hooks/useVoiceControl';
import { analyzeImage, checkHealth } from './services/api';

/**
 * Main App Component
 */
function App() {
  // State
  const [mode, setMode] = useState('manual'); // 'manual' | 'continuous'
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detections, setDetections] = useState([]);
  const [lastDescription, setLastDescription] = useState('');
  const [panicLevel, setPanicLevel] = useState('none');
  const [isPanic, setIsPanic] = useState(false);
  const [scanInterval, setScanInterval] = useState(3);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [error, setError] = useState(null);

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
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Skip to main content for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg">FreeSight</h1>
              <p className="text-xs text-zinc-500">Navigation Assistant</p>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400' :
                connectionStatus === 'checking' ? 'bg-amber-400 animate-pulse' :
                'bg-red-500'
              }`}
              aria-label={`Connection status: ${connectionStatus}`}
            />
            
            {/* Voice control toggle */}
            <button
              onClick={voiceControl.toggle}
              className={`p-2 rounded-lg transition-colors ${
                voiceControl.isListening 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              aria-label={voiceControl.isListening ? 'Voice control active' : 'Enable voice control'}
              title={voiceControl.isListening ? 'Voice control on' : 'Voice control off'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Haptic toggle */}
            {haptic.isSupported && (
              <button
                onClick={haptic.toggle}
                className={`p-2 rounded-lg transition-colors ${
                  haptic.isEnabled 
                    ? 'bg-zinc-800 text-zinc-300' 
                    : 'bg-zinc-800 text-zinc-600'
                }`}
                aria-label={haptic.isEnabled ? 'Disable haptic feedback' : 'Enable haptic feedback'}
                title={haptic.isEnabled ? 'Haptics on' : 'Haptics off'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        {/* Camera view */}
        <div className="mb-6">
          <Camera
            ref={cameraRef}
            detections={detections}
            showOverlay={true}
            className="aspect-[4/3] w-full"
            onError={(err) => setError(err)}
          />
        </div>

        {/* Panic alert */}
        {isPanic && (
          <div 
            className="mb-4 p-4 bg-red-600 rounded-xl animate-pulse"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-bold text-white">Danger Detected!</p>
                <p className="text-sm text-white/80">Immediate attention required</p>
              </div>
            </div>
          </div>
        )}

        {/* Last description */}
        {lastDescription && (
          <div 
            className={`mb-4 p-4 rounded-xl ${
              panicLevel === 'high' ? 'bg-red-900/50 border border-red-500' :
              panicLevel === 'medium' ? 'bg-amber-900/50 border border-amber-500' :
              panicLevel === 'low' ? 'bg-yellow-900/50 border border-yellow-600' :
              'bg-zinc-800/50 border border-zinc-700'
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-lg font-medium">{lastDescription}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <span>{detections.length} object{detections.length !== 1 ? 's' : ''} detected</span>
              {panicLevel !== 'none' && (
                <span className={`px-2 py-0.5 rounded-full ${
                  panicLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                  panicLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {panicLevel} alert
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div 
            className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl"
            role="alert"
          >
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Controls */}
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

        {/* Audio controls */}
        <div className="mt-4 flex items-center justify-between">
          <AudioFeedback ref={audioRef} showControls={true} />
          
          {/* Voice control indicator */}
          {voiceControl.isListening && (
            <div className="flex items-center gap-2 text-sm text-indigo-400">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              <span>Listening...</span>
            </div>
          )}
        </div>

        {/* Voice transcript */}
        {voiceControl.transcript && (
          <div className="mt-2 text-sm text-zinc-500 italic">
            "{voiceControl.transcript}"
          </div>
        )}
      </main>

      {/* Footer with help */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-800 py-3 px-4">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-zinc-500">
            {voiceControl.isSupported ? (
              <>Say "scan" to analyze • "help" for more commands</>
            ) : (
              <>Tap the scan button to analyze your surroundings</>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
