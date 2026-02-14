import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const API_KEY = "AIzaSyC-B5t8PwC-MkSCCSsJsbwNAxXBNARekpc";
const ai = new GoogleGenAI({ apiKey: API_KEY });

const styles = [
  {
    id: "w7",
    file: "w7-short-layered.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "단발 레이어드컷" (Short Layered Cut) hairstyle. The hair should be a short bob with layered textures, falling just around the jawline with natural movement. The layers should frame the face beautifully. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. The model should look natural and confident. No text or watermarks.`,
  },
  {
    id: "w8",
    file: "w8-tassel-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "태슬컷" (Tassel Cut) hairstyle. The hair should have thin, wispy, see-through ends that look light and airy, with delicate tassel-like tips. Medium to long length. The bangs should also be thin and see-through. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w9",
    file: "w9-volume-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "볼륨커트" (Volume Cut) hairstyle. The hair should have abundant volume with bouncy layers, looking full and thick. Medium length with lots of body and movement. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w10",
    file: "w10-bob-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "보브컷" (Bob Cut) hairstyle. Classic clean bob cut at jawline length, with a straight clean bottom line. Sleek and polished look. Natural dark black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w11",
    file: "w11-layered-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "레이어드펌" (Layered Perm) hairstyle. The hair should have layers with natural-looking waves/curls added through perm. Medium to long length with flowing, bouncy waves at different layers. Natural brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w12",
    file: "w12-elizabeth-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "엘리자벳펌" (Elizabeth Perm) hairstyle. The hair should have big, elegant, glamorous curls reminiscent of classic Hollywood waves. Large voluminous S-shaped waves, luxurious and feminine. Medium to long length. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w13",
    file: "w13-jelly-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "젤리펌" (Jelly Perm) hairstyle. The hair should have tight, bouncy, springy small curls throughout. The curls should look elastic and defined, giving a cute and youthful vibe. Medium length. Natural brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w14",
    file: "w14-ballong-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "발롱펌" (Balloon Perm) hairstyle. The hair should have round, balloon-like volume with soft bouncy curls that puff out. The overall silhouette should be round and voluminous, making the face look smaller. Medium length. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m7",
    file: "m7-gail-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "가일컷" (Gail Cut) hairstyle. Short sides with a fade, longer textured top hair swept to one side. Clean and masculine look with sharp side part. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m8",
    file: "m8-seethrough-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "시스루컷" (See-through Cut) hairstyle. Thin, wispy see-through bangs that show the forehead slightly. Short and neat overall with natural texture. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m9",
    file: "m9-gail-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "가일펌" (Gail Perm) hairstyle. Short faded sides with wavy/permed textured top swept to one side. Combines the gail cut structure with soft waves on top. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m10",
    file: "m10-seethrough-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "시스루펌" (See-through Perm) hairstyle. Thin see-through bangs with gentle waves/perm texture. Soft and natural-looking with slight waviness in the bangs and top. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m11",
    file: "m11-garma-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "가르마펌" (Garma/Part Perm) hairstyle. Center or side-parted hair with natural waves from perm. The part line is visible and the hair flows naturally to both sides with gentle S-wave curves. Clean and sophisticated business-casual look. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
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
