import React from 'react';
import { ConsultAnswers } from '../types';

interface ConsultQuestionsProps {
  answers: ConsultAnswers;
  onChange: (next: ConsultAnswers) => void;
}

// 각 질문의 선택지. 'any'는 항상 마지막에 두고 기본값으로 쓴다.
const QUESTIONS: {
  key: keyof ConsultAnswers;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'stylingTime',
    label: '아침 손질',
    options: [
      { value: 'quick', label: '5분 이내' },
      { value: 'some', label: '10분 정도' },
      { value: 'any', label: '상관없어요' },
    ],
  },
  {
    key: 'lengthPlan',
    label: '길이',
    options: [
      { value: 'growing', label: '기르는 중' },
      { value: 'shorter', label: '짧아도 좋아요' },
      { value: 'any', label: '상관없어요' },
    ],
  },
  {
    key: 'formality',
    label: '분위기',
    options: [
      { value: 'tidy', label: '단정하게' },
      { value: 'free', label: '자유롭게' },
      { value: 'any', label: '상관없어요' },
    ],
  },
];

export const ConsultQuestions: React.FC<ConsultQuestionsProps> = ({ answers, onChange }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-baseline gap-2 mb-3">
      <p className="text-sm font-bold text-gray-800">고객님께 여쭤보세요</p>
      <p className="text-[10px] text-gray-400">선택 · 입력하시면 추천이 정확해져요</p>
    </div>

    <div className="space-y-2.5">
      {QUESTIONS.map(({ key, label, options }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className="w-14 shrink-0 text-[11px] font-bold text-gray-500">{label}</span>
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...answers, [key]: option.value })}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                answers[key] === option.value
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  </div>
);
