import React from 'react';

export const AdBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg border border-yellow-200/50 mb-5">
      {/* Gold gradient background */}
      <div
        className="relative px-5 py-5"
        style={{
          background: 'linear-gradient(135deg, #f5e6c8 0%, #dfc089 25%, #c9a85c 50%, #dfc089 75%, #f5e6c8 100%)',
        }}
      >
        {/* Sparkle overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.6) 0%, transparent 40%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Product Icons */}
          <div className="flex -space-x-3 shrink-0">
            {/* O-Balance bottle */}
            <div className="w-14 h-20 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-md border border-white/60 flex flex-col items-center justify-center relative">
              <div className="w-5 h-2 bg-gray-300 rounded-t-sm -mt-1 mb-0.5" />
              <span className="text-yellow-700 font-bold text-lg leading-none">O</span>
              <span className="text-[6px] text-gray-500 font-semibold mt-0.5">BALANCE</span>
            </div>
            {/* C-Clear bottle */}
            <div className="w-14 h-20 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-md border border-white/60 flex flex-col items-center justify-center relative z-10">
              <div className="w-5 h-2 bg-gray-300 rounded-t-sm -mt-1 mb-0.5" />
              <span className="text-red-500 font-bold text-lg leading-none">C</span>
              <span className="text-[6px] text-gray-500 font-semibold mt-0.5">CLEAR</span>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-white bg-gradient-to-r from-blue-700 to-red-500 px-2 py-0.5 rounded-sm tracking-wider">
                Olivetta O&C
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-gray-800 leading-snug">
              Hair & Body ALL in ONE
            </h3>
            <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
              염색 후 손상된 모발 케어에 최적화된
              <br />
              올인원 헤어&바디 솔루션
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                셋트 100,000원
              </span>
              <span className="text-[9px] text-gray-400 line-through">150,000원</span>
            </div>
          </div>
        </div>

        {/* AD badge */}
        <div className="absolute top-2 right-2 bg-black/20 backdrop-blur-sm text-white text-[8px] font-medium px-1.5 py-0.5 rounded">
          AD
        </div>
      </div>
    </div>
  );
};
