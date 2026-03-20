import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Extracts business card info using Groq Llama Vision
 * @param base64Image Image in base64 format (witout prefix)
 * @returns Parsed JSON contact object
 */
export async function parseWithGroq(base64Image: string) {
  const prompt = "You are a business card OCR expert. Extract information from this business card image and return ONLY a valid JSON object with these exact keys: name, email, phone, company, jobTitle, website. If a field is not found, use empty string. No explanation, no markdown, just the raw JSON object.";

  const response = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return JSON.parse(content);
}
