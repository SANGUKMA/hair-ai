import React from 'react';
import { HistoryEntry } from '../utils/history';

interface RecentStylesProps {
  entries: HistoryEntry[];
  onPick: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
}

const dayLabel = (savedAt: number): string => {
  const days = Math.floor((Date.now() - savedAt) / 86400000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  const d = new Date(savedAt);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

export const RecentStyles: React.FC<RecentStylesProps> = ({ entries, onPick, onRemove }) => {
  // 처음 온 회원에게는 아무것도 보이지 않는다. 빈 껍데기로 화면을 밀어내지 않는다.
  if (!entries.length) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-700 mb-2 ml-1 uppercase tracking-wider">
        최근 시뮬레이션
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {entries.map(entry => (
          <div key={entry.id} className="relative shrink-0 w-[88px]">
            <button
              type="button"
              onClick={() => onPick(entry)}
              className="w-full text-left focus:outline-none transition-transform hover:scale-[1.03]"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-200">
                <img
                  src={entry.thumbnail}
                  alt={entry.styleName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-1 text-[10px] font-semibold text-gray-700 leading-tight line-clamp-1">
                {entry.styleName}
              </p>
              <p className="text-[9px] text-gray-400 leading-tight">
                {dayLabel(entry.savedAt)}
                {entry.colorName ? ` · ${entry.colorName}` : ''}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label={`${entry.styleName} 기록 삭제`}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className="w-2.5 h-2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
