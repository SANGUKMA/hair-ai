import React, { useState } from 'react';
import { AccessDeniedError, verifyAccessCode } from '../services/geminiService';
import { setAccessCode } from '../utils/accessCode';

interface AccessGateProps {
  onUnlocked: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onUnlocked }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // 어떤 형태로 넣든 HF-XXXX-XXXX 모양으로 정리한다.
  // 붙여넣기, 하이픈 없이 입력, 공백 섞임을 모두 받아준다.
  const formatCode = (raw: string) => {
    const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    return [v.slice(0, 2), v.slice(2, 6), v.slice(6, 10)].filter(Boolean).join('-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formatCode(code);
    if (!trimmed || isChecking) return;

    setIsChecking(true);
    setError(null);
    try {
      await verifyAccessCode(trimmed);
      setAccessCode(trimmed);
      onUnlocked();
    } catch (err) {
      setError(
        err instanceof AccessDeniedError
          ? err.message
          : '확인에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-3xl shadow-lg shadow-purple-200">
            ✂️
          </div>
          <h1 className="text-2xl font-bold text-gray-800">HairFit AI</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            회원 전용 서비스입니다.
            <br />
            발급받으신 회원 코드를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={e => setCode(formatCode(e.target.value))}
            placeholder="HF-0000-0000"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-white text-center text-lg font-semibold tracking-widest text-gray-800 placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
          />

          {error && (
            <p className="mt-3 text-xs text-red-600 text-center bg-red-50 border border-red-100 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!code.trim() || isChecking}
            className={`mt-4 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 ${
              code.trim() && !isChecking
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-purple-200 hover:shadow-purple-300 hover:scale-[1.02]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isChecking ? '확인 중...' : '시작하기'}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-gray-400 text-center leading-relaxed">
          코드를 받지 못하셨다면 담당 디자이너에게 문의해주세요.
        </p>
      </div>
    </div>
  );
};
