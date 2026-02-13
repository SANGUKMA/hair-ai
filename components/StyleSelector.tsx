import React, { useState } from 'react';
import { Gender, HairStyle } from '../types';
import { hairstyles } from '../data/hairstyles';

interface StyleSelectorProps {
  onStyleSelected: (style: HairStyle) => void;
  onBack: () => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ onStyleSelected, onBack }) => {
  const [gender, setGender] = useState<Gender>('female');

  const filtered = hairstyles.filter(s => s.gender === gender);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">헤어스타일 선택</h2>
          <p className="text-xs text-gray-500">2025-2026 트렌드 스타일</p>
        </div>
      </div>

      {/* Gender Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setGender('female')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            gender === 'female'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          여성 스타일
        </button>
        <button
          onClick={() => setGender('male')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            gender === 'male'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          남성 스타일
        </button>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-4 flex-1">
        {filtered.map(style => (
          <button
            key={style.id}
            onClick={() => onStyleSelected(style)}
            className="group relative rounded-2xl overflow-hidden bg-gray-50 border-2 border-transparent hover:border-purple-400 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={style.imagePath}
                alt={style.nameKo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white font-bold text-sm leading-tight">{style.nameKo}</h3>
              <p className="text-white/75 text-[11px] mt-0.5 leading-snug">{style.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
