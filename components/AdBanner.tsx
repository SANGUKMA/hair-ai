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
          {/* Product photo. 세로 비율(0.596)에 맞춰 미리 잘라둔 이미지라 높이만 지정한다. */}
          <img
            src="/ad-olivetta.jpg"
            alt="올리베타 O-밸런스와 C-클리어 헤어&바디 올인원 세트"
            className="h-28 w-auto shrink-0 rounded-xl border border-white/60 shadow-md"
            loading="lazy"
          />

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
                셋트 110,000원
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
