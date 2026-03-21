import { parseWithGroq } from "./groq";
import { parseWithMistral } from "./mistral";
import { parseWithGemini } from "./gemini";

/**
 * Robust AI router for business card OCR with prioritized fallback:
 * 1. Groq (Llama Vision)
 * 2. Mistral (Large/Pixtral)
 * 3. Gemini (Fallback)
 * 
 * @param base64Image Base64 image data (without prefix)
 * @returns Parsed JSON contact object and the name of provider used
 */
export async function parseBusinessCard(base64Image: string) {
  const errors: string[] = [];

  // 1. Try Groq
  try {
    const data = await parseWithGroq(base64Image);
    return { data, provider: "groq" };
  } catch (err: any) {
    errors.push(`Groq: ${err.message}`);
    console.error("Groq failed:", err.message);
  }

  // 2. Try Mistral
  try {
    const data = await parseWithMistral(base64Image);
    return { data, provider: "mistral" };
  } catch (err: any) {
    errors.push(`Mistral: ${err.message}`);
    console.error("Mistral failed:", err.message);
  }

  // 3. Try Gemini
  try {
    const data = await parseWithGemini(base64Image);
    return { data, provider: "gemini" };
  } catch (err: any) {
    errors.push(`Gemini: ${err.message}`);
    console.error("Gemini failed:", err.message);
  }

  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}


const aiRouter = {
  parseBusinessCard,
};

export default aiRouter;
