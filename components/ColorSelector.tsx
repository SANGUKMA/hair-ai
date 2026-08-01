import React from 'react';
import { HairColor } from '../types';
import { hairColors, colorCategories } from '../data/hairColors';
import { ColorSwatch } from './ColorSwatch';

interface ColorSelectorProps {
  selectedColor: HairColor | null;
  onColorSelected: (color: HairColor) => void;
  // 추천 카드에서 고른 컬러가 아래 그리드에도 보이도록 탭을 바깥에서 제어한다.
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  recommendedIds?: Set<string>;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  selectedColor,
  onColorSelected,
  activeCategory,
  onCategoryChange,
  recommendedIds,
}) => {
  const filtered = hairColors.filter(c => c.category === activeCategory);

  return (
    <div>
      {/* Category Tabs - horizontal scrollable */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {colorCategories.map(cat => {
          const hasPick = hairColors.some(
            c => c.category === cat.id && recommendedIds?.has(c.id)
          );
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat.label}
              {/* 추천 컬러가 숨어 있는 탭을 표시해 준다. 안 그러면 다른 탭은 열어보지 않는다. */}
              {hasPick && activeCategory !== cat.id && (
                <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-pink-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Color Swatches */}
      <div className="grid grid-cols-4 gap-2">
        {filtered.map(color => {
          const isSelected = selectedColor?.id === color.id;

          return (
            <button
              key={color.id}
              onClick={() => onColorSelected(color)}
              className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'bg-purple-50 ring-2 ring-purple-500 ring-offset-1 scale-[0.97]'
                  : 'hover:bg-gray-50 hover:scale-[1.03]'
              }`}
            >
              {recommendedIds?.has(color.id) && (
                <span className="absolute top-0.5 right-0.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
                  추천
                </span>
              )}
              <ColorSwatch color={color} isSelected={isSelected} />
              {/* Label */}
              <span
                className={`text-[10px] leading-tight text-center font-medium line-clamp-2 ${
                  isSelected ? 'text-purple-700' : 'text-gray-600'
                }`}
              >
                {color.nameKo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
