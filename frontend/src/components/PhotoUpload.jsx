/**
 * PhotoUpload Component
 * Simple photo upload for demo and testing
 */

import { useState, useRef } from 'react';

function PhotoUpload({ onImageSelect, isAnalyzing }) {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Pass file to parent
    onImageSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setPreview(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative aspect-[4/3] w-full">
      {preview ? (
        // Image preview
        <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={preview}
            alt="Uploaded preview"
            className="w-full h-full object-cover"
          />
          {!isAnalyzing && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Clear image"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        // Upload prompt
        <button
          onClick={handleClick}
          className="w-full h-full bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-3 p-6"
          aria-label="Upload photo"
        >
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-center">
            <p className="text-gray-700 font-medium">Click to upload photo</p>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG, WEBP up to 10MB</p>
          </div>
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

export default PhotoUpload;
