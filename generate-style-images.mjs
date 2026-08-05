import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const styles = [
  {
    id: "m14",
    file: "m14-long-layered.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "장발 레이어드" (Long Layered Cut) hairstyle. Hair grown out to shoulder length, straight and sleek with soft long layers through the lengths so it falls in vertical lines past the jaw. Centre or loose middle part, ears covered. Not curly, not shaggy — clean and flowing. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m15",
    file: "m15-long-wave-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "웨이브 장발" (Long Wave Perm) hairstyle. Hair grown to the shoulders with loose, relaxed S-waves through the lengths, parted in the middle and tucked loosely behind one ear. Soft and free-spirited, not tightly curled. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m16",
    file: "m16-curly-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "곱슬펌" (Curly Perm) hairstyle. Small, tight, springy curls packed densely across the whole top and sides, giving strong round volume well above the head. The curl pattern is clearly defined, not a loose wave. Medium length, sides not shaved. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m17",
    file: "m17-wolf-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "울프컷" (Wolf Cut) hairstyle. Short choppy layers through the top and crown for volume, growing out into longer wispy pieces at the sides and the nape, with a light textured fringe falling onto the forehead. Deliberately shaggy, spiky separation between the layers. Medium length. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m18",
    file: "m18-blunt-fringe.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "일자뱅컷" (Blunt Fringe Cut) hairstyle. A thick, full fringe cut in one straight horizontal line just above the eyebrows, covering the whole forehead — not thinned or see-through. This is NOT a bowl cut: the sides are cut short and tapered close above the ears, the ears are visible, and the silhouette is flat and narrow at the sides rather than round. Modern and clean. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m19",
    file: "m19-slick-back.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man in his twenties with a "슬릭백" (Slick Back) hairstyle. All the hair including the front is combed straight back away from the face with pomade, so the whole forehead and hairline are exposed, with height at the front and short tapered sides. Glossy finish. He is facing the camera straight on, both ears and both sides of the face equally visible, head not turned. Casual plain top, no suit. Natural black hair color. Front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
];

const outputDir = path.join("public", "styles");

async function generateImage(style, index) {
  console.log(`[${index + 1}/${styles.length}] Generating: ${style.id} (${style.file})...`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: style.prompt }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          const filePath = path.join(outputDir, style.file);
          fs.writeFileSync(filePath, buffer);
          console.log(`  -> Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)}KB)`);
          return true;
        }
      }
    }
    console.log(`  -> WARNING: No image data for ${style.id}`);
    return false;
  } catch (err) {
    console.error(`  -> ERROR for ${style.id}:`, err.message);
    return false;
  }
}

async function main() {
  console.log("=== Generating hairstyle images with Gemini ===\n");

  let success = 0;
  let fail = 0;

  for (let i = 0; i < styles.length; i++) {
    const ok = await generateImage(styles[i], i);
    if (ok) success++;
    else fail++;

    // Small delay between requests to avoid rate limiting
    if (i < styles.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\n=== Done! Success: ${success}, Failed: ${fail} ===`);
}

main();
