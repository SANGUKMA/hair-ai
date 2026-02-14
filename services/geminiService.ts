import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const cleanBase64 = (dataUri: string): string => {
  return dataUri.replace(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/, '');
};

const getMimeType = (dataUri: string): string => {
  const match = dataUri.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  return match ? match[1] : 'image/jpeg';
};

export interface StyleInfo {
  name: string;
  nameKo: string;
  description: string;
  tags: string[];
  gender: 'female' | 'male';
}

export interface ColorInfo {
  name: string;
  nameKo: string;
  description: string;
}

export interface GenerateResult {
  image: string;
  comment: string;
}

export const generateHairstyle = async (
  userImageBase64: string,
  styleImageBase64: string,
  styleInfo?: StyleInfo,
  colorInfo?: ColorInfo
): Promise<GenerateResult> => {
  const userMime = getMimeType(userImageBase64);
  const styleMime = getMimeType(styleImageBase64);
  const cleanUserImage = cleanBase64(userImageBase64);
  const cleanStyleImage = cleanBase64(styleImageBase64);

  const styleContext = styleInfo
    ? `
The requested hairstyle is "${styleInfo.nameKo}" (${styleInfo.name}).
Style characteristics: ${styleInfo.description}
Style keywords: ${styleInfo.tags.join(', ')}
Client gender: ${styleInfo.gender === 'female' ? 'Female' : 'Male'}`
    : '';

  const colorContext = colorInfo
    ? `
Hair color requested: "${colorInfo.nameKo}" (${colorInfo.name})
Color details: ${colorInfo.description}`
    : '';

  const prompt = `You are a virtual hair stylist AI. Your ONLY job is to change the HAIR on a real person's photo.

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
${colorInfo ? `- Apply the requested color "${colorInfo.nameKo}": ${colorInfo.description}
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: userMime, data: cleanUserImage } },
          { inlineData: { mimeType: styleMime, data: cleanStyleImage } },
          { text: prompt }
        ]
      }
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    }
  });

  const candidates = response.candidates;
  let image: string | null = null;
  let comment = '';

  if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        image = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        comment += part.text;
      }
    }
  }

  if (!image) {
    throw new Error("No image data in Gemini response. finishReason: " + candidates?.[0]?.finishReason);
  }

  return { image, comment: comment.trim() };
};
