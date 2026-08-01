import type { IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  CrownVolume,
  FaceShape,
  FringeAdjustment,
  StyleAdjustments,
  HairColor,
  HairDensity,
  HairDiagnosis,
  HairStyle,
  HairTexture,
  HairThickness,
  PersonalColor,
} from '../types';

// 이 파일에는 상대경로 '값' import를 두지 않는다. package.json이 "type": "module"이라
// 배포된 함수는 ESM으로 로드되고, ESM은 확장자 없는 상대경로를 해석하지 못해
// 모듈 로딩 단계에서 통째로 죽는다(FUNCTION_INVOCATION_FAILED).
// 스타일/컬러 데이터는 vercel.json의 includeFiles로 번들에 넣고 런타임에 읽는다.
// (위 import type은 컴파일 시 완전히 제거되므로 안전하다)
const DATA_DIR = path.join(process.cwd(), 'data');

let dataCache: { styles: HairStyle[]; colors: HairColor[] } | null = null;
const loadData = async () => {
  if (!dataCache) {
    const [styles, colors] = await Promise.all([
      readFile(path.join(DATA_DIR, 'hairstyles.json'), 'utf8'),
      readFile(path.join(DATA_DIR, 'hairColors.json'), 'utf8'),
    ]);
    dataCache = { styles: JSON.parse(styles), colors: JSON.parse(colors) };
  }
  return dataCache;
};

// 이미지 생성은 10-15초가 걸린다. 기본 타임아웃(10s)으로는 부족하다.
export const config = { maxDuration: 60 };

// 회원 코드는 Vercel 환경변수로만 관리한다. 저장소가 공개라 커밋하면 그대로 유출된다.
// 서버는 "유효한 코드 집합"만 알고 누구의 코드인지는 모른다. 코드↔회원 매핑은
// 운영자가 따로 보관한다(서버에 개인정보를 두지 않기 위함).
// 하이픈·공백은 무시하고 비교한다. 코드를 전화로 불러주거나 종이에서 옮겨 적는
// 상황이라 "HF-A7K2-9QX4"를 "hf a7k2 9qx4"나 "HFA7K29QX4"로 넣는 경우가 생긴다.
const normalizeCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

const MEMBER_CODES = new Set(
  (process.env.MEMBER_CODES || '').split(',').map(normalizeCode).filter(Boolean)
);

const DAILY_LIMIT = Number(process.env.DAILY_LIMIT_PER_CODE) || 20;

// 서버리스는 인스턴스마다 메모리가 따로라 이 카운터는 정확하지 않다.
// 정확한 제한이 아니라, 코드 하나가 새어나갔을 때 한 번에 예산을 태우는 걸
// 늦추기 위한 최소 방어선이다. 정확히 하려면 외부 저장소(KV)가 필요하다.
const usage = new Map<string, { day: string; count: number }>();

const exceedsDailyLimit = (code: string): boolean => {
  const day = new Date().toISOString().slice(0, 10);
  const entry = usage.get(code);
  if (!entry || entry.day !== day) {
    usage.set(code, { day, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > DAILY_LIMIT;
};

const MAX_BODY_BYTES = 6 * 1024 * 1024;

let client: GoogleGenAI | null = null;
const getClient = (apiKey: string): GoogleGenAI => {
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
};

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

// Vercel은 JSON 본문을 미리 파싱해 req.body에 넣어주지만, Vite dev 미들웨어에서는
// 스트림을 직접 읽어야 한다. 두 환경 모두에서 동작하도록 분기한다.
const readBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const preparsed = (req as IncomingMessage & { body?: unknown }).body;
    if (preparsed !== undefined && preparsed !== null) {
      resolve(typeof preparsed === 'string' ? JSON.parse(preparsed) : preparsed);
      return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

// 스타일 이미지는 번들에 포함된 public/styles/ 에서 직접 읽는다(vercel.json includeFiles).
// style은 서버 데이터에서 id로 조회한 값이라 경로 조작 위험이 없다.
const loadStyleImage = async (style: HairStyle) => {
  const filePath = path.join(process.cwd(), 'public', style.imagePath);
  const data = await readFile(filePath);
  const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'image/png';
  return { mimeType, data: data.toString('base64') };
};

// 모델 교체는 코드 수정 없이 환경변수로 가능하게 둔다.
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
// 얼굴 분석/추천은 정체성 보존 이슈가 없어 최신 flash를 쓴다.
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';

const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'long', 'diamond'] as const;

// 얼굴형별 스타일링 보정 지침. 추천 단계에서 받은 얼굴형을 생성 프롬프트에 넘겨
// 참조 사진을 그대로 베끼는 대신 고객 얼굴에 맞게 조정하도록 만든다.
const FACE_SHAPE_GUIDANCE: Record<FaceShape, string> = {
  oval: 'Balanced proportions — the reference style can be followed closely. Keep the natural balance rather than adding corrective volume.',
  round: 'Add height and volume at the crown, keep the sides closer to the head, and let face-framing pieces fall past the cheeks to lengthen the face. Avoid width at cheek level.',
  square: 'Soften the strong jawline with face-framing waves and wispy, textured ends around the jaw. Avoid blunt horizontal lines landing exactly at the jaw.',
  heart: 'Balance the wider forehead with volume and fullness around the jaw and chin. A soft side-swept or see-through fringe helps narrow the forehead.',
  long: 'Add width and volume at the sides around cheek level and avoid excessive length that lengthens the face further. A fringe shortens the visual face length.',
  diamond: 'Add volume at the forehead and around the jaw to balance prominent cheekbones. Keep the width at cheek level soft rather than full.',
};

// 모델이 목록에 없는 값을 지어낼 수 있어 진단 결과는 전부 이 가드를 통과시킨 뒤 쓴다.
const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as readonly string[]).includes(v);

const isFaceShape = oneOf(FACE_SHAPES);

const PERSONAL_COLORS = ['spring-warm', 'summer-cool', 'autumn-warm', 'winter-cool'] as const;
const isPersonalColor = oneOf(PERSONAL_COLORS);

// 모발·두상 진단. 정면 사진에서 읽히는 축만 둔다(뒤통수는 보이지 않아 제외).
const HAIR_THICKNESSES = ['fine', 'medium', 'thick'] as const;
const HAIR_DENSITIES = ['sparse', 'medium', 'dense'] as const;
const HAIR_TEXTURES = ['straight', 'wavy', 'curly'] as const;
const CROWN_VOLUMES = ['flat', 'medium', 'full'] as const;

const isHairThickness = oneOf(HAIR_THICKNESSES);
const isHairDensity = oneOf(HAIR_DENSITIES);
const isHairTexture = oneOf(HAIR_TEXTURES);
const isCrownVolume = oneOf(CROWN_VOLUMES);

// 모발 특성별 생성 지침. 얼굴형과 같은 방식으로, 참조 사진을 그대로 베끼는 대신
// 이 고객의 실제 모발에 맞춰 조정하게 만든다.
const HAIR_THICKNESS_GUIDANCE: Record<HairThickness, string> = {
  fine: 'Individual strands are fine. Ends should read soft and wispy, and the silhouette should stay light — never render coarse, heavy-looking hair on this client.',
  medium: 'Average strand thickness — no special compensation needed.',
  thick: 'Individual strands are coarse and strong. The cut holds its shape with real body, and ends read blunter unless the style is texturised.',
};

const HAIR_DENSITY_GUIDANCE: Record<HairDensity, string> = {
  sparse: 'The client does not have thick hair. Do NOT give them a full head of hair they do not have — keep the amount of hair close to Image 1 and let the CUT create the impression of fullness. Inventing density is as much an identity failure as reshaping the face.',
  medium: 'Average density — render the style as it normally sits.',
  dense: 'The client has a lot of hair. Render the style with genuine fullness, and remove internal weight where the style would otherwise balloon into a triangular silhouette.',
};

const HAIR_TEXTURE_GUIDANCE: Record<HairTexture, string> = {
  straight: 'The natural hair is straight. If the requested style is a perm or waves, render it as a fresh salon perm on straight hair, not as naturally curly hair.',
  wavy: 'The natural hair has a soft wave. If the requested style needs a smooth finish, render it as properly blow-dried rather than as a different hair type.',
  curly: 'The natural hair is strongly curly. If the requested style is smooth or straight, render it as professionally straightened hair — keep the strand character, do not swap in someone else\'s hair type.',
};

const CROWN_VOLUME_GUIDANCE: Record<CrownVolume, string> = {
  flat: 'The crown sits flat. Lift the hair at the crown so the head shape reads balanced.',
  medium: 'Crown height is balanced — keep it as it is.',
  full: 'The crown already has natural height. Do not add volume there, or the head will read too large for the face.',
};

const FRINGE_ADJUSTMENTS = ['keep', 'add', 'remove'] as const;
const isFringeAdjustment = oneOf(FRINGE_ADJUSTMENTS);

// types.ts의 ADJUSTMENT_LIMIT과 같은 값. 이 파일은 상대경로 '값' import가 금지라
// (파일 맨 위 주석 참고) 공유하지 못하고 중복해 둔다.
const ADJUSTMENT_LIMIT = 2;

const toLevel = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(-ADJUSTMENT_LIMIT, Math.min(ADJUSTMENT_LIMIT, Math.trunc(v)));
};

const STEP_WORD = ['', 'slightly', 'clearly'];

// 결과를 보고 누른 미세조정. 참조 사진과 충돌하면 이쪽이 이겨야 한다 —
// 고객이 이미 한 번 보고 "이건 좀 다르게"라고 말한 내용이기 때문이다.
const buildAdjustmentContext = (adj: StyleAdjustments, style: HairStyle): string => {
  const word = (n: number) => STEP_WORD[Math.abs(n)];
  const lines: string[] = [];

  if (adj.length) {
    lines.push(
      `- Length: cut it ${word(adj.length)} ${adj.length < 0 ? 'shorter' : 'longer'} than the reference style shows.`
    );
  }
  if (adj.volume) {
    lines.push(
      adj.volume > 0
        ? `- Volume: give it ${word(adj.volume)} more body and lift than the reference style shows.`
        : `- Volume: make it ${word(adj.volume)} sleeker and closer to the head than the reference style shows.`
    );
  }
  // 컬 조정은 펌에만 의미가 있다. 컷에 들어오면 무시한다.
  if (adj.curl && style.category === 'perm') {
    lines.push(
      adj.curl > 0
        ? `- Curl: make the curl pattern ${word(adj.curl)} tighter and more defined.`
        : `- Curl: make the curl pattern ${word(adj.curl)} looser and softer.`
    );
  }
  if (adj.fringe === 'add') {
    lines.push('- Fringe: add a fringe that suits this client, even if the reference style has none.');
  }
  if (adj.fringe === 'remove') {
    lines.push('- Fringe: no fringe. Sweep the front pieces back or to the side, even if the reference style has one.');
  }

  if (!lines.length) return '';

  return `

## THE CLIENT'S REQUESTED CHANGES
The client has already seen a first result and asked for these specific changes. Where they conflict with the reference photo, THESE WIN — the reference is only a starting point now.
${lines.join('\n')}`;
};

// 피부 보정 강도. 세게 밀수록 "예쁘지만 다른 사람"으로 넘어갈 위험이 커지므로
// 코드 수정 없이 되돌릴 수 있게 환경변수로 뺐다.
type RetouchLevel = 'subtle' | 'medium' | 'strong';

const RETOUCH_LEVEL: RetouchLevel = (() => {
  const v = process.env.RETOUCH_LEVEL;
  return v === 'subtle' || v === 'medium' || v === 'strong' ? v : 'medium';
})();

const RETOUCH_BLOCKS: Record<RetouchLevel, string> = {
  subtle: `### Gentle rejuvenation — this IS wanted, but keep it restrained:
The client should look like the best-rested version of themselves: roughly three to five years younger.
- Even out the skin tone, reduce redness and blotchiness
- Soften fine lines and wrinkles — SOFTEN them, do not erase them
- Reduce dark circles and under-eye shadows
- Calm down blemishes and acne
- Leave a healthy natural glow, with real pores and skin texture still visible`,

  medium: `### Rejuvenation and salon finish — this IS wanted:
The client should look like the best-rested, best-lit version of themselves walking out of a high-end salon: roughly five to eight years younger. Still unmistakably the same person, never a different generation.
- Even out the skin tone fully, clear redness and blotchiness
- Clearly soften wrinkles — forehead lines, crow's feet and nasolabial folds should be visibly reduced, but still faintly readable up close
- Clear dark circles and brighten the under-eye area
- Remove blemishes, acne and age spots (prominent moles and beauty spots stay)
- Healthy, luminous, well-hydrated skin that still shows real pores and texture
- Tidy the hair too: no stray frizz, healthy natural shine, and grey strands restored to their natural younger color unless a grey or silver color was requested

### Make the photograph itself flattering:
Finish the shot the way a professional salon photographer would. Keep the SAME camera angle, background, framing and lighting DIRECTION as Image 1, but soften and even out the light so it gently defines the cheekbones and jawline, add clean catchlights in the eyes, and lift harsh shadows.
All of that definition must come from LIGHTING ONLY. Never move, slim or reshape any bone structure to achieve it.`,

  strong: `### Rejuvenation and beauty finish — go clearly further, but never break identity:
The client should look like a professionally styled, professionally lit beauty portrait of themselves: roughly eight to ten years younger, at their absolute best. Still instantly recognisable as the same individual.
- Perfectly even, clear skin tone
- Smooth away wrinkles and folds almost completely, leaving only the faintest trace so the face still moves like a real face
- Fully clear dark circles, brighten and open up the eye area
- Remove blemishes, acne, age spots and broken capillaries (prominent moles and beauty spots stay)
- Radiant, dewy, glass-skin finish — but keep enough pore detail that it still reads as a photograph, not a 3D render
- Restyle the hair to salon-finished quality: glossy, frizz-free, with grey strands restored to their natural younger color unless a grey or silver color was requested

### Make the photograph itself flattering:
Finish the shot the way a professional beauty photographer would. Keep the SAME camera angle, background, framing and lighting DIRECTION as Image 1, but relight it softly and flatteringly: sculpt the cheekbones and jawline with light, add clean catchlights in the eyes, lift all harsh shadows.
All of that definition must come from LIGHTING ONLY. Never move, slim or reshape any bone structure to achieve it.`,
};

const buildPrompt = (
  style: HairStyle,
  color?: HairColor,
  diagnosis: Partial<HairDiagnosis> = {},
  adjustments?: StyleAdjustments,
  retouch: RetouchLevel = RETOUCH_LEVEL
) => {
  const { faceShape, hairThickness, hairDensity, hairTexture, crownVolume } = diagnosis;
  const adjustmentContext = adjustments ? buildAdjustmentContext(adjustments, style) : '';

  const faceContext = faceShape
    ? `
Client face shape: ${faceShape}
Styling adjustment for this face shape: ${FACE_SHAPE_GUIDANCE[faceShape]}`
    : '';

  // 판정된 축만 넣는다. 진단이 안 된 축은 언급하지 않는 편이 낫다 — 빈 값을 알리면
  // 모델이 거기에 대해 뭔가 지어내기 시작한다.
  const hairLines = [
    hairThickness && `- Strand thickness (${hairThickness}): ${HAIR_THICKNESS_GUIDANCE[hairThickness]}`,
    hairDensity && `- Density (${hairDensity}): ${HAIR_DENSITY_GUIDANCE[hairDensity]}`,
    hairTexture && `- Natural texture (${hairTexture}): ${HAIR_TEXTURE_GUIDANCE[hairTexture]}`,
    crownVolume && `- Crown volume (${crownVolume}): ${CROWN_VOLUME_GUIDANCE[crownVolume]}`,
  ].filter(Boolean);

  const hairContext = hairLines.length
    ? `

The client's own hair — this is the hair you are replacing, and the result must stay true to it:
${hairLines.join('\n')}`
    : '';

  const styleContext = `
The requested hairstyle is "${style.nameKo}" (${style.name}).
Style characteristics: ${style.description}
Style keywords: ${style.tags.join(', ')}
Client gender: ${style.gender === 'female' ? 'Female' : 'Male'}${faceContext}${hairContext}`;

  const colorContext = color
    ? `
Hair color requested: "${color.nameKo}" (${color.name})
Color details: ${color.description}`
    : '';

  return `You are a virtual hair stylist AI. You restyle the HAIR on a real person's photo and give their skin a light, natural salon-grade retouch. You never change WHO they are.

## INPUT
- Image 1: THE CLIENT — this is the real person. Their facial structure is sacred and must NOT change.
- Image 2: HAIRSTYLE REFERENCE ONLY — use this ONLY to understand the hair shape, volume, length, and texture. COMPLETELY IGNORE the face/person in Image 2.
${styleContext}${colorContext}

## ABSOLUTE RULE — IDENTITY PRESERVATION
The output image MUST be the SAME PERSON as Image 1. Not similar — THE SAME.
If the client's family or friends saw the result, they must instantly say "That's you!"

You are NOT generating a new person. You are NOT blending two faces. You are editing Image 1's hair ONLY.

### Identity anchors — these must stay IDENTICAL to Image 1 (zero change allowed):
- Face shape, jawline, chin shape, cheekbone structure
- Eyes: exact shape, size, spacing, eyelid type (monolid/double), eye color
- Nose: exact shape, width, bridge height, nostril shape
- Lips: exact shape, thickness, lip line
- Eyebrows: exact shape, thickness, arch
- Ears: exact shape and position
- Neck and shoulders: exact proportions
- Skin color and undertone — you may even it out, but never lighten or shift the tone
- Distinctive permanent marks: prominent moles, beauty spots and scars stay, they are part of who this person is
- Facial expression: keep the same or neutral

${RETOUCH_BLOCKS[retouch]}

If the retouching ever starts to change WHO the person is, stop and keep the original. Identity always wins over beauty — a flawless stranger is a failed result.

### What you MUST NOT do:
- Do NOT use ANY facial features from Image 2 (the hairstyle reference)
- Do NOT reshape the face, slim the jaw, enlarge the eyes, or alter any feature
- Do NOT change the skin color, undertone, or ethnicity
- Do NOT apply a heavy beauty filter or airbrushed, plastic, doll-like skin
- Do NOT erase all pores and texture — the result must still read as a real photograph
- Do NOT turn an adult into a teenager or shift the client's apparent generation
- Do NOT blend or morph the two faces together in any way${adjustmentContext}

## HAIR EDITING INSTRUCTIONS

### What to change:
1. Remove/replace the client's current hair with the hairstyle shown in Image 2
2. Take Image 2 as the DIRECTION — its shape, layering, volume, curl pattern and length — NOT as a template to copy strand for strand
3. Adapt that style to THIS client the way a real salon director would: tune the length, where the volume sits, the parting and the face-framing pieces so the cut genuinely flatters their face shape, head size and proportions${faceContext || hairContext ? '. Follow the client-specific adjustments listed above — the reference photo shows a different person with different hair' : ''}
4. The finished cut must look like it was cut FOR this person, not pasted on from someone else's photo

### Natural hair integration:
- Hairline must match the client's ORIGINAL hairline from Image 1
- Hair must sit naturally on the client's head with correct perspective and scale
- Face-framing strands, baby hairs, and sideburns must blend with the client's skin
- Proper shadows where hair meets forehead, temples, ears, and neck

### Hair color:
${color ? `- Apply the requested color "${color.nameKo}": ${color.description}
- Make it look like a professional salon coloring — even, with natural root-to-tip gradation.` : `- Use a natural hair color that matches the reference hairstyle or the client's original hair color.`}

## PHOTO QUALITY
- Keep the SAME camera angle, background, and framing as Image 1
- Keep the same lighting DIRECTION as Image 1 (you may soften and even out the light as described above)
- Photorealistic, sharp, high-resolution output
- The result should look like the client simply got a new haircut at a salon

## OUTPUT
1. Generate exactly ONE photorealistic image. No text, no watermarks, no collages. Just the client — unmistakably the SAME person from Image 1 — with the new hairstyle and lightly refreshed skin.
2. After the image, write a short stylist comment in Korean (2-3 sentences).
   - Write as a warm, professional salon director ("원장") speaking directly to the client.
   - Mention the specific hairstyle name and explain WHY this style suits the client's face shape, features, or vibe.
   - End with an encouraging, confidence-boosting remark.
   - Keep it natural and conversational Korean, not formal or stiff.
   - Do NOT include any hashtags, emojis, or English words.`;
};

const USER_IMAGE_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/;

type InlineImage = { mimeType: string; data: string };

const generateImage = async (
  apiKey: string,
  userImage: InlineImage,
  styleImage: InlineImage,
  prompt: string
): Promise<{ image: string; comment: string; inline: InlineImage } | null> => {
  const response = await getClient(apiKey).models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: userImage }, { inlineData: styleImage }, { text: prompt }],
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  let inline: InlineImage | null = null;
  let comment = '';

  for (const part of parts || []) {
    if (part.inlineData?.data) {
      inline = { mimeType: part.inlineData.mimeType || 'image/png', data: part.inlineData.data };
    } else if (part.text) {
      comment += part.text;
    }
  }

  if (!inline) {
    console.error(
      'No image in Gemini response. finishReason:',
      response.candidates?.[0]?.finishReason
    );
    return null;
  }

  return { image: `data:${inline.mimeType};base64,${inline.data}`, comment: comment.trim(), inline };
};

// ── 동일인 검증 ──────────────────────────────────────────────────────────────
// 프롬프트로 정체성 보존을 아무리 강하게 요구해도 실패는 일어난다. 실패한 결과가
// 그대로 회원에게 나가면 "예쁘지만 다른 사람"이 되어 신뢰를 잃는다. 생성한 뒤
// 원본과 결과를 다시 모델에 넣어 같은 사람인지 판정하고, 아니면 한 번 다시 만든다.
// 판정 로그는 모델별 통과율을 쌓아 provider 결정을 감이 아니라 숫자로 만드는 근거이기도 하다.
const IDENTITY_CHECK = process.env.IDENTITY_CHECK !== 'off';

// 판정에는 추천용 flash가 아니라 pro를 쓴다. flash는 같은 성별·연령대의 다른 얼굴을
// 통과시켜 버렸다. 실측으로 flash는 5개 중 2개, pro는 5개 전부를 맞혔다.
// 판정 실패는 곧 "다른 사람 사진을 회원에게 보여주는 것"이라 여기서는 비용보다 정확도다.
const IDENTITY_MODEL = process.env.IDENTITY_MODEL || 'gemini-3.1-pro-preview';

// 실패해도 자동 재생성은 하지 않는다. 생성 20초 + 판정 10초라, 재생성까지 하면
// 최악의 경우 63초로 함수 제한(60초)을 넘긴다. 타임아웃은 회원에게 아무것도 주지
// 못하므로 경고를 붙여 내보내는 것보다 나쁘다. 다시 만들기는 결과 화면 버튼으로 한다.

type IdentityVerdict = 'same' | 'uncertain' | 'different';

// 총평 하나만 물으면 "인상이 비슷하다"로 통과시켜 버린다. 부위별로 따로 답하게 만들어
// 대충 넘어가는 길을 막고, 최종 판정은 그 답들로 서버가 계산한다.
const FEATURE_MATCHES = ['match', 'drifted', 'different'] as const;
type FeatureMatch = (typeof FEATURE_MATCHES)[number];
const isFeatureMatch = oneOf(FEATURE_MATCHES);
const IDENTITY_FEATURES = ['eyes', 'nose', 'mouth', 'faceStructure'] as const;

const featureProperty = (what: string) => ({
  type: Type.STRING,
  enum: [...FEATURE_MATCHES],
  description: `Whether ${what} is the same person's: "match", "drifted" or "different".`,
});

const IDENTITY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    eyes: featureProperty('the eye shape, size, spacing and eyelid type'),
    nose: featureProperty('the nose bridge, width, tip and nostril shape'),
    mouth: featureProperty('the mouth width and lip shape'),
    faceStructure: featureProperty('the jawline, chin, cheekbones and face width-to-length ratio'),
    reason: {
      type: Type.STRING,
      description:
        'One short English sentence naming the specific evidence. Read by the operator in logs, never by the client.',
    },
  },
  required: ['eyes', 'nose', 'mouth', 'faceStructure', 'reason'],
};

const IDENTITY_PROMPT = `You are checking whether a hair simulation kept the client's identity.

- Image 1: the client's original photo.
- Image 2: the simulation result.

## CHANGES THAT ARE INTENDED — never treat these as a different person
- The hair: a completely different cut, length, colour and texture is the entire point of the tool
- Skin retouching: evened skin tone, softened wrinkles, brightened under-eyes, cleared blemishes
- The client looking several years younger and better rested
- Softer, more flattering lighting, and a cleaner, sharper photograph

## THE FAILURE YOU ARE LOOKING FOR
It is almost never a wildly different face. It is the client's face quietly replaced by a
generically attractive one of the same gender, age and ethnicity, lit and styled the same way.
Two people of the same type are still two people. SIMILAR IS NOT THE SAME.
A matching overall impression is not evidence. Compare the features one at a time and answer
from what you can actually measure against each other — proportions, ratios, and shapes.

## WHAT YOU ARE JUDGING, FEATURE BY FEATURE
Answer each of these separately, using only what a haircut and a retouch cannot change:
- eyes: shape, size, spacing, eyelid type
- nose: bridge height, width, tip, nostril shape
- mouth: width and lip shape, including lip thickness
- faceStructure: jawline, chin, cheekbones, and the width-to-length ratio of the face

For each one answer:
- "match": the same person's, allowing for retouching
- "drifted": recognisably close, but the shape or proportion has visibly moved
- "different": not the same person's feature

Be strict about shape and proportion. Be permissive about skin, apparent age, lighting and hair.
A difference that a haircut, make-up, retouching or better lighting fully explains is a "match".`;

export const verifyIdentity = async (
  apiKey: string,
  original: InlineImage,
  generated: InlineImage
): Promise<IdentityVerdict> => {
  try {
    const response = await getClient(apiKey).models.generateContent({
      model: IDENTITY_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: original },
            { inlineData: generated },
            { text: IDENTITY_PROMPT },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', responseSchema: IDENTITY_SCHEMA },
    });

    const parsed = JSON.parse(response.text || '{}');

    // 판정은 서버가 계산한다. 모델에게 총평을 맡기면 부위별로 어긋난 걸 보고도
    // "전체적으로 비슷하다"로 통과시킨다.
    const features: FeatureMatch[] = IDENTITY_FEATURES.map(key =>
      isFeatureMatch(parsed[key]) ? parsed[key] : 'match'
    );
    const drifted = features.filter(f => f === 'drifted').length;
    const mismatched = features.filter(f => f === 'different').length;

    // 한 부위라도 남의 것이거나 두 부위 이상 흔들렸으면 얼굴이 바뀐 것으로 본다.
    // 한 부위만 흔들린 건 보정으로도 생기므로 통과시킨다.
    const verdict: IdentityVerdict =
      mismatched > 0 || drifted >= 2 ? 'different' : drifted === 1 ? 'uncertain' : 'same';

    console.log(
      `[identity] image=${MODEL} judge=${IDENTITY_MODEL} verdict=${verdict} ` +
        IDENTITY_FEATURES.map((key, i) => `${key}=${features[i]}`).join(' ') +
        ` reason=${JSON.stringify(parsed.reason || '')}`
    );
    return verdict;
  } catch (err) {
    // 검증이 실패했다고 멀쩡할지도 모르는 생성 결과를 버릴 수는 없다. 통과로 보고 넘어간다.
    console.error('Identity check failed:', err);
    return 'uncertain';
  }
};

const RECOMMEND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    faceShape: { type: Type.STRING, enum: [...FACE_SHAPES] },
    faceNote: {
      type: Type.STRING,
      description: 'One short Korean sentence describing the face shape and features, addressed to the client.',
    },
    hairThickness: { type: Type.STRING, enum: [...HAIR_THICKNESSES] },
    hairDensity: { type: Type.STRING, enum: [...HAIR_DENSITIES] },
    hairTexture: { type: Type.STRING, enum: [...HAIR_TEXTURES] },
    crownVolume: { type: Type.STRING, enum: [...CROWN_VOLUMES] },
    hairNote: {
      type: Type.STRING,
      description:
        'One short Korean sentence on the hair itself — thickness, density, texture and crown volume — addressed to the client.',
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          styleId: { type: Type.STRING, description: 'Must be one of the ids from the catalogue.' },
          reason: {
            type: Type.STRING,
            description: 'One short Korean sentence on why this style suits the client.',
          },
        },
        required: ['styleId', 'reason'],
      },
    },
    personalColor: { type: Type.STRING, enum: [...PERSONAL_COLORS] },
    colorNote: {
      type: Type.STRING,
      description:
        'One short Korean sentence explaining the personal colour diagnosis, addressed to the client.',
    },
    colorRecommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          colorId: {
            type: Type.STRING,
            description: 'Must be one of the ids from the colour catalogue.',
          },
          reason: {
            type: Type.STRING,
            description: 'One short Korean sentence on why this colour suits the client.',
          },
        },
        required: ['colorId', 'reason'],
      },
    },
  },
  required: [
    'faceShape',
    'faceNote',
    'hairThickness',
    'hairDensity',
    'hairTexture',
    'crownVolume',
    'hairNote',
    'recommendations',
    'personalColor',
    'colorNote',
    'colorRecommendations',
  ],
};

// 퍼스널 컬러 4계절 판정 기준. 모델이 매번 다른 잣대를 쓰지 않도록 프롬프트에 명시한다.
const PERSONAL_COLOR_RUBRIC = `- spring-warm (봄 웜): warm golden undertone, light and clear colouring, gentle contrast between skin, hair and eyes
- summer-cool (여름 쿨): cool pink undertone, soft and muted colouring, gentle contrast
- autumn-warm (가을 웜): warm golden undertone, deep and muted colouring, rich and earthy
- winter-cool (겨울 쿨): cool blue undertone, clear and deep colouring, strong contrast`;

const buildRecommendPrompt = (
  catalogue: HairStyle[],
  colorCatalogue: HairColor[]
) => `You are an experienced Korean salon director recommending haircuts and hair colour.

Look at the client's photo and work out their face shape, features and overall vibe, then read the hair itself. Only after both do you pick the THREE styles from the catalogue below that would genuinely suit them best.

## THE CLIENT'S HAIR
Judge each of these from the photo. They decide as much as face shape does — a cut that lives on body and movement will fall flat on fine, sparse hair no matter how well it suits the face.
- hairThickness — how thick one single strand is (fine / medium / thick)
- hairDensity — how much hair there is overall (sparse / medium / dense)
- hairTexture — the natural texture underneath any styling (straight / wavy / curly)
- crownVolume — how much height sits at the crown (flat / medium / full)

If the hair is tied back, heavily styled or partly out of frame, judge from what you can actually see rather than guessing.

## CATALOGUE (you may ONLY recommend ids from this list)
${catalogue.map(s => `- ${s.id}: ${s.nameKo} (${s.category === 'cut' ? '컷' : '펌'}) — ${s.description} [${s.tags.join(', ')}]`).join('\n')}

## PERSONAL COLOUR
Separately, diagnose which of the four personal colour seasons the client belongs to. Judge it from the UNDERTONE of their skin, and from how their skin, hair and eye colours sit against each other:
${PERSONAL_COLOR_RUBRIC}

Then pick the THREE hair colours from the colour catalogue below that would suit that season best.

## COLOUR CATALOGUE (you may ONLY recommend ids from this list)
${colorCatalogue.map(c => `- ${c.id}: ${c.nameKo} — ${c.description}`).join('\n')}

## RULES
- Recommend exactly three styles and exactly three colours, best match first, and never repeat an id.
- Base the choice on the client's actual face shape, proportions, features, hair and undertone — not on which styles or colours are generally popular.
- Weigh the hair reading as heavily as the face shape. Where the hair is what decides it, say so in "reason".
- Write "reason", "faceNote", "hairNote" and "colorNote" in warm, natural, conversational Korean, as if speaking directly to the client. One sentence each.
- Keep "hairNote" practical and kind — describe the hair as something to work with, never as a flaw.
- In "colorNote", name the season in Korean (봄 웜톤 / 여름 쿨톤 / 가을 웜톤 / 겨울 쿨톤) and say in one line what it means for their hair colour.
- Judge the undertone only. Do NOT describe the client's skin as light or dark, and do NOT mention or infer ethnicity.
- Do NOT use hashtags, emojis, or English words in the Korean text.
- Do NOT comment on the client's attractiveness, weight, or age.`;

// 모델이 카탈로그에 없는 id를 지어내거나 같은 id를 두 번 넣을 수 있어 서버에서 걸러낸다.
const pickValidIds = (items: unknown, idKey: 'styleId' | 'colorId', allowed: Set<string>) => {
  const seen = new Set<string>();
  return (Array.isArray(items) ? items : [])
    .filter((r: Record<string, unknown>) => {
      const id = r?.[idKey];
      if (typeof id !== 'string' || seen.has(id) || !allowed.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 3);
};

const handleRecommend = async (
  res: ServerResponse,
  apiKey: string,
  userImage: RegExpMatchArray,
  styles: HairStyle[],
  colors: HairColor[],
  gender: unknown
) => {
  const catalogue = styles.filter(s => s.gender === (gender === 'male' ? 'male' : 'female'));
  // 'natural'은 "염색 안함"이라 추천 대상이 아니다.
  const colorCatalogue = colors.filter(c => c.id !== 'natural');

  const response = await getClient(apiKey).models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: userImage[1], data: userImage[2] } },
          { text: buildRecommendPrompt(catalogue, colorCatalogue) },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RECOMMEND_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  const recommendations = pickValidIds(
    parsed.recommendations,
    'styleId',
    new Set(catalogue.map(s => s.id))
  );

  if (!recommendations.length) {
    console.error('Recommendation returned no usable style ids:', response.text);
    sendJson(res, 502, { error: '추천을 만들지 못했습니다.' });
    return;
  }

  // 컬러 추천은 부가 정보다. 비어 있어도 스타일 추천까지 버리지는 않는다.
  const colorRecommendations = pickValidIds(
    parsed.colorRecommendations,
    'colorId',
    new Set(colorCatalogue.map(c => c.id))
  );

  const note = (v: unknown) => (typeof v === 'string' ? v : '');

  sendJson(res, 200, {
    faceShape: isFaceShape(parsed.faceShape) ? parsed.faceShape : null,
    faceNote: note(parsed.faceNote),
    hairThickness: isHairThickness(parsed.hairThickness) ? parsed.hairThickness : null,
    hairDensity: isHairDensity(parsed.hairDensity) ? parsed.hairDensity : null,
    hairTexture: isHairTexture(parsed.hairTexture) ? parsed.hairTexture : null,
    crownVolume: isCrownVolume(parsed.crownVolume) ? parsed.crownVolume : null,
    hairNote: note(parsed.hairNote),
    recommendations,
    personalColor: isPersonalColor(parsed.personalColor) ? parsed.personalColor : null,
    colorNote: note(parsed.colorNote),
    colorRecommendations,
  });
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured on the server.');
    sendJson(res, 500, { error: 'Server is not configured.' });
    return;
  }

  let body: {
    accessCode?: unknown;
    action?: unknown;
    userImage?: unknown;
    styleId?: unknown;
    colorId?: unknown;
    gender?: unknown;
    faceShape?: unknown;
    hairThickness?: unknown;
    hairDensity?: unknown;
    hairTexture?: unknown;
    crownVolume?: unknown;
    adjustments?: unknown;
  };
  try {
    body = (await readBody(req)) as typeof body;
  } catch (err) {
    const tooLarge = err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE';
    sendJson(res, tooLarge ? 413 : 400, {
      error: tooLarge ? '사진 용량이 너무 큽니다.' : 'Invalid request body.',
    });
    return;
  }

  // 회원 확인은 비용이 드는 작업 앞에서 가장 먼저 한다.
  // 설정이 안 된 상태에서는 전부 막는다. 열어두면 접근 제어가 없는 것과 같다.
  if (!MEMBER_CODES.size) {
    console.error('MEMBER_CODES is not configured — refusing every request.');
    sendJson(res, 503, { error: '서비스 준비 중입니다. 잠시 후 다시 시도해주세요.' });
    return;
  }

  const accessCode = typeof body.accessCode === 'string' ? normalizeCode(body.accessCode) : '';
  if (!MEMBER_CODES.has(accessCode)) {
    sendJson(res, 401, { error: '회원 코드가 올바르지 않습니다.' });
    return;
  }

  // 코드 확인 전용. 이미지도 필요 없고 일일 한도도 소모하지 않는다.
  if (body.action === 'verify') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (exceedsDailyLimit(accessCode)) {
    console.warn(`[usage] code=${accessCode} exceeded the daily limit of ${DAILY_LIMIT}`);
    sendJson(res, 429, {
      error: `오늘 사용 가능한 횟수(${DAILY_LIMIT}회)를 모두 사용하셨습니다. 내일 다시 이용해주세요.`,
    });
    return;
  }

  const userImageMatch =
    typeof body.userImage === 'string' ? body.userImage.match(USER_IMAGE_PATTERN) : null;
  if (!userImageMatch) {
    sendJson(res, 400, { error: 'A base64 image data URI is required in "userImage".' });
    return;
  }

  // 코드별 사용량은 로그로 남긴다. 어느 회원인지는 운영자의 명단에서만 확인된다.
  console.log(`[usage] code=${accessCode} action=${body.action === 'recommend' ? 'recommend' : 'generate'}`);

  let data: { styles: HairStyle[]; colors: HairColor[] };
  try {
    data = await loadData();
  } catch (err) {
    console.error('Failed to load style data:', err);
    sendJson(res, 500, { error: 'Server is not configured.' });
    return;
  }

  if (body.action === 'recommend') {
    try {
      await handleRecommend(res, apiKey, userImageMatch, data.styles, data.colors, body.gender);
    } catch (err) {
      console.error('Recommendation failed:', err);
      sendJson(res, 500, { error: '추천에 실패했습니다.' });
    }
    return;
  }

  const style = data.styles.find(s => s.id === body.styleId);
  if (!style) {
    sendJson(res, 400, { error: 'Unknown "styleId".' });
    return;
  }

  // 'natural'은 "염색 안함"이라 색상 지시를 아예 넣지 않는다.
  const color =
    typeof body.colorId === 'string' && body.colorId !== 'natural'
      ? data.colors.find(c => c.id === body.colorId)
      : undefined;

  // 진단 값은 클라이언트가 보낸 자유 문자열이다. 고정 목록으로 검증한 것만 프롬프트에 넣어
  // 임의의 문자열이 지시문에 섞이지 않게 한다.
  const diagnosis: Partial<HairDiagnosis> = {
    faceShape: isFaceShape(body.faceShape) ? body.faceShape : undefined,
    hairThickness: isHairThickness(body.hairThickness) ? body.hairThickness : undefined,
    hairDensity: isHairDensity(body.hairDensity) ? body.hairDensity : undefined,
    hairTexture: isHairTexture(body.hairTexture) ? body.hairTexture : undefined,
    crownVolume: isCrownVolume(body.crownVolume) ? body.crownVolume : undefined,
  };

  // 배열도 length를 갖고 문자열도 마찬가지라, 순수 객체일 때만 읽는다.
  const rawAdjustments =
    body.adjustments && typeof body.adjustments === 'object' && !Array.isArray(body.adjustments)
      ? (body.adjustments as Record<string, unknown>)
      : {};

  const adjustments: StyleAdjustments = {
    length: toLevel(rawAdjustments.length),
    volume: toLevel(rawAdjustments.volume),
    curl: toLevel(rawAdjustments.curl),
    fringe: isFringeAdjustment(rawAdjustments.fringe)
      ? (rawAdjustments.fringe as FringeAdjustment)
      : 'keep',
  };

  try {
    const styleImage = await loadStyleImage(style);
    const prompt = buildPrompt(style, color, diagnosis, adjustments);
    const original: InlineImage = { mimeType: userImageMatch[1], data: userImageMatch[2] };

    const result = await generateImage(apiKey, original, styleImage, prompt);
    if (!result) {
      sendJson(res, 502, { error: '이미지를 생성하지 못했습니다.' });
      return;
    }

    // 'uncertain'은 피부 보정만으로도 흔하게 나온다. 확실히 다른 사람일 때만 알린다.
    const identityWarning = IDENTITY_CHECK
      ? (await verifyIdentity(apiKey, original, result.inline)) === 'different'
      : false;

    sendJson(res, 200, { image: result.image, comment: result.comment, identityWarning });
  } catch (err) {
    console.error('Hairstyle generation failed:', err);
    sendJson(res, 500, { error: '헤어스타일 생성에 실패했습니다.' });
  }
}
