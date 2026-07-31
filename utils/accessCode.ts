// 회원 코드는 브라우저에 저장해 두고 매 요청에 함께 보낸다.
// 이건 편의 장치일 뿐이고 실제 차단은 서버(api/generate.ts)에서 한다.
const STORAGE_KEY = 'hairfit-access-code';

export const getAccessCode = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    // 시크릿 모드 등에서 localStorage가 막혀 있으면 세션 동안만 쓴다.
    return '';
  }
};

export const setAccessCode = (code: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* 저장이 안 돼도 이번 세션은 그대로 진행한다 */
  }
};

export const clearAccessCode = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};
