import React, { useState } from 'react';
import { HairColor } from '../types';
import { hairColors, colorCategories } from '../data/hairColors';

interface ColorSelectorProps {
  selectedColor: HairColor | null;
  onColorSelected: (color: HairColor) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  selectedColor,
  onColorSelected
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('natural');

  const filtered = hairColors.filter(c => c.category === activeCategory);

  return (
    <div>
      {/* Category Tabs - horizontal scrollable */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {colorCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Color Swatches */}
      <div className="grid grid-cols-4 gap-2">
        {filtered.map(color => {
          const isSelected = selectedColor?.id === color.id;
          const isKeepOriginal = color.id === 'natural';
          const hasGradient = !!color.colorHexSecond;

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
              {/* Color circle */}
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full shadow-md border-2 transition-all ${
                    isSelected ? 'border-purple-500' : 'border-white'
                  }`}
                  style={
                    isKeepOriginal
                      ? {
                          background: 'conic-gradient(#999, #666, #333, #666, #999)',
                        }
                      : hasGradient
                      ? {
                          background: `linear-gradient(135deg, ${color.colorHex} 50%, ${color.colorHexSecond} 50%)`,
                        }
                      : { backgroundColor: color.colorHex }
                  }
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="#7c3aed" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              {/* Label */}
              <span className={`text-[10px] leading-tight text-center font-medium line-clamp-2 ${
                isSelected ? 'text-purple-700' : 'text-gray-600'
              }`}>
                {color.nameKo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
