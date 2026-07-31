// 홈 화면 앱(PWA) 아이콘을 만든다.
//   node generate-icons.mjs
// 결과: public/icons/*
//
// 마크는 링크 미리보기 이미지에 쓴 것과 같은 Before/After 슬라이더 핸들이다.
// 가위는 미용 앱 아이콘의 뻔한 정답이라 어느 앱인지 구분이 안 된다.
// 이 앱이 실제로 하는 일(좌우 비교)을 그대로 마크로 쓰면 미리보기와도 짝이 맞는다.
import sharp from 'sharp';
import { mkdir } from 'fs/promises';

const OUT = 'public/icons';

// pad: 마스크 아이콘용 여백 비율. 안드로이드가 원형 등으로 잘라내도 마크가 살아남게 한다.
const mark = (size, pad = 0) => {
  const s = size;
  const c = s / 2;
  const scale = (1 - pad * 2) * (s / 512);
  const r = 118 * scale;          // 핸들 반지름
  const bar = 16 * scale;        // 분할선 두께
  const arm = 38 * scale;        // 갈매기 팔 길이
  const gap = 30 * scale;        // 중심에서 갈매기까지
  const sw = 26 * scale;         // 갈매기 선 두께

  return Buffer.from(`
<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#g)"/>
  <rect x="${c - bar / 2}" y="0" width="${bar}" height="${s}" fill="#FFFFFF" opacity="0.92"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="#FFFFFF"/>
  <path d="M ${c - gap} ${c - arm} L ${c - gap - arm} ${c} L ${c - gap} ${c + arm}"
        fill="none" stroke="#7C3AED" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${c + gap} ${c - arm} L ${c + gap + arm} ${c} L ${c + gap} ${c + arm}"
        fill="none" stroke="#EC4899" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);
};

await mkdir(OUT, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  // 마스크 아이콘은 바깥 20%가 잘려나갈 수 있어 마크를 안쪽으로 넣는다.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  { file: 'favicon-32.png', size: 32, pad: 0 },
];

for (const { file, size, pad } of targets) {
  await sharp(mark(size, pad)).png().toFile(`${OUT}/${file}`);
  console.log(`  ${file}  ${size}x${size}`);
}
console.log('아이콘 생성 완료');
