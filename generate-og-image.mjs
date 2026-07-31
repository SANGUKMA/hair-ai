// 링크 공유 미리보기(Open Graph) 이미지를 만든다.
//   node generate-og-image.mjs <before.png> <after.png>
// 결과: public/og-image.png (1200x630)
//
// 이미지 안에는 글자를 넣지 않는다. 카카오톡·페이스북 등은 og:title / og:description을
// 이미지와 별도로 보여주기 때문에 중복이고, 썸네일이 잘릴 때 글자부터 날아간다.
// 대신 이 앱의 시그니처인 Before/After 슬라이더를 그대로 화면 구성으로 쓴다.
import sharp from 'sharp';
import path from 'path';

const W = 1200;
const H = 630;
const HALF = W / 2;
const DIVIDER = 5;       // 분할선 두께
const HANDLE_R = 38;     // 슬라이더 핸들 반지름

const [before, after] = process.argv.slice(2);
if (!before || !after) {
  console.error('사용법: node generate-og-image.mjs <before 이미지> <after 이미지>');
  process.exit(1);
}

// 두 패널에 완전히 같은 크롭 박스를 쓴다. 같은 사람의 전후를 비교하는 그림이라
// 크롭이 조금만 어긋나도 얼굴 위치가 밀려서 "다른 사진 두 장"처럼 보인다.
const ZOOM = 0.82;   // 원본 높이 중 사용할 비율. 낮출수록 인물이 크게 잡힌다
const Y_BIAS = 0.03; // 위쪽으로 살짝 올려 어깨보다 얼굴에 무게를 준다

const halfPanel = async (file) => {
  const { width = 0, height = 0 } = await sharp(file).metadata();
  const cropH = Math.round(height * ZOOM);
  const cropW = Math.round(cropH * (HALF / H));
  return sharp(file)
    .extract({
      left: Math.max(0, Math.round((width - cropW) / 2)),
      top: Math.max(0, Math.round(height * Y_BIAS)),
      width: Math.min(cropW, width),
      height: Math.min(cropH, height),
    })
    .resize(HALF, H, { fit: 'cover' })
    .toBuffer();
};

const [leftPanel, rightPanel] = await Promise.all([halfPanel(before), halfPanel(after)]);

// 아래쪽 어둡게 깔기 + 분할선 + 핸들. 전부 도형이라 폰트에 의존하지 않는다.
const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9333EA"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B0910" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0B0910" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
      <stop offset="55%" stop-color="#0B0910" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0B0910" stop-opacity="0.4"/>
    </radialGradient>
    <filter id="lift" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="3" stdDeviation="8" flood-color="#0B0910" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <rect y="${H * 0.55}" width="${W}" height="${H * 0.45}" fill="url(#shade)"/>

  <!-- 분할선: 브랜드 색은 여기에만 쓴다 -->
  <rect x="${HALF - DIVIDER / 2}" width="${DIVIDER}" height="${H}" fill="url(#brand)" filter="url(#lift)"/>

  <!-- 슬라이더 핸들 -->
  <circle cx="${HALF}" cy="${H / 2}" r="${HANDLE_R}" fill="#FFFFFF" filter="url(#lift)"/>
  <path d="M ${HALF - 11} ${H / 2 - 11} L ${HALF - 22} ${H / 2} L ${HALF - 11} ${H / 2 + 11}"
        fill="none" stroke="#9333EA" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${HALF + 11} ${H / 2 - 11} L ${HALF + 22} ${H / 2} L ${HALF + 11} ${H / 2 + 11}"
        fill="none" stroke="#EC4899" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

// JPEG로 낸다. 카카오톡 등 크롤러가 큰 PNG에서 실패하는 경우가 있어 용량을 줄이는 쪽이 안전하다.
const outFile = path.join('public', 'og-image.jpg');

await sharp({ create: { width: W, height: H, channels: 3, background: '#0B0910' } })
  .composite([
    { input: leftPanel, left: 0, top: 0 },
    { input: rightPanel, left: HALF, top: 0 },
    { input: overlay, left: 0, top: 0 },
  ])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(outFile);

const { size } = await sharp(outFile).metadata().then(async m => ({ ...m, size: (await import('fs')).statSync(outFile).size }));
console.log(`생성 완료: ${outFile} (${W}x${H}, ${(size / 1024).toFixed(0)}KB)`);
