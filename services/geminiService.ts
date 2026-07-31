export interface GenerateResult {
  image: string;
  comment: string;
}

// API 키를 브라우저에 노출하지 않기 위해 /api/generate 서버리스 함수를 경유한다.
// 프롬프트 구성과 스타일 이미지 로딩은 모두 서버(api/generate.ts)에서 처리한다.
export const generateHairstyle = async (
  userImage: string,
  styleId: string,
  colorId?: string
): Promise<GenerateResult> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userImage, styleId, colorId }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || `Generation request failed (${response.status})`);
  }

  return response.json();
};
