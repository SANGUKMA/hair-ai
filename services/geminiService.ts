import type { FaceShape, Gender, RecommendResult } from '../types';

export interface GenerateResult {
  image: string;
  comment: string;
}

const postJson = async (payload: unknown) => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || `Request failed (${response.status})`);
  }

  return response.json();
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
