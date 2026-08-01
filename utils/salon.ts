// 살롱 정보는 배포마다 다르다. 이름·전화번호·카카오 채널은 공개해도 되는 정보이고
// 애초에 리포트에 찍혀 공유되는 것이 목적이라, 서버 전용 환경변수와 달리 빌드 시점에
// 클라이언트로 내려보내는 VITE_ 변수로 받는다. 비워두면 기본 문구로 나간다.
export interface SalonInfo {
  name: string;
  phone: string;
  kakao: string;
  tagline: string;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const salon: SalonInfo = {
  name: text(import.meta.env.VITE_SALON_NAME) || 'HairFit AI',
  phone: text(import.meta.env.VITE_SALON_PHONE),
  kakao: text(import.meta.env.VITE_SALON_KAKAO),
  tagline: text(import.meta.env.VITE_SALON_TAGLINE) || '회원 전용 헤어 시뮬레이션',
};

// 푸터 둘째 줄. 넣은 것만 가운뎃점으로 잇는다.
export const salonContactLine = (info: SalonInfo = salon): string =>
  [info.tagline, info.phone, info.kakao].filter(Boolean).join(' · ');
