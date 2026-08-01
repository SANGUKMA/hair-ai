import React from 'react';
import { HairColor } from '../types';

interface ColorSwatchProps {
  color: HairColor;
  isSelected: boolean;
  size?: string;
}

// '염색 안함'은 특정 색이 없으니 원형 그라데이션으로, 이너·페이스라인 컬러는
// 두 색을 반씩 나눠 칠해 실제 시술 모양에 가깝게 보여준다.
const background = (color: HairColor): React.CSSProperties => {
  if (color.id === 'natural') {
    return { background: 'conic-gradient(#999, #666, #333, #666, #999)' };
  }
  if (color.colorHexSecond) {
    return {
      background: `linear-gradient(135deg, ${color.colorHex} 50%, ${color.colorHexSecond} 50%)`,
    };
  }
  return { backgroundColor: color.colorHex };
};

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  isSelected,
  size = 'w-10 h-10',
}) => (
  <div className="relative">
    <div
      className={`${size} rounded-full shadow-md border-2 transition-all ${
        isSelected ? 'border-purple-500' : 'border-white'
      }`}
      style={background(color)}
    />
    {isSelected && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="#7c3aed"
            className="w-3 h-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      </div>
    )}
  </div>
);
