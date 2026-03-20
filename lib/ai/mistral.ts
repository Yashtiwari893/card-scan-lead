import axios from "axios";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/**
 * Extracts business card info using Mistral Pixtral (vision model)
 * Uses direct HTTP instead of SDK to avoid Content-Length issues
 * @param base64Image Image in base64 format (without prefix)
 * @returns Parsed JSON contact object
 */
export async function parseWithMistral(base64Image: string) {
  if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY missing");

  const prompt = "You are a business card OCR expert. Extract information from this business card image and return ONLY a valid JSON object with these exact keys: name, email, phone, company, jobTitle, website. If a field is not found, use empty string. No explanation, no markdown, just the raw JSON object.";

  const body = JSON.stringify({
    model: "pixtral-12b-2409", // Mistral's vision-capable model
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const response = await axios.post(
    "https://api.mistral.ai/v1/chat/completions",
    body,
    {
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(), // Fix 411 error
      },
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No response from Mistral");
  }

  const cleanedText = content.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanedText);
}
