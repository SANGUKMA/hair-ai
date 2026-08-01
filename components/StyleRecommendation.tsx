import React from 'react';
import { HairStyle, RecommendResult } from '../types';

interface StyleRecommendationProps {
  result: RecommendResult | null;
  styles: HairStyle[];
  isLoading: boolean;
  selectedStyleId?: string;
  onStyleSelected: (style: HairStyle) => void;
  // 상담 답변이 이 추천을 받은 뒤에 바뀌었는지. 다시 받을지는 회원이 정한다.
  consultChanged: boolean;
  onRerecommend: () => void;
}

export const StyleRecommendation: React.FC<StyleRecommendationProps> = ({
  result,
  styles,
  isLoading,
  selectedStyleId,
  onStyleSelected,
  consultChanged,
  onRerecommend,
}) => {
  if (isLoading) {
    return (
      <div className="mb-4 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-700">얼굴형을 분석하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (!result?.recommendations.length) return null;

  // 추천에 담긴 id를 실제 스타일로 바꾼다. 서버가 이미 검증하지만 방어적으로 한 번 더 거른다.
  const picks = result.recommendations
    .map(r => ({ style: styles.find(s => s.id === r.styleId), reason: r.reason }))
    .filter((p): p is { style: HairStyle; reason: string } => Boolean(p.style));

  if (!picks.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/70 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          AI 추천
        </span>
        <p className="text-sm font-bold text-gray-800">원장이 골라본 스타일</p>
      </div>

      {(result.faceNote || result.hairNote) && (
        <div className="mb-3 space-y-1">
          {result.faceNote && (
            <p className="text-xs text-gray-600 leading-relaxed">{result.faceNote}</p>
          )}
          {result.hairNote && (
            <p className="text-xs text-gray-600 leading-relaxed">{result.hairNote}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {picks.map(({ style, reason }, index) => (
          <button
            key={style.id}
            onClick={() => onStyleSelected(style)}
            className={`group text-left focus:outline-none transition-all duration-200 ${
              selectedStyleId === style.id ? 'scale-[0.97]' : 'hover:scale-[1.03]'
            }`}
          >
            <div
              className={`relative rounded-xl overflow-hidden ${
                selectedStyleId === style.id ? 'ring-3 ring-purple-500 ring-offset-2' : ''
              }`}
            >
              <div className="aspect-[3/4] overflow-hidden bg-gray-200">
                <img
                  src={style.imagePath}
                  alt={style.nameKo}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                {index + 1}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <h4 className="text-white font-bold text-[11px] leading-tight">{style.nameKo}</h4>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-600 leading-snug line-clamp-3">{reason}</p>
          </button>
        ))}
      </div>

      {consultChanged && (
        <div className="mt-3 pt-3 border-t border-purple-100">
          <button
            type="button"
            onClick={onRerecommend}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors"
          >
            바뀐 조건으로 다시 추천받기
          </button>
          <p className="mt-1.5 text-[10px] text-gray-400 text-center">
            하루 사용 횟수가 1회 차감됩니다
          </p>
        </div>
      )}
    </div>
  );
};
