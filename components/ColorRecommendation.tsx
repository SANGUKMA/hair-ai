import React from 'react';
import { HairColor, PersonalColor, RecommendResult } from '../types';
import { ColorSwatch } from './ColorSwatch';

const SEASON_LABEL: Record<PersonalColor, string> = {
  'spring-warm': '봄 웜톤',
  'summer-cool': '여름 쿨톤',
  'autumn-warm': '가을 웜톤',
  'winter-cool': '겨울 쿨톤',
};

// 배지 색은 장식이 아니라 진단 결과 자체다. 계절의 인상을 그대로 쓴다.
const SEASON_BADGE: Record<PersonalColor, string> = {
  'spring-warm': 'from-orange-400 to-amber-300',
  'summer-cool': 'from-sky-400 to-rose-300',
  'autumn-warm': 'from-amber-600 to-orange-700',
  'winter-cool': 'from-blue-600 to-fuchsia-600',
};

interface ColorRecommendationProps {
  result: RecommendResult | null;
  colors: HairColor[];
  isLoading: boolean;
  selectedColorId?: string;
  onColorSelected: (color: HairColor) => void;
}

export const ColorRecommendation: React.FC<ColorRecommendationProps> = ({
  result,
  colors,
  isLoading,
  selectedColorId,
  onColorSelected,
}) => {
  if (isLoading) {
    return (
      <div className="mb-4 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-700">피부톤을 분석하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (!result?.colorRecommendations?.length) return null;

  // 서버가 이미 검증하지만 방어적으로 한 번 더 거른다.
  const picks = result.colorRecommendations
    .map(r => ({ color: colors.find(c => c.id === r.colorId), reason: r.reason }))
    .filter((p): p is { color: HairColor; reason: string } => Boolean(p.color));

  if (!picks.length) return null;

  const season = result.personalColor;

  return (
    <div className="mb-4 rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/70 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {season && (
          <span
            className={`inline-flex items-center bg-gradient-to-r ${SEASON_BADGE[season]} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}
          >
            {SEASON_LABEL[season]}
          </span>
        )}
        <p className="text-sm font-bold text-gray-800">퍼스널 컬러 진단</p>
      </div>

      {result.colorNote && (
        <p className="text-xs text-gray-600 leading-relaxed mb-3">{result.colorNote}</p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {picks.map(({ color, reason }, index) => {
          const isSelected = selectedColorId === color.id;
          return (
            <button
              key={color.id}
              onClick={() => onColorSelected(color)}
              className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl text-center transition-all duration-200 ${
                isSelected
                  ? 'bg-purple-50 ring-2 ring-purple-500 ring-offset-1 scale-[0.97]'
                  : 'hover:bg-gray-50 hover:scale-[1.03]'
              }`}
            >
              <div className="relative">
                <ColorSwatch color={color} isSelected={isSelected} size="w-12 h-12" />
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                  {index + 1}
                </div>
              </div>
              <span
                className={`text-[10px] leading-tight font-semibold line-clamp-2 ${
                  isSelected ? 'text-purple-700' : 'text-gray-700'
                }`}
              >
                {color.nameKo}
              </span>
              <p className="text-[10px] text-gray-500 leading-snug line-clamp-3">{reason}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-gray-400 leading-snug">
        사진 조명에 따라 진단이 달라질 수 있어요. 실제 시술 전에는 원장님과 상담해주세요.
      </p>
    </div>
  );
};
