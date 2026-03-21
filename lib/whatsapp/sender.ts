import axios from 'axios';

const API_KEY = process.env.ELEVENZA_API_KEY;

/**
 * Sends a WhatsApp message via 11za REST API (v2)
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!API_KEY) throw new Error("ELEVENZA_API_KEY is missing");

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

/**
 * Sends a WhatsApp document via 11za REST API (v2)
 * @param to Recipient's phone number
 * @param fileUrl URL of the file to send
 * @param fileName Visible name of the file
 * @param message Optional caption
 */
export async function sendWhatsAppDocument(to: string, fileUrl: string, fileName: string, message?: string) {
  if (!API_KEY) throw new Error("ELEVENZA_API_KEY is missing");

  const url = `https://app-v2.11za.in/api/v1/messages/send`;

  try {
    const response = await axios.post(
      url,
      {
        phone: to,
        message: message || '',
        media_url: fileUrl,
        filename: fileName,
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
    console.error("11za Document Send Error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}


