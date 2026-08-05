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
    id: "w15",
    file: "w15-bob-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "단발펌" (Bob Perm) hairstyle. Jaw-to-chin length bob with soft, rounded curls throughout the mid-lengths and ends, giving the short cut body and movement. Not tight ringlets — soft, natural bounce. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w16",
    file: "w16-pixie-cut.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "픽시컷" (Pixie Cut) hairstyle. Very short crop with tapered nape and sides, ears and neckline exposed, slightly longer textured top with a wispy side-swept fringe. Chic and confident. Natural dark black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w17",
    file: "w17-stacked-bob.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "스택보브" (Stacked / A-line Bob) hairstyle. Strongly graduated A-line bob: the back is cut clearly short and stacked high with rounded volume at the back of the head, while the two front sections angle steeply downward and are noticeably LONGER than the back, reaching past the jaw toward the collarbone. The difference in length between the short back and the long front pieces must be obvious even from the front. Sleek, sharp lines. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w18",
    file: "w18-curtain-bangs.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with "커튼뱅" (Curtain Bangs). She has a DISTINCT fringe, clearly much shorter than the rest of her hair: it is split down the middle and sweeps outward to both sides like open curtains, the shortest inner pieces landing at eyebrow level and lengthening out to the cheekbones. The fringe must be visibly separate from the shoulder-length hair behind it, partly covering the forehead on both sides. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "w19",
    file: "w19-long-layers.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean woman with a "롱 레이어드" (Long Layers) hairstyle. Long hair well past the collarbone with soft graduated layers removing weight through the mid-lengths and ends, so the hair falls with movement instead of a heavy blunt line. No fringe. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m12",
    file: "m12-down-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "다운펌" (Down Perm) hairstyle. The hair is NOT slicked or swept back — a soft natural fringe falls forward over the forehead. The point of the style is that the side hair above the ears and the back hair lie completely flat and pressed close to the skull instead of puffing out or flicking up, and the frizz is smoothed away. Medium-short length, neat and understated everyday look. Natural black hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
  },
  {
    id: "m13",
    file: "m13-leaf-perm.png",
    prompt: `Generate a professional salon portfolio photo of a young Korean man with a "리프펌" (Leaf Perm) hairstyle. Short tapered sides with a short permed top where the strands separate into leaf-shaped pointed pieces falling toward the forehead. Light, airy texture, not heavy curls. Natural dark brown hair color. Shot from front-facing angle, soft studio lighting, clean neutral background, high-resolution, photorealistic. No text or watermarks.`,
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
