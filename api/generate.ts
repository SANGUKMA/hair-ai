import type { IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import type { HairColor, HairStyle } from '../types';

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

const buildPrompt = (style: HairStyle, color?: HairColor) => {
  const styleContext = `
The requested hairstyle is "${style.nameKo}" (${style.name}).
Style characteristics: ${style.description}
Style keywords: ${style.tags.join(', ')}
Client gender: ${style.gender === 'female' ? 'Female' : 'Male'}`;

  const colorContext = color
    ? `
Hair color requested: "${color.nameKo}" (${color.name})
Color details: ${color.description}`
    : '';

  return `You are a virtual hair stylist AI. Your ONLY job is to change the HAIR on a real person's photo.

## INPUT
- Image 1: THE CLIENT — this is the real person. Their face is sacred and must NOT change.
- Image 2: HAIRSTYLE REFERENCE ONLY — use this ONLY to understand the hair shape, volume, length, and texture. COMPLETELY IGNORE the face/person in Image 2.
${styleContext}${colorContext}

## ABSOLUTE RULE — IDENTITY PRESERVATION
The output image MUST be the SAME PERSON as Image 1. Not similar — THE SAME.
If the client's family or friends saw the result, they must instantly say "That's you!"

You are NOT generating a new person. You are NOT blending two faces. You are editing Image 1's hair ONLY.

### What must stay IDENTICAL to Image 1 (zero change allowed):
- Face shape, jawline, chin shape, cheekbone structure
- Eyes: exact shape, size, spacing, eyelid type (monolid/double), eye color
- Nose: exact shape, width, bridge height, nostril shape
- Lips: exact shape, thickness, lip line
- Eyebrows: exact shape, thickness, arch
- Skin: exact tone, texture, wrinkles, moles, freckles, blemishes — keep ALL of them
- Ears: exact shape and position
- Neck and shoulders: exact proportions
- Facial expression: keep the same or neutral
- Apparent age: must look the same age as in Image 1 (do NOT make them look younger or older)

### What you MUST NOT do:
- Do NOT use ANY facial features from Image 2 (the hairstyle reference)
- Do NOT smooth, filter, or beautify the skin
- Do NOT reshape the face, slim the jaw, enlarge the eyes, or alter any feature
- Do NOT change the skin tone or skin color
- Do NOT remove wrinkles, dark circles, moles, scars, or any skin detail
- Do NOT make the person look younger or more attractive — preserve their real appearance
- Do NOT blend or morph the two faces together in any way

## HAIR EDITING INSTRUCTIONS

### What to change (ONLY the hair):
1. Remove/replace the client's current hair with the hairstyle shown in Image 2
2. Match the hair's shape, layering, volume, curl pattern, and length from Image 2
3. Adapt the hairstyle naturally to the client's head shape and face proportions

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
- Match lighting direction and intensity from Image 1
- Photorealistic, sharp, high-resolution output
- The result should look like the client simply got a new haircut at a salon

## OUTPUT
1. Generate exactly ONE photorealistic image. No text, no watermarks, no collages. Just the client — the SAME person from Image 1 — with only their hair changed.
2. After the image, write a short stylist comment in Korean (2-3 sentences).
   - Write as a warm, professional salon director ("원장") speaking directly to the client.
   - Mention the specific hairstyle name and explain WHY this style suits the client's face shape, features, or vibe.
   - End with an encouraging, confidence-boosting remark.
   - Keep it natural and conversational Korean, not formal or stiff.
   - Do NOT include any hashtags, emojis, or English words.`;
};

const USER_IMAGE_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/;

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

  let body: { userImage?: unknown; styleId?: unknown; colorId?: unknown };
  try {
    body = (await readBody(req)) as typeof body;
  } catch (err) {
    const tooLarge = err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE';
    sendJson(res, tooLarge ? 413 : 400, {
      error: tooLarge ? '사진 용량이 너무 큽니다.' : 'Invalid request body.',
    });
    return;
  }

  const userImageMatch =
    typeof body.userImage === 'string' ? body.userImage.match(USER_IMAGE_PATTERN) : null;
  if (!userImageMatch) {
    sendJson(res, 400, { error: 'A base64 image data URI is required in "userImage".' });
    return;
  }

  let data: { styles: HairStyle[]; colors: HairColor[] };
  try {
    data = await loadData();
  } catch (err) {
    console.error('Failed to load style data:', err);
    sendJson(res, 500, { error: 'Server is not configured.' });
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
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: userImageMatch[1], data: userImageMatch[2] } },
            { inlineData: { mimeType: styleImage.mimeType, data: styleImage.data } },
            { text: buildPrompt(style, color) },
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
