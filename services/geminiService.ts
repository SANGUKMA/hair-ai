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

export const generateHairstyle = async (
  userImageBase64: string,
  styleImageBase64: string,
  styleInfo?: StyleInfo,
  colorInfo?: ColorInfo
): Promise<string> => {
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

  const prompt = `You are a world-class virtual hair stylist and image synthesis expert specializing in Korean beauty trends.

## INPUT
- Image 1: The client's current photo (Target Person)
- Image 2: The reference hairstyle to apply
${styleContext}${colorContext}

## YOUR TASK
Create a stunning, photorealistic image of the client wearing the reference hairstyle. The result should look like a professional salon "after" photo that makes the client excited and confident about this new look.

## CRITICAL RULES

### 1. Face Preservation (MOST IMPORTANT)
- Preserve the client's face EXACTLY: same facial structure, eyes, nose, lips, eyebrows, skin tone, skin texture, and facial proportions.
- The person in the output MUST be clearly recognizable as the same person from Image 1.
- Do NOT alter, smooth, or beautify the face. Keep it 100% authentic.

### 2. Face Shape Analysis & Hairstyle Adaptation
- Analyze the client's face shape (oval, round, square, heart, oblong, diamond).
- Adapt the reference hairstyle to FLATTER the client's specific face shape:
  · Round face → add volume on top, keep sides sleeker to elongate
  · Square face → soften jawline with layers or waves around the face
  · Oblong face → add width at sides, consider bangs to shorten appearance
  · Heart face → add volume below ears, softer framing around forehead
  · Oval face → most styles work, maintain balanced proportions
  · Diamond face → add width at forehead and chin area with styling
- Adjust hair volume, length framing, and parting to complement facial proportions.

### 3. Natural Integration
- The hairline must blend seamlessly with the forehead — no sharp cutoffs or visible edges.
- Hair strands near the face (baby hairs, sideburns, face-framing layers) must look natural.
- Ensure proper shadows and highlights where hair meets skin (temples, ears, neck).
- Hair should interact naturally with ears (partially covering or tucking behind as appropriate).

### 4. Hair Color Application
${colorInfo ? `- IMPORTANT: Apply the requested hair color "${colorInfo.nameKo}" to the hairstyle.
- Color specification: ${colorInfo.description}
- The color must look like a professional salon dye job — even, glossy, and well-blended.
- Ensure natural color gradation: slightly darker at roots, richer through mid-lengths, with natural light reflection.
- For highlight/two-tone styles: blend the colors seamlessly with natural transitions.
- The hair color must complement the client's skin undertone for a flattering result.` : `- Keep the hair color natural, matching the reference hairstyle image or the client's original color.
- Hair color should complement the client's skin undertone (warm/cool/neutral).`}

### 5. Lighting & Color Harmony
- Match the hair's lighting direction, intensity, and color temperature to the original photo.
- Hair color reflections and shine must be consistent with the photo's light source.
- Ensure consistent shadow casting from hair onto face and neck.

### 6. Photo Quality
- Output must be high-resolution, sharp, and photorealistic.
- Professional salon photography quality with natural bokeh if the original has it.
- Same camera angle, framing, and background as the original photo.
- The image should look like it was taken at a premium hair salon.

## OUTPUT
Generate exactly ONE photorealistic image. No text, no watermarks, no split images. Just the client with their beautiful new hairstyle, looking natural and confident.`;

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
  if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image data in Gemini response. finishReason: " + candidates?.[0]?.finishReason);
};
