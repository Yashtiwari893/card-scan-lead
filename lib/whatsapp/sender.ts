import axios from 'axios';

const API_KEY = process.env.ELEVENZA_API_KEY;

/**
 * Sends a WhatsApp message via 11za REST API (v2)
 * @param to Recipient's phone number (with country code, no +)
 * @param message Message text to send
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!API_KEY) throw new Error("ELEVENZA_API_KEY is missing");

  // New API Endpoint for 11za Send Message
  const url = `https://app-v2.11za.in/api/v1/messages/send`;

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
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("11za Send Error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}
