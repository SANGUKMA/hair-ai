import type {
  ConsultAnswers,
  HairColor,
  HairStyle,
  RecommendResult,
} from '../types';
import {
  CROWN_VOLUME_LABEL,
  FACE_SHAPE_LABEL,
  FORMALITY_LABEL,
  HAIR_DENSITY_LABEL,
  HAIR_TEXTURE_LABEL,
  HAIR_THICKNESS_LABEL,
  LENGTH_PLAN_LABEL,
  PERSONAL_COLOR_LABEL,
  STYLE_UPKEEP_LABEL,
  STYLING_TIME_LABEL,
} from '../data/labels';
import { SalonInfo, salonContactLine } from './salon';

export interface ReportData {
  originalImage: string;
  resultImage: string;
  recommendation: RecommendResult | null;
  styles: HairStyle[];
  colors: HairColor[];
  selectedStyle: HairStyle;
  selectedColor: HairColor | null;
  stylistComment: string;
  consult: ConsultAnswers;
  identityWarning: boolean;
  // 원장님마다 다르므로 값으로 받는다. 리포트를 그리는 쪽이 저장소를 알 필요는 없다.
  salon: SalonInfo;
}

const W = 1080;
const PAD = 56;
const CONTENT = W - PAD * 2;
// 넉넉히 그린 뒤 실제로 쓴 높이만 잘라낸다. 캔버스는 그리기 전에 크기가 정해져야 하는데,
// 한국어 줄바꿈 결과에 따라 최종 높이가 달라지기 때문이다.
const SCRATCH_HEIGHT = 3200;

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_STACK}`;

const INK = '#1f2937';
const MUTED = '#6b7280';
const FAINT = '#9ca3af';
const PURPLE = '#7c3aed';
const CARD = '#ffffff';
const LINE = '#e5e7eb';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
    img.src = src;
  });

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const fillRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string
) => {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

// 어절 단위로 끊고, 한 어절이 통째로 넘치면 글자 단위로 쪼갠다.
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  let line = '';
  const push = () => {
    if (line) {
      lines.push(line);
      line = '';
    }
  };

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    push();
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    for (const ch of word) {
      if (line && ctx.measureText(line + ch).width > maxWidth) push();
      line += ch;
    }
  }
  push();
  return lines;
};

// 좁은 칸에 들어가는 이유 문구는 줄 수를 막아 카드가 한없이 길어지지 않게 한다.
const clampLines = (lines: string[], max: number): string[] => {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = kept[max - 1].replace(/.$/, '…');
  return kept;
};

const drawWrapped = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  for (const line of wrapText(ctx, text, maxWidth)) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
};

// object-cover와 같은 방식으로, 비율을 유지한 채 상자를 채우고 넘치는 부분은 잘라낸다.
const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) => {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
};

const drawPill = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  ink: string
): number => {
  ctx.font = font(700, 22);
  const w = ctx.measureText(text).width + 32;
  fillRoundRect(ctx, x, y, w, 40, 20, fill);
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 16, y + 21);
  ctx.textBaseline = 'alphabetic';
  return x + w + 10;
};

const colorFill = (ctx: CanvasRenderingContext2D, color: HairColor, x: number, y: number, d: number) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.clip();
  if (color.colorHexSecond) {
    ctx.fillStyle = color.colorHex;
    ctx.fillRect(x, y, d, d);
    ctx.fillStyle = color.colorHexSecond;
    ctx.beginPath();
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d, y + d);
    ctx.lineTo(x, y + d);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = color.colorHex;
    ctx.fillRect(x, y, d, d);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
};

const hairSummary = (r: RecommendResult): string =>
  [
    r.hairThickness && HAIR_THICKNESS_LABEL[r.hairThickness],
    r.hairDensity && HAIR_DENSITY_LABEL[r.hairDensity],
    r.hairTexture && HAIR_TEXTURE_LABEL[r.hairTexture],
    r.crownVolume && CROWN_VOLUME_LABEL[r.crownVolume],
  ]
    .filter(Boolean)
    .join(' · ');

const consultSummary = (c: ConsultAnswers): string[] =>
  [
    c.stylingTime !== 'any' && STYLING_TIME_LABEL[c.stylingTime],
    c.lengthPlan !== 'any' && LENGTH_PLAN_LABEL[c.lengthPlan],
    c.formality !== 'any' && FORMALITY_LABEL[c.formality],
  ].filter((v): v is string => Boolean(v));

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
};

// 모바일에서는 공유 시트가 낫다. 카카오톡으로 바로 보내거나 사진첩에 저장할 수 있고,
// iOS의 홈 화면 앱에서는 앵커 다운로드가 잘 동작하지 않는다. 지원하지 않으면 내려받기로 떨어진다.
export const deliverImage = async (dataUrl: string, filename: string): Promise<void> => {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (err) {
    // 공유 시트를 사용자가 닫은 것은 실패가 아니다.
    if (err instanceof DOMException && err.name === 'AbortError') return;
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const renderReport = async (data: ReportData): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = SCRATCH_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('리포트를 그릴 수 없습니다.');

  const [before, after] = await Promise.all([
    loadImage(data.originalImage),
    loadImage(data.resultImage),
  ]);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, SCRATCH_HEIGHT);
  ctx.textBaseline = 'alphabetic';

  let y = PAD;

  // ── 헤더 ──────────────────────────────────────────────────────────
  ctx.fillStyle = PURPLE;
  ctx.font = font(800, 40);
  ctx.fillText(data.salon.name, PAD, y + 36, CONTENT - 200);
  ctx.fillStyle = FAINT;
  ctx.font = font(600, 24);
  const dateText = today();
  ctx.fillText(dateText, W - PAD - ctx.measureText(dateText).width, y + 34);
  y += 52;
  ctx.fillStyle = INK;
  ctx.font = font(700, 30);
  ctx.fillText('헤어 컨설팅 리포트', PAD, y + 26);
  y += 68;

  // ── Before / After ────────────────────────────────────────────────
  const half = (CONTENT - 32) / 2;
  const photoH = Math.round(half * 1.25);
  drawCover(ctx, before, PAD, y, half, photoH, 24);
  drawCover(ctx, after, PAD + half + 32, y, half, photoH, 24);

  ctx.font = font(700, 22);
  drawPill(ctx, 'Before', PAD + 16, y + 16, 'rgba(0,0,0,0.55)', '#ffffff');
  drawPill(ctx, 'After', PAD + half + 48, y + 16, 'rgba(124,58,237,0.85)', '#ffffff');
  y += photoH + 28;

  // ── 동일인 경고 (있을 때만) ────────────────────────────────────────
  if (data.identityWarning) {
    const boxH = 92;
    fillRoundRect(ctx, PAD, y, CONTENT, boxH, 20, '#fffbeb', '#fde68a');
    ctx.fillStyle = '#92400e';
    ctx.font = font(700, 24);
    ctx.fillText('얼굴이 원본과 다르게 나왔을 수 있습니다', PAD + 24, y + 38);
    ctx.fillStyle = '#b45309';
    ctx.font = font(500, 21);
    ctx.fillText('정면이 잘 보이는 밝은 사진으로 다시 시도해보세요.', PAD + 24, y + 70);
    y += boxH + 24;
  }

  // ── 진단 결과 ──────────────────────────────────────────────────────
  const rec = data.recommendation;
  if (rec) {
    const rows: { label: string; value: string; note: string }[] = [];
    if (rec.faceShape) {
      rows.push({ label: '얼굴형', value: FACE_SHAPE_LABEL[rec.faceShape], note: rec.faceNote });
    }
    const hair = hairSummary(rec);
    if (hair) rows.push({ label: '모발', value: hair, note: rec.hairNote });
    if (rec.personalColor) {
      rows.push({
        label: '퍼스널 컬러',
        value: PERSONAL_COLOR_LABEL[rec.personalColor],
        note: rec.colorNote,
      });
    }

    if (rows.length) {
      // 카드 높이를 먼저 재고 나서 배경을 깔아야 텍스트가 카드 밖으로 나가지 않는다.
      ctx.font = font(500, 22);
      let bodyH = 0;
      for (const row of rows) {
        bodyH += 34;
        if (row.note) bodyH += wrapText(ctx, row.note, CONTENT - 48).length * 30;
        bodyH += 18;
      }
      const cardH = 66 + bodyH;
      fillRoundRect(ctx, PAD, y, CONTENT, cardH, 24, CARD, LINE);

      let ry = y + 46;
      ctx.fillStyle = INK;
      ctx.font = font(700, 26);
      ctx.fillText('진단 결과', PAD + 24, ry);
      ry += 34;

      for (const row of rows) {
        ctx.fillStyle = PURPLE;
        ctx.font = font(700, 23);
        const labelW = ctx.measureText(row.label).width;
        ctx.fillText(row.label, PAD + 24, ry);
        ctx.fillStyle = INK;
        ctx.font = font(700, 23);
        ctx.fillText(row.value, PAD + 24 + labelW + 16, ry);
        ry += 34;
        if (row.note) {
          ctx.fillStyle = MUTED;
          ctx.font = font(500, 22);
          ry = drawWrapped(ctx, row.note, PAD + 24, ry, CONTENT - 48, 30);
        }
        ry += 18;
      }
      y += cardH + 24;
    }
  }

  // ── 선택한 스타일 + 원장 코멘트 ────────────────────────────────────
  {
    ctx.font = font(500, 23);
    const commentLines = data.stylistComment
      ? wrapText(ctx, data.stylistComment, CONTENT - 48)
      : [];
    const cardH = 66 + 44 + (commentLines.length ? commentLines.length * 32 + 16 : 0);
    fillRoundRect(ctx, PAD, y, CONTENT, cardH, 24, CARD, LINE);

    let ry = y + 46;
    ctx.fillStyle = INK;
    ctx.font = font(700, 26);
    ctx.fillText('오늘 선택하신 스타일', PAD + 24, ry);
    ry += 40;

    let px = PAD + 24;
    px = drawPill(ctx, data.selectedStyle.nameKo, px, ry - 26, '#ede9fe', PURPLE);
    if (data.selectedColor && data.selectedColor.id !== 'natural') {
      px = drawPill(ctx, data.selectedColor.nameKo, px, ry - 26, '#fce7f3', '#be185d');
    }
    drawPill(ctx, STYLE_UPKEEP_LABEL[data.selectedStyle.upkeep], px, ry - 26, '#f3f4f6', MUTED);
    ry += 26;

    if (commentLines.length) {
      ry += 16;
      ctx.fillStyle = MUTED;
      ctx.font = font(500, 23);
      for (const line of commentLines) {
        ctx.fillText(line, PAD + 24, ry);
        ry += 32;
      }
    }
    y += cardH + 24;
  }

  // ── 추천 컬러 ──────────────────────────────────────────────────────
  const colorPicks = (rec?.colorRecommendations || [])
    .map(r => ({ color: data.colors.find(c => c.id === r.colorId), reason: r.reason }))
    .filter((p): p is { color: HairColor; reason: string } => Boolean(p.color));

  if (colorPicks.length) {
    const slot = (CONTENT - 48) / colorPicks.length;
    const textW = slot - 16;

    // 이유가 가장 긴 칸에 맞춰 카드 높이를 잡는다.
    ctx.font = font(500, 19);
    const reasonLines = colorPicks.map(p => clampLines(wrapText(ctx, p.reason, textW), 3));
    const reasonH = Math.max(...reasonLines.map(l => l.length)) * 26;
    const cardH = 66 + 68 + 34 + reasonH + 24;

    fillRoundRect(ctx, PAD, y, CONTENT, cardH, 24, CARD, LINE);
    ctx.fillStyle = INK;
    ctx.font = font(700, 26);
    ctx.fillText('어울리는 염색 컬러', PAD + 24, y + 46);

    colorPicks.forEach(({ color }, i) => {
      const cx = PAD + 24 + slot * i;
      colorFill(ctx, color, cx + slot / 2 - 34, y + 66, 68);
      ctx.fillStyle = INK;
      ctx.font = font(700, 21);
      const lw = Math.min(ctx.measureText(color.nameKo).width, textW);
      ctx.fillText(color.nameKo, cx + slot / 2 - lw / 2, y + 160, textW);

      ctx.fillStyle = MUTED;
      ctx.font = font(500, 19);
      let ry = y + 190;
      for (const line of reasonLines[i]) {
        const w = Math.min(ctx.measureText(line).width, textW);
        ctx.fillText(line, cx + slot / 2 - w / 2, ry, textW);
        ry += 26;
      }
    });
    y += cardH + 24;
  }

  // ── 함께 추천드린 스타일 ───────────────────────────────────────────
  const stylePicks = (rec?.recommendations || [])
    .map(r => ({ style: data.styles.find(s => s.id === r.styleId), reason: r.reason }))
    .filter((p): p is { style: HairStyle; reason: string } => Boolean(p.style));

  if (stylePicks.length) {
    const thumbs = await Promise.all(
      stylePicks.map(p => loadImage(p.style.imagePath).catch(() => null))
    );
    const slot = (CONTENT - 48 - 24 * (stylePicks.length - 1)) / stylePicks.length;
    const thumbH = Math.round(slot * 1.2);

    ctx.font = font(500, 19);
    const reasonLines = stylePicks.map(p => clampLines(wrapText(ctx, p.reason, slot), 3));
    const reasonH = Math.max(...reasonLines.map(l => l.length)) * 26;
    const cardH = 66 + thumbH + 34 + 28 + reasonH + 20;

    fillRoundRect(ctx, PAD, y, CONTENT, cardH, 24, CARD, LINE);
    ctx.fillStyle = INK;
    ctx.font = font(700, 26);
    ctx.fillText('함께 추천드린 스타일', PAD + 24, y + 46);

    stylePicks.forEach(({ style }, i) => {
      const cx = PAD + 24 + (slot + 24) * i;
      const thumb = thumbs[i];
      if (thumb) drawCover(ctx, thumb, cx, y + 66, slot, thumbH, 16);
      else fillRoundRect(ctx, cx, y + 66, slot, thumbH, 16, '#f3f4f6');

      let ry = y + 66 + thumbH + 32;
      ctx.fillStyle = INK;
      ctx.font = font(700, 21);
      const lw = Math.min(ctx.measureText(style.nameKo).width, slot);
      ctx.fillText(style.nameKo, cx + slot / 2 - lw / 2, ry, slot);

      ry += 28;
      ctx.fillStyle = PURPLE;
      ctx.font = font(700, 18);
      const upkeep = STYLE_UPKEEP_LABEL[style.upkeep];
      const uw = Math.min(ctx.measureText(upkeep).width, slot);
      ctx.fillText(upkeep, cx + slot / 2 - uw / 2, ry, slot);

      ry += 26;
      ctx.fillStyle = MUTED;
      ctx.font = font(500, 19);
      for (const line of reasonLines[i]) {
        const w = Math.min(ctx.measureText(line).width, slot);
        ctx.fillText(line, cx + slot / 2 - w / 2, ry, slot);
        ry += 26;
      }
    });
    y += cardH + 24;
  }

  // ── 원장 관리 조언 ─────────────────────────────────────────────────
  {
    const advice = [
      { label: '모발 관리', body: rec?.hairCare || '' },
      { label: '퍼스널 컬러 활용', body: rec?.colorStyling || '' },
    ].filter(a => a.body);

    if (advice.length) {
      ctx.font = font(500, 23);
      const blocks = advice.map(a => ({ ...a, lines: wrapText(ctx, a.body, CONTENT - 48) }));
      const bodyH = blocks.reduce((sum, b) => sum + 34 + b.lines.length * 32 + 18, 0);
      const cardH = 66 + bodyH;

      fillRoundRect(ctx, PAD, y, CONTENT, cardH, 24, CARD, LINE);
      ctx.fillStyle = INK;
      ctx.font = font(700, 26);
      ctx.fillText('원장님 관리 조언', PAD + 24, y + 46);

      let ry = y + 80;
      for (const block of blocks) {
        ctx.fillStyle = PURPLE;
        ctx.font = font(700, 23);
        ctx.fillText(block.label, PAD + 24, ry);
        ry += 34;
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 23);
        for (const line of block.lines) {
          ctx.fillText(line, PAD + 24, ry);
          ry += 32;
        }
        ry += 18;
      }
      y += cardH + 24;
    }
  }

  // ── 상담 조건 (답한 것이 있을 때만) ────────────────────────────────
  const conditions = consultSummary(data.consult);
  if (conditions.length) {
    const cardH = 108;
    fillRoundRect(ctx, PAD, y, CONTENT, cardH, 24, CARD, LINE);
    ctx.fillStyle = INK;
    ctx.font = font(700, 26);
    ctx.fillText('말씀해주신 조건', PAD + 24, y + 44);
    let px = PAD + 24;
    for (const text of conditions) px = drawPill(ctx, text, px, y + 58, '#f3f4f6', MUTED);
    y += cardH + 24;
  }

  // ── 단서 ──────────────────────────────────────────────────────────
  // 화면이 달고 있는 단서를 리포트가 빠뜨리면, 추정이 확정 진단서로 승격된다.
  {
    ctx.fillStyle = FAINT;
    ctx.font = font(500, 20);
    const notes = [
      'AI 시뮬레이션 결과이며 실제 시술 결과와 다를 수 있습니다. 시술 전 원장님과 상담해주세요.',
      '퍼스널 컬러 진단은 사진의 조명에 따라 달라질 수 있습니다.',
    ];
    for (const note of notes) y = drawWrapped(ctx, note, PAD, y + 22, CONTENT, 28);
    y += 12;
  }

  // ── 푸터 ──────────────────────────────────────────────────────────
  {
    const barH = 88;
    fillRoundRect(ctx, PAD, y, CONTENT, barH, 20, '#111827');
    ctx.fillStyle = '#ffffff';
    ctx.font = font(700, 26);
    ctx.fillText(data.salon.name, PAD + 24, y + 40, CONTENT - 48);
    ctx.fillStyle = '#9ca3af';
    ctx.font = font(500, 20);
    ctx.fillText(salonContactLine(data.salon), PAD + 24, y + 68, CONTENT - 48);
    y += barH;
  }

  y += PAD;

  // 실제로 쓴 높이만 남기고 잘라낸다.
  const out = document.createElement('canvas');
  out.width = W;
  out.height = Math.min(y, SCRATCH_HEIGHT);
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('리포트를 그릴 수 없습니다.');
  outCtx.drawImage(canvas, 0, 0, W, out.height, 0, 0, W, out.height);

  return out.toDataURL('image/jpeg', 0.92);
};
