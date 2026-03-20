import axios from 'axios';

const API_KEY = process.env.ELEVENZA_API_KEY;
const SENDER_NUMBER = process.env.ELEVENZA_PHONE_NUMBER;

/**
 * Sends a WhatsApp message via 11za REST API
 * @param to Recipient's phone number (with country code, no +)
 * @param message Message text to send
 * @returns Success status
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!API_KEY) throw new Error("ELEVENZA_API_KEY is missing");

  const url = `https://api.11za.com/api/v1/messages/sendText`;

  try {
    const response = await axios.post(
      url,
      {
        number: to,
        message: message,
        sender: SENDER_NUMBER, // Some versions of 11za API might need the sender number
      },
      {
        headers: {
          'api-key': API_KEY,
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
