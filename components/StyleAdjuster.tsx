import React from 'react';
import { ADJUSTMENT_LIMIT, StyleAdjustments, isAdjusted } from '../types';

interface StyleAdjusterProps {
  adjustments: StyleAdjustments;
  onChange: (next: StyleAdjustments) => void;
  // 컬 조정은 펌에만 의미가 있다.
  showCurl: boolean;
}

// -2..2를 "조금 짧게" 같은 한국어로. 0은 아무 말도 하지 않는다.
const stepLabel = (n: number, less: string, more: string): string => {
  if (!n) return '';
  return `${Math.abs(n) === 1 ? '조금' : '많이'} ${n < 0 ? less : more}`;
};

const chip =
  'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed';

interface StepperRowProps {
  label: string;
  value: number;
  minusLabel: string;
  plusLabel: string;
  state: string;
  onStep: (delta: number) => void;
}

const StepperRow: React.FC<StepperRowProps> = ({
  label,
  value,
  minusLabel,
  plusLabel,
  state,
  onStep,
}) => (
  <div className="flex items-center gap-1.5">
    <span className="w-11 shrink-0 text-[11px] font-bold text-gray-500">{label}</span>
    <button
      type="button"
      onClick={() => onStep(-1)}
      disabled={value <= -ADJUSTMENT_LIMIT}
      className={`${chip} bg-gray-100 text-gray-600 hover:bg-gray-200`}
    >
      {minusLabel}
    </button>
    <button
      type="button"
      onClick={() => onStep(1)}
      disabled={value >= ADJUSTMENT_LIMIT}
      className={`${chip} bg-gray-100 text-gray-600 hover:bg-gray-200`}
    >
      {plusLabel}
    </button>
    {state && (
      <span className="ml-auto text-[10px] font-bold text-purple-600 whitespace-nowrap">
        {state}
      </span>
    )}
  </div>
);

export const StyleAdjuster: React.FC<StyleAdjusterProps> = ({
  adjustments,
  onChange,
  showCurl,
}) => {
  const step = (key: 'length' | 'volume' | 'curl') => (delta: number) => {
    const next = Math.max(
      -ADJUSTMENT_LIMIT,
      Math.min(ADJUSTMENT_LIMIT, adjustments[key] + delta)
    );
    onChange({ ...adjustments, [key]: next });
  };

  // 켜져 있는 버튼을 다시 누르면 원래대로 돌아온다.
  const toggleFringe = (value: 'add' | 'remove') =>
    onChange({ ...adjustments, fringe: adjustments.fringe === value ? 'keep' : value });

  const fringeChip = (value: 'add' | 'remove', label: string) => (
    <button
      type="button"
      onClick={() => toggleFringe(value)}
      className={`${chip} ${
        adjustments.fringe === value
          ? 'bg-purple-600 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2.5">
      <StepperRow
        label="길이"
        value={adjustments.length}
        minusLabel="더 짧게"
        plusLabel="더 길게"
        state={stepLabel(adjustments.length, '짧게', '길게')}
        onStep={step('length')}
      />
      <StepperRow
        label="볼륨"
        value={adjustments.volume}
        minusLabel="차분하게"
        plusLabel="볼륨 더"
        state={stepLabel(adjustments.volume, '차분하게', '볼륨 있게')}
        onStep={step('volume')}
      />
      {showCurl && (
        <StepperRow
          label="컬"
          value={adjustments.curl}
          minusLabel="약하게"
          plusLabel="강하게"
          state={stepLabel(adjustments.curl, '약하게', '강하게')}
          onStep={step('curl')}
        />
      )}
      <div className="flex items-center gap-1.5">
        <span className="w-11 shrink-0 text-[11px] font-bold text-gray-500">앞머리</span>
        {fringeChip('add', '내리기')}
        {fringeChip('remove', '없이')}
      </div>

      {isAdjusted(adjustments) && (
        <button
          type="button"
          onClick={() => onChange({ length: 0, volume: 0, curl: 0, fringe: 'keep' })}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          조정 초기화
        </button>
      )}
    </div>
  );
};
