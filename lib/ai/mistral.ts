import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * Extracts business card info using Mistral Large
 * @param base64Image Image in base64 format (without prefix)
 * @returns Parsed JSON contact object
 */
export async function parseWithMistral(base64Image: string) {
  const prompt = "You are a business card OCR expert. Extract information from this business card image and return ONLY a valid JSON object with these exact keys: name, email, phone, company, jobTitle, website. If a field is not found, use empty string. No explanation, no markdown, just the raw JSON object.";

  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            imageUrl: `data:image/jpeg;base64,${base64Image}`,
          } as any,
        ],
      },
    ],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.at(0)?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No response from Mistral");
  }

  return JSON.parse(content);
}
