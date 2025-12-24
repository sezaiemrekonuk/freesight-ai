/**
 * useHaptic Hook
 * Manages haptic feedback (vibration) for danger alerts
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Vibration patterns for different alert levels
 * Pattern arrays: [vibrate, pause, vibrate, pause, ...]
 */
const HAPTIC_PATTERNS = {
  // Single short buzz - info/acknowledgment
  info: [50],
  
  // Double tap - low warning
  low: [100, 50, 100],
  
  // Triple pulse - medium warning
  medium: [150, 100, 150, 100, 150],
  
  // Intense SOS-like pattern - high danger
  high: [300, 100, 300, 100, 300, 200, 100, 50, 100, 50, 100],
  
  // Continuous urgent pulse - panic
  panic: [200, 100, 200, 100, 200, 100, 200, 100, 200],
  
  // Gentle tap - success/clear
  success: [30],
  
  // Button press feedback
  tap: [10],
};

/**
 * Hook for managing haptic feedback
 * @returns {Object} Haptic controls and state
 */
export function useHaptic() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastPattern, setLastPattern] = useState(null);
  
  const vibrationTimeoutRef = useRef(null);

  // Check for vibration support on mount
  useEffect(() => {
    const supported = 'vibrate' in navigator;
    setIsSupported(supported);
    
    // Check for user preference
    const savedPreference = localStorage.getItem('freesight-haptic-enabled');
    if (savedPreference !== null) {
      setIsEnabled(savedPreference === 'true');
    }
  }, []);

  /**
   * Trigger vibration with a specific pattern
   * @param {string|number[]} pattern - Pattern name or custom array
   */
  const vibrate = useCallback((pattern) => {
    if (!isSupported || !isEnabled) return false;

    try {
      // Get pattern array
      const patternArray = typeof pattern === 'string' 
        ? HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.info
        : pattern;

      // Cancel any existing vibration
      navigator.vibrate(0);
      
      // Clear any pending timeout
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }

      // Trigger vibration
      const success = navigator.vibrate(patternArray);
      
      if (success) {
        setLastPattern(pattern);
      }
      
      return success;
    } catch (error) {
      console.error('Vibration error:', error);
      return false;
    }
  }, [isSupported, isEnabled]);

  /**
   * Vibrate based on panic level
   * @param {string} panicLevel - 'none' | 'low' | 'medium' | 'high'
   * @param {boolean} isPanic - If true, use panic pattern
   */
  const vibrateForDanger = useCallback((panicLevel, isPanic = false) => {
    if (isPanic) {
      return vibrate('panic');
    }

    switch (panicLevel) {
      case 'high':
        return vibrate('high');
      case 'medium':
        return vibrate('medium');
      case 'low':
        return vibrate('low');
      default:
        return false; // No vibration for 'none'
    }
  }, [vibrate]);

  /**
   * Stop any ongoing vibration
   */
  const stop = useCallback(() => {
    if (!isSupported) return;
    
    navigator.vibrate(0);
    
    if (vibrationTimeoutRef.current) {
      clearTimeout(vibrationTimeoutRef.current);
      vibrationTimeoutRef.current = null;
    }
    
    setLastPattern(null);
  }, [isSupported]);

  /**
   * Toggle haptic feedback on/off
   */
  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('freesight-haptic-enabled', String(newValue));
      return newValue;
    });
  }, []);

  /**
   * Quick tap feedback for UI interactions
   */
  const tap = useCallback(() => {
    return vibrate('tap');
  }, [vibrate]);

  /**
   * Success feedback
   */
  const success = useCallback(() => {
    return vibrate('success');
  }, [vibrate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }
      if (isSupported) {
        navigator.vibrate(0);
      }
    };
  }, [isSupported]);

  return {
    // State
    isSupported,
    isEnabled,
    lastPattern,
    
    // Actions
    vibrate,
    vibrateForDanger,
    stop,
    toggle,
    tap,
    success,
    
    // Patterns for reference
    patterns: HAPTIC_PATTERNS,
  };
}

export default useHaptic;

