// 회원 코드는 브라우저에 저장해 두고 매 요청에 함께 보낸다.
// 이건 편의 장치일 뿐이고 실제 차단은 서버(api/generate.ts)에서 한다.
const STORAGE_KEY = 'hairfit-access-code';

// 카카오톡 인앱 브라우저나 시크릿 모드에서는 localStorage가 막혀 있을 수 있다.
// 그 경우에도 이번 방문 동안은 코드를 기억해야 한다. 메모리를 실제 값으로 삼고
// localStorage는 "다음 방문에도 유지되면 좋은" 보조 저장소로만 쓴다.
let inMemoryCode = '';

const readStorage = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const getAccessCode = (): string => {
  if (!inMemoryCode) inMemoryCode = readStorage();
  return inMemoryCode;
};

export const setAccessCode = (code: string) => {
  inMemoryCode = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* 저장이 막혀 있어도 이번 방문은 메모리 값으로 계속 쓴다 */
  }
};

export const clearAccessCode = () => {
  inMemoryCode = '';
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};
