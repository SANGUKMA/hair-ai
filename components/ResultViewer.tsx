import React, { useState, useRef, useCallback } from 'react';

interface ResultViewerProps {
  originalImage: string;
  generatedImage: string;
  stylistComment?: string;
  onSave: () => void;
  onReset: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({
  originalImage,
  generatedImage,
  stylistComment,
  onSave,
  onReset
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSlider(e.clientX);
  }, [updateSlider]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateSlider(e.clientX);
  }, [updateSlider]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto">
      {/* Image comparison container with fixed aspect ratio */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-gray-100 rounded-2xl shadow-xl border border-gray-200 cursor-ew-resize select-none touch-none"
        style={{ aspectRatio: '3 / 4' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background (Generated Image - After) */}
        <img
          src={generatedImage}
          alt="New Hairstyle"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        <div className="absolute top-4 right-4 bg-purple-600/80 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          After
        </div>

        {/* Foreground (Original Image - Before) - uses clip-path for clean clipping */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={originalImage}
            alt="Original"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full z-10">
            Before
          </div>
        </div>

        {/* Slider Handle Visual */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] pointer-events-none z-10 flex items-center justify-center"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 -ml-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </div>

      {stylistComment && (
        <div className="mt-5 mx-1 bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              ✂
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">원장 스타일링 코멘트</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{stylistComment}</p>
        </div>
      )}

      <div className="mt-6 flex gap-4 px-2 mb-8">
        <button
          onClick={onReset}
          className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onSave}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all active:scale-95"
        >
          Save & Share
        </button>
      </div>
    </div>
  );
};