/**
 * useVoiceControl Hook
 * Voice command recognition using Web Speech API
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Supported voice commands and their aliases
 */
const VOICE_COMMANDS = {
  scan: ['scan', 'look', 'check', 'analyze', 'what do you see', 'describe'],
  stop: ['stop', 'halt', 'pause', 'wait'],
  start: ['start', 'begin', 'go', 'resume', 'continue'],
  help: ['help', 'commands', 'what can i say', 'options'],
  mute: ['mute', 'quiet', 'silence', 'shut up'],
  unmute: ['unmute', 'sound on', 'speak'],
  repeat: ['repeat', 'again', 'say again', 'what'],
};

/**
 * Hook for voice command recognition
 * @param {Object} options - Configuration options
 * @param {Function} options.onCommand - Callback when command is recognized
 * @param {boolean} options.continuous - Whether to listen continuously
 * @returns {Object} Voice control state and methods
 */
export function useVoiceControl({ onCommand, continuous = true } = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState(null);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onCommandRef = useRef(onCommand);

  // Keep callback ref updated
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  /**
   * Match transcript to a known command
   * @param {string} text - Transcript text
   * @returns {string|null} Command name or null
   */
  const matchCommand = useCallback((text) => {
    const normalized = text.toLowerCase().trim();
    
    for (const [command, aliases] of Object.entries(VOICE_COMMANDS)) {
      for (const alias of aliases) {
        if (normalized.includes(alias)) {
          return command;
        }
      }
    }
    return null;
  }, []);

  /**
   * Initialize speech recognition
   */
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Restart if enabled and continuous mode
      if (isEnabled && continuous && recognitionRef.current) {
        try {
          setTimeout(() => {
            if (recognitionRef.current && isEnabled) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          // Ignore restart errors
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied');
        setIsEnabled(false);
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error);
      }
      
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update transcript display
      setTranscript(finalTranscript || interimTranscript);

      // Process final results for commands
      if (finalTranscript) {
        const command = matchCommand(finalTranscript);
        
        if (command) {
          setLastCommand({ command, transcript: finalTranscript });
          
          if (onCommandRef.current) {
            onCommandRef.current(command, finalTranscript);
          }
        }
      }
    };

    return recognition;
  }, [continuous, isEnabled, matchCommand]);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }

      if (recognitionRef.current) {
        setIsEnabled(true);
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError(err.message);
    }
  }, [isSupported, initRecognition]);

  /**
   * Stop listening for voice commands
   */
  const stopListening = useCallback(() => {
    setIsEnabled(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
    }
    
    setIsListening(false);
    setTranscript('');
  }, []);

  /**
   * Toggle voice control on/off
   */
  const toggle = useCallback(() => {
    if (isEnabled) {
      stopListening();
    } else {
      startListening();
    }
  }, [isEnabled, startListening, stopListening]);

  /**
   * Get available commands list
   */
  const getCommands = useCallback(() => {
    return Object.entries(VOICE_COMMANDS).map(([command, aliases]) => ({
      command,
      aliases,
      example: aliases[0],
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isSupported,
    isListening,
    isEnabled,
    transcript,
    lastCommand,
    error,
    
    // Actions
    startListening,
    stopListening,
    toggle,
    getCommands,
    
    // Commands reference
    commands: VOICE_COMMANDS,
  };
}

export default useVoiceControl;

