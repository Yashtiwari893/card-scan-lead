import axios from 'axios';

const API_KEY = process.env.ELEVENZA_API_KEY;
const ORIGIN_WEBSITE = process.env.ORIGIN_WEBSITE || 'https://www.displ.in/';

/**
 * Sends a WhatsApp message via 11za REST API (Updated format)
 * @param to Recipient's phone number (with country code, no +)
 * @param message Message text to send
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!API_KEY) {
    console.error("ELEVENZA_API_KEY is missing in env");
    return { success: false, error: "API Key missing" };
  }

  // CORRECT 11ZA API ENDPOINT
  const url = `https://api.11za.in/apis/session/sendMessage/`;

  try {
    const response = await axios.post(
      url,
      {
        sendto: to.replace('+', '').trim(),
        authToken: API_KEY,
        originWebsite: ORIGIN_WEBSITE,
        message: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Optional: Some 11za APIs still check headers
          'Authorization': `Bearer ${API_KEY}`,
          'origin-website': ORIGIN_WEBSITE
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("11za Send Error:", JSON.stringify(errorData));
    return { success: false, error: errorData };
  }
}
