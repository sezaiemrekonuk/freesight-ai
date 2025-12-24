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
          w-full py-4 rounded-lg font-medium text-base transition-colors
          ${isAnalyzing 
            ? 'bg-gray-200 text-gray-500 cursor-wait'
            : isScanning && mode === 'continuous'
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
          }
          disabled:opacity-60 disabled:cursor-not-allowed
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
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : isScanning && mode === 'continuous' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop Scanning
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Scan
          </span>
        )}
      </button>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {Object.entries(SCAN_MODES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => onModeChange?.(key)}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium transition-colors
              ${mode === key 
                ? 'bg-orange-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }
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
        <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <label htmlFor="scan-interval" className="text-sm text-gray-700 font-medium">
              Scan every
            </label>
            <span className="text-orange-600 font-semibold">{scanInterval}s</span>
          </div>
          <input
            id="scan-interval"
            type="range"
            min="1"
            max="10"
            value={scanInterval}
            onChange={(e) => onIntervalChange?.(parseInt(e.target.value, 10))}
            className="w-full"
            aria-label={`Scan interval: ${scanInterval} seconds`}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1s</span>
            <span>5s</span>
            <span>10s</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Controls;

