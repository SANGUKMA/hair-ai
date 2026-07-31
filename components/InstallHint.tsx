import React, { useEffect, useState } from 'react';

// 홈 화면 앱으로 쓰는 방법을 상황에 맞게 안내한다.
// 회원 대부분이 카카오톡 링크로 들어오는데, 카톡 내부 브라우저에서는
// "홈 화면에 추가"가 아예 불가능하다. 그게 이 컴포넌트가 있는 주된 이유다.
const DISMISS_KEY = 'hairfit-install-hint-dismissed';

type Mode = 'kakao' | 'ios' | 'android' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const InstallHint: React.FC = () => {
  const [mode, setMode] = useState<Mode>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // 이미 홈 화면 앱으로 실행 중
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* 저장소가 막혀 있으면 그냥 보여준다 */
    }

    const ua = navigator.userAgent;
    if (/KAKAOTALK/i.test(ua)) setMode('kakao');
    else if (/iPad|iPhone|iPod/.test(ua)) setMode('ios');

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setMode(m => (m === 'kakao' ? m : 'android'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* noop */
    }
  };

  // 안드로이드 카카오톡은 외부 브라우저로 넘기는 스킴을 지원한다.
  // iOS에서는 동작하지 않아 안내 문구만 남긴다.
  const openExternally = () => {
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`;
  };

  if (!mode) return null;

  const body = {
    kakao: {
      title: '홈 화면에 앱으로 추가하려면',
      text: '카카오톡 안에서는 추가할 수 없습니다. 오른쪽 아래 메뉴에서 "다른 브라우저로 열기"를 눌러주세요.',
      action: /Android/i.test(navigator.userAgent)
        ? { label: '다른 브라우저로 열기', onClick: openExternally }
        : null,
    },
    ios: {
      title: '홈 화면에 앱으로 추가하기',
      text: '아래 공유 버튼을 누르고 "홈 화면에 추가"를 선택하시면 앱처럼 쓰실 수 있습니다.',
      action: null,
    },
    android: {
      title: '홈 화면에 앱으로 추가하기',
      text: '설치하시면 주소창 없이 앱처럼 바로 실행됩니다.',
      action: installEvent ? { label: '설치', onClick: () => void installEvent.prompt() } : null,
    },
  }[mode];

  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2.5">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-tight">{body.title}</p>
          <p className="text-[11px] text-white/85 leading-snug mt-0.5">{body.text}</p>
        </div>
        {body.action && (
          <button
            onClick={body.action.onClick}
            className="shrink-0 text-[11px] font-bold bg-white text-purple-600 px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform"
          >
            {body.action.label}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="안내 닫기"
          className="shrink-0 text-white/70 hover:text-white p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
