import type { FaceShape, Gender, RecommendResult } from '../types';
import { clearAccessCode, getAccessCode } from '../utils/accessCode';

export interface GenerateResult {
  image: string;
  comment: string;
}

// 코드가 거부되면 저장된 값을 지워 다시 입력받도록 한다.
export class AccessDeniedError extends Error {}

const postJson = async (payload: Record<string, unknown>) => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, accessCode: getAccessCode() }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = detail?.error || `Request failed (${response.status})`;
    if (response.status === 401) {
      clearAccessCode();
      throw new AccessDeniedError(message);
    }
    throw new Error(message);
  }

  return response.json();
};

// 코드를 저장하기 전에 서버에 확인만 요청한다. 생성도 일으키지 않고 일일 한도도 쓰지 않는다.
export const verifyAccessCode = async (code: string): Promise<void> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', accessCode: code }),
  });

  if (response.ok) return;

  const detail = await response.json().catch(() => null);
  const message = detail?.error || `확인에 실패했습니다 (${response.status})`;
  if (response.status === 401) throw new AccessDeniedError(message);
  throw new Error(message);
};

// 사진을 올리면 먼저 얼굴을 분석해 어울리는 스타일 세 가지를 추천받는다.
export const recommendStyles = (userImage: string, gender: Gender): Promise<RecommendResult> =>
  postJson({ action: 'recommend', userImage, gender });

// API 키를 브라우저에 노출하지 않기 위해 /api/generate 서버리스 함수를 경유한다.
// 프롬프트 구성과 스타일 이미지 로딩은 모두 서버(api/generate.ts)에서 처리한다.
export const generateHairstyle = (
  userImage: string,
  styleId: string,
  colorId?: string,
  faceShape?: FaceShape | null
): Promise<GenerateResult> =>
  postJson({ action: 'generate', userImage, styleId, colorId, faceShape });
