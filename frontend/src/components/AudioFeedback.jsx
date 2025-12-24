/**
 * AudioFeedback Component
 * Visual indicator for audio playback state
 */

import { forwardRef, useImperativeHandle } from 'react';
import { useAudio } from '../hooks/useAudio';

/**
 * Audio feedback component with playback controls
 */
const AudioFeedback = forwardRef(function AudioFeedback({ 
  className = '',
  showControls = true,
}, ref) {
  const {
    isPlaying,
    isMuted,
    volume,
    queueLength,
    playBase64Audio,
    speakText,
    stop,
    toggleMute,
    setVolume,
  } = useAudio();

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    playAudio: playBase64Audio,
    speak: speakText,
    stop,
    toggleMute,
    setVolume,
    isPlaying,
    isMuted,
  }), [playBase64Audio, speakText, stop, toggleMute, setVolume, isPlaying, isMuted]);

  if (!showControls) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Playing indicator */}
      {isPlaying && (
        <div className="flex items-center gap-2" aria-live="polite">
          <div className="flex items-end gap-0.5 h-4">
            <div className="w-1 bg-orange-500 rounded-full animate-sound-bar-1" />
            <div className="w-1 bg-orange-500 rounded-full animate-sound-bar-2" />
            <div className="w-1 bg-orange-500 rounded-full animate-sound-bar-3" />
          </div>
          <span className="text-sm text-gray-700">Speaking</span>
        </div>
      )}

      {/* Queue indicator */}
      {queueLength > 0 && (
        <span className="text-sm text-gray-500">
          {queueLength} queued
        </span>
      )}

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className={`p-2 rounded-lg transition-colors ${
          isMuted 
            ? 'bg-red-100 text-red-600' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      {/* Volume slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="w-20"
        aria-label="Volume"
        title={`Volume: ${Math.round(volume * 100)}%`}
      />

      {/* Stop button (only when playing) */}
      {isPlaying && (
        <button
          onClick={stop}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Stop audio"
          title="Stop"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
});

export default AudioFeedback;

