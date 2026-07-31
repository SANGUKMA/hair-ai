// 폰 사진 원본은 수 MB라 서버 요청 본문 제한에 걸린다.
// 생성 품질에 충분한 크기까지 줄여서 JPEG로 다시 인코딩한다.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.9;

export const downscaleImage = (dataUrl: string): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      if (scale === 1 && dataUrl.startsWith('data:image/jpeg')) {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    // 디코딩 실패 시엔 원본을 그대로 넘기고 서버 검증에 맡긴다.
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
