import type { IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type { FaceShape, HairColor, HairStyle } from '../types';

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
const MEMBER_CODES = new Set(
  (process.env.MEMBER_CODES || '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)
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

const isFaceShape = (v: unknown): v is FaceShape =>
  typeof v === 'string' && (FACE_SHAPES as readonly string[]).includes(v);

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
  faceShape?: FaceShape,
  retouch: RetouchLevel = RETOUCH_LEVEL
) => {
  const faceContext = faceShape
    ? `
Client face shape: ${faceShape}
Styling adjustment for this face shape: ${FACE_SHAPE_GUIDANCE[faceShape]}`
    : '';

  const styleContext = `
The requested hairstyle is "${style.nameKo}" (${style.name}).
Style characteristics: ${style.description}
Style keywords: ${style.tags.join(', ')}
Client gender: ${style.gender === 'female' ? 'Female' : 'Male'}${faceContext}`;

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
- Do NOT blend or morph the two faces together in any way

## HAIR EDITING INSTRUCTIONS

### What to change:
1. Remove/replace the client's current hair with the hairstyle shown in Image 2
2. Take Image 2 as the DIRECTION — its shape, layering, volume, curl pattern and length — NOT as a template to copy strand for strand
3. Adapt that style to THIS client the way a real salon director would: tune the length, where the volume sits, the parting and the face-framing pieces so the cut genuinely flatters their face shape, head size and proportions${faceShape ? '. Follow the styling adjustment given for their face shape above' : ''}
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

const RECOMMEND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    faceShape: { type: Type.STRING, enum: [...FACE_SHAPES] },
    faceNote: {
      type: Type.STRING,
      description: 'One short Korean sentence describing the face shape and features, addressed to the client.',
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
  },
  required: ['faceShape', 'faceNote', 'recommendations'],
};

const buildRecommendPrompt = (catalogue: HairStyle[]) => `You are an experienced Korean salon director recommending haircuts.

Look at the client's photo and work out their face shape, features and overall vibe. Then pick the THREE styles from the catalogue below that would genuinely suit them best.

## CATALOGUE (you may ONLY recommend ids from this list)
${catalogue.map(s => `- ${s.id}: ${s.nameKo} (${s.category === 'cut' ? '컷' : '펌'}) — ${s.description} [${s.tags.join(', ')}]`).join('\n')}

## RULES
- Recommend exactly three styles, best match first, and never repeat an id.
- Base the choice on the client's actual face shape, proportions and features — not on which styles are generally popular.
- Write "reason" and "faceNote" in warm, natural, conversational Korean, as if speaking directly to the client. One sentence each.
- Do NOT use hashtags, emojis, or English words in the Korean text.
- Do NOT comment on the client's attractiveness, weight, age, or anything unrelated to hair and face shape.`;

const handleRecommend = async (
  res: ServerResponse,
  apiKey: string,
  userImage: RegExpMatchArray,
  styles: HairStyle[],
  gender: unknown
) => {
  const catalogue = styles.filter(s => s.gender === (gender === 'male' ? 'male' : 'female'));

  const response = await getClient(apiKey).models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: userImage[1], data: userImage[2] } },
          { text: buildRecommendPrompt(catalogue) },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RECOMMEND_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  // 모델이 카탈로그에 없는 id를 지어낼 수 있으므로 서버에서 걸러낸다.
  const seen = new Set<string>();
  const recommendations = (parsed.recommendations || [])
    .filter((r: { styleId?: string }) => {
      if (!r?.styleId || seen.has(r.styleId)) return false;
      if (!catalogue.some(s => s.id === r.styleId)) return false;
      seen.add(r.styleId);
      return true;
    })
    .slice(0, 3);

  if (!recommendations.length) {
    console.error('Recommendation returned no usable style ids:', response.text);
    sendJson(res, 502, { error: '추천을 만들지 못했습니다.' });
    return;
  }

  sendJson(res, 200, {
    faceShape: isFaceShape(parsed.faceShape) ? parsed.faceShape : null,
    faceNote: typeof parsed.faceNote === 'string' ? parsed.faceNote : '',
    recommendations,
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

  const accessCode =
    typeof body.accessCode === 'string' ? body.accessCode.trim().toUpperCase() : '';
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
      await handleRecommend(res, apiKey, userImageMatch, data.styles, body.gender);
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

  try {
    const styleImage = await loadStyleImage(style);
    const response = await getClient(apiKey).models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: userImageMatch[1], data: userImageMatch[2] } },
            { inlineData: { mimeType: styleImage.mimeType, data: styleImage.data } },
            // faceShape는 고정 목록으로 검증한 값만 쓴다. 클라이언트가 보낸 자유 문자열이
            // 프롬프트에 그대로 섞이지 않도록 하기 위함이다.
            { text: buildPrompt(style, color, isFaceShape(body.faceShape) ? body.faceShape : undefined) },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    let image: string | null = null;
    let comment = '';

    for (const part of parts || []) {
      if (part.inlineData?.data) {
        image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      } else if (part.text) {
        comment += part.text;
      }
    }

    if (!image) {
      console.error(
        'No image in Gemini response. finishReason:',
        response.candidates?.[0]?.finishReason
      );
      sendJson(res, 502, { error: '이미지를 생성하지 못했습니다.' });
      return;
    }

    sendJson(res, 200, { image, comment: comment.trim() });
  } catch (err) {
    console.error('Hairstyle generation failed:', err);
    sendJson(res, 500, { error: '헤어스타일 생성에 실패했습니다.' });
  }
}
