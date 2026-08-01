// 폰 사진 원본은 수 MB라 서버 요청 본문 제한에 걸린다.
// 생성 품질에 충분한 크기까지 줄여서 JPEG로 다시 인코딩한다.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.9;

// 분석·생성·리포트가 모두 같은 밝기에서 출발하도록, 업로드든 촬영이든 한 번 거쳐 가는
// 기준 사진을 만든다.
//
// 밝기만 건드린다. 화이트밸런스를 자동으로 맞추면 퍼스널 컬러가 읽는 피부 언더톤이
// 중화되어 계절 판정이 통째로 틀어진다. 그래서 R·G·B에 '같은' 배율만 곱해
// 채널 사이의 비율을 그대로 둔다 — 밝기는 변해도 웜/쿨은 변하지 않는다.
const TARGET_FACE_LUMA = 140;
// 이 범위 안이면 손대지 않는다. 멀쩡한 사진을 굳이 다시 인코딩할 이유가 없다.
const OK_LOW = 105;
const OK_HIGH = 185;
const MIN_GAIN = 0.75;
const MAX_GAIN = 1.7;

export const normalizePhoto = (dataUrl: string): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);

      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = frame;

      // 가이드 타원 안쪽에 해당하는 가운데 절반을 얼굴로 본다(촬영 화면의 조명 판독과 같은 기준).
      const x0 = Math.floor(canvas.width / 4);
      const x1 = Math.floor((canvas.width * 3) / 4);
      const y0 = Math.floor(canvas.height / 4);
      const y1 = Math.floor((canvas.height * 3) / 4);
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * canvas.width + x) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          count += 1;
        }
      }
      const face = count ? sum / count : TARGET_FACE_LUMA;

      if (face >= OK_LOW && face <= OK_HIGH) {
        resolve(dataUrl);
        return;
      }

      const gain = Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_FACE_LUMA / face));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * gain);
        data[i + 1] = Math.min(255, data[i + 1] * gain);
        data[i + 2] = Math.min(255, data[i + 2] * gain);
      }
      ctx.putImageData(frame, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    // 디코딩에 실패하면 원본 그대로 넘긴다. 보정은 부가 기능이다.
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

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
