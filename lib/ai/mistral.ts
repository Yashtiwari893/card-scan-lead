/**
 * Extracts business card info using Mistral (Pixtral)
 * Using native fetch to ensure proper headers like Content-Length
 */
export async function parseWithMistral(base64Image: string) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is missing");

  const prompt = "You are a business card OCR expert. Extract information from this business card image and return ONLY a valid JSON object with these exact keys: name, email, phone, company, jobTitle, website. If a field is not found, use empty string. No explanation, no markdown, just the raw JSON object.";

  const body = JSON.stringify({
    model: "pixtral-12b-2409",
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

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "Content-Length": Buffer.byteLength(body).toString(),
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API Error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) throw new Error("No response from Mistral");

  return JSON.parse(content);
}
