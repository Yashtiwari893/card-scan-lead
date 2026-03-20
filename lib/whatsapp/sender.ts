import axios from 'axios';

const API_KEY = process.env.ELEVENZA_API_KEY;
const ORIGIN_WEBSITE = process.env.ORIGIN_WEBSITE || 'https://www.displ.in/';

/**
 * Sends a WhatsApp message via 11za REST API
 * @param to Recipient's phone number (with country code, no +)
 * @param message Message text to send
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!API_KEY) {
    console.error("ELEVENZA_API_KEY is missing in env");
    return { success: false, error: "API Key missing" };
  }

  // Update to the endpoint shown in typical 11za standard setups
  // If the user has a specific instance, they might need to change the domain.
  const url = `https://app.11za.in/apis/message/sendMessage`;

  try {
    const response = await axios.post(
      url,
      {
        phone: to,
        message: message,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
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
