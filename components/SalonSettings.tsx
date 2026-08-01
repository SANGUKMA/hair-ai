import React, { useState } from 'react';
import { SalonInfo, FALLBACK_NAME, saveSalon } from '../utils/salon';

interface SalonSettingsProps {
  info: SalonInfo;
  onSaved: (next: SalonInfo) => void;
  onClose: () => void;
}

const FIELDS: {
  key: keyof SalonInfo;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  { key: 'name', label: '살롱 이름', placeholder: '올리베타 헤어' },
  { key: 'phone', label: '전화번호', placeholder: '02-000-0000' },
  { key: 'kakao', label: '카카오 채널', placeholder: '@olivetta' },
  {
    key: 'tagline',
    label: '한 줄 소개',
    placeholder: '회원 전용 헤어 시뮬레이션',
    hint: '리포트 맨 아래에 살롱 이름과 함께 들어갑니다',
  },
];

export const SalonSettings: React.FC<SalonSettingsProps> = ({ info, onSaved, onClose }) => {
  // 기본 문구는 빈 칸으로 보여준다. 원장님이 지우고 다시 쓰게 만들 이유가 없다.
  const [draft, setDraft] = useState<SalonInfo>({
    ...info,
    name: info.name === FALLBACK_NAME ? '' : info.name,
  });

  const handleSave = () => {
    onSaved(saveSalon(draft));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">우리 살롱 정보</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          고객님께 드리는 리포트에 들어갑니다. 이 기기에만 저장되고 서버로 보내지 않습니다.
        </p>

        <div className="space-y-3">
          {FIELDS.map(({ key, label, placeholder, hint }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={draft[key]}
                placeholder={placeholder}
                onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {hint && <p className="mt-1 text-[10px] text-gray-400">{hint}</p>}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="mt-5 w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-200 active:scale-95 transition-all"
        >
          저장하기
        </button>
      </div>
    </div>
  );
};
