/**
 * useAudio Hook
 * Manages audio playback for TTS responses
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for managing audio playback queue
 * @returns {Object} Audio controls and state
 */
export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [queue, setQueue] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  /**
   * Play audio from base64 encoded string
   * @param {string} base64Audio - Base64 encoded audio (mp3)
   * @param {boolean} priority - If true, clears queue and plays immediately
   */
  const playBase64Audio = useCallback((base64Audio, priority = false) => {
    if (!base64Audio) return;

    const audioData = `data:audio/mpeg;base64,${base64Audio}`;
    
    if (priority) {
      // Stop current audio and clear queue
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setQueue([]);
      playAudioData(audioData);
    } else {
      // Add to queue
      setQueue(prev => [...prev, audioData]);
    }
  }, []);

  /**
   * Play audio data URL
   * @param {string} audioData - Data URL for audio
   */
  const playAudioData = useCallback((audioData) => {
    if (isMuted) return;

    const audio = new Audio(audioData);
    audio.volume = volume;
    audioRef.current = audio;
    
    audio.onplay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      audioRef.current = null;
      setCurrentAudio(null);
      // Process next in queue
      processQueue();
    };
    
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      isPlayingRef.current = false;
      audioRef.current = null;
      // Try next in queue
      processQueue();
    };

    setCurrentAudio(audioData);
    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
      setIsPlaying(false);
      isPlayingRef.current = false;
    });
  }, [isMuted, volume]);

  /**
   * Process the audio queue
   */
  const processQueue = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0 || isPlayingRef.current) return prev;
      
      const [next, ...rest] = prev;
      setTimeout(() => playAudioData(next), 100);
      return rest;
    });
  }, [playAudioData]);

  /**
   * Speak text using browser's speech synthesis (fallback)
   * @param {string} text - Text to speak
   * @param {boolean} priority - If true, cancels current speech
   */
  const speakText = useCallback((text, priority = false) => {
    if (!window.speechSynthesis || isMuted) return;

    if (priority) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = volume;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  }, [isMuted, volume]);

  /**
   * Stop all audio playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setQueue([]);
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentAudio(null);
  }, []);

  /**
   * Toggle mute state
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  /**
   * Set volume level
   * @param {number} newVolume - Volume level (0.0 to 1.0)
   */
  const setVolumeLevel = useCallback((newVolume) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  // Process queue when items are added
  useEffect(() => {
    if (queue.length > 0 && !isPlayingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    // State
    isPlaying,
    isMuted,
    volume,
    queueLength: queue.length,
    
    // Actions
    playBase64Audio,
    speakText,
    stop,
    toggleMute,
    setVolume: setVolumeLevel,
  };
}

export default useAudio;

