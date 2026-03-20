import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Extracts business card info using Gemini 1.5 Flash
 * @param base64Image Image in base64 format (without prefix)
 * @returns Parsed JSON contact object
 */
export async function parseWithGemini(base64Image: string) {
  const prompt = "You are a business card OCR expert. Extract information from this business card image and return ONLY a valid JSON object with these exact keys: name, email, phone, company, jobTitle, website. If a field is not found, use empty string. No explanation, no markdown, just the raw JSON object.";

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    },
  ]);

  const response = await result.response;
  const text = response.text();
  
  // Clean text from potential markdown blocks
  const cleanedText = text.replace(/```json|```/g, "").trim();
  
  return JSON.parse(cleanedText);
}
