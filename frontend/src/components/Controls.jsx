/**
 * Controls Component
 * Main control panel for FreeSight
 */

import { useState } from 'react';

/**
 * Scan mode options
 */
const SCAN_MODES = {
  manual: { label: 'Manual', description: 'Tap to scan' },
  continuous: { label: 'Auto', description: 'Scans every few seconds' },
};

/**
 * Controls component for camera and scanning
 */
function Controls({
  mode = 'manual',
  onModeChange,
  onScan,
  onStop,
  isScanning = false,
  isAnalyzing = false,
  scanInterval = 3,
  onIntervalChange,
  className = '',
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main scan button */}
      <button
        onClick={isScanning && mode === 'continuous' ? onStop : onScan}
        disabled={isAnalyzing}
        className={`
          w-full py-6 rounded-2xl font-bold text-xl transition-all
          ${isAnalyzing 
            ? 'bg-zinc-700 text-zinc-400 cursor-wait'
            : isScanning && mode === 'continuous'
            ? 'bg-red-600 hover:bg-red-500 text-white active:scale-95'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
          }
          focus:outline-none focus:ring-4 focus:ring-indigo-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={
          isAnalyzing 
            ? 'Analyzing...' 
            : isScanning && mode === 'continuous' 
            ? 'Stop continuous scanning' 
            : 'Scan environment'
        }
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : isScanning && mode === 'continuous' ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-4 h-4 bg-white rounded-sm" />
            Stop Scanning
          </span>
        ) : (
          <span className="flex items-center justify-center gap-3">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Scan
          </span>
        )}
      </button>

      {/* Mode toggle */}
      <div className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-1">
        {Object.entries(SCAN_MODES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => onModeChange?.(key)}
            className={`
              flex-1 py-3 px-4 rounded-lg font-semibold transition-all
              ${mode === key 
                ? 'bg-indigo-600 text-white' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }
              focus:outline-none focus:ring-2 focus:ring-indigo-500
            `}
            aria-pressed={mode === key}
            aria-label={`${label} mode: ${SCAN_MODES[key].description}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Continuous mode settings */}
      {mode === 'continuous' && (
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="scan-interval" className="text-sm text-zinc-400">
              Scan every
            </label>
            <span className="text-white font-semibold">{scanInterval}s</span>
          </div>
          <input
            id="scan-interval"
            type="range"
            min="1"
            max="10"
            value={scanInterval}
            onChange={(e) => onIntervalChange?.(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            aria-label={`Scan interval: ${scanInterval} seconds`}
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>1s</span>
            <span>5s</span>
            <span>10s</span>
          </div>
        </div>
      )}

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full py-3 px-4 bg-zinc-800/50 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
        aria-expanded={showSettings}
        aria-label="Toggle settings"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
        <svg 
          className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

export default Controls;

