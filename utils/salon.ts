// 원장님마다 살롱이 다르므로 살롱 정보는 앱에서 직접 입력하고 그 기기에 저장한다.
// 회원 코드(utils/accessCode.ts)와 같은 방침이다 — 서버로 보내지 않고, 저장이 막힌
// 환경에서도 이번 방문 동안은 메모리 값으로 계속 쓴다.
//
// VITE_SALON_* 환경변수는 기본값으로 남겨둔다. 한 살롱 전용으로 배포하는 경우에는
// 원장님이 아무것도 입력하지 않아도 리포트에 살롱 이름이 들어간다.

export interface SalonInfo {
  name: string;
  phone: string;
  kakao: string;
  tagline: string;
}

const STORAGE_KEY = 'hairfit-salon';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const FALLBACK_NAME = 'HairFit AI';

const DEFAULTS: SalonInfo = {
  name: text(import.meta.env.VITE_SALON_NAME) || FALLBACK_NAME,
  phone: text(import.meta.env.VITE_SALON_PHONE),
  kakao: text(import.meta.env.VITE_SALON_KAKAO),
  tagline: text(import.meta.env.VITE_SALON_TAGLINE) || '회원 전용 헤어 시뮬레이션',
};

let inMemory: SalonInfo | null = null;

export const loadSalon = (): SalonInfo => {
  if (inMemory) return inMemory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<SalonInfo>;
      // 한 번 저장한 뒤로는 저장된 값이 기준이다. 전화·카카오는 비운 그대로 비워둔다.
      inMemory = {
        name: text(saved.name) || DEFAULTS.name,
        phone: text(saved.phone),
        kakao: text(saved.kakao),
        tagline: text(saved.tagline) || DEFAULTS.tagline,
      };
      return inMemory;
    }
  } catch {
    /* 저장소가 막혀 있으면 기본값으로 간다 */
  }
  return DEFAULTS;
};

export const saveSalon = (info: SalonInfo): SalonInfo => {
  const clean: SalonInfo = {
    name: text(info.name) || DEFAULTS.name,
    phone: text(info.phone),
    kakao: text(info.kakao),
    tagline: text(info.tagline) || DEFAULTS.tagline,
  };
  // 메모리를 실제 값으로 삼는다. localStorage는 다음 방문에도 남으면 좋은 보조 저장소다.
  inMemory = clean;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* 저장이 막혀 있어도 이번 방문 동안은 위 메모리 값으로 계속 쓴다 */
  }
  return clean;
};

// 아직 자기 살롱 이름을 넣지 않은 상태. 이대로 두면 리포트가 기본 문구로 나간다.
export const isSalonConfigured = (info: SalonInfo): boolean => info.name !== FALLBACK_NAME;

// 푸터 둘째 줄. 넣은 것만 가운뎃점으로 잇는다.
export const salonContactLine = (info: SalonInfo): string =>
  [info.tagline, info.phone, info.kakao].filter(Boolean).join(' · ');
