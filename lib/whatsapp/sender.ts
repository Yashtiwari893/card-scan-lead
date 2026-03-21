import axios from 'axios';

const AUTH_TOKEN = process.env.ELEVENZA_API_KEY;
const ORIGIN_WEBSITE = process.env.ELEVENZA_ORIGIN_WEBSITE || 'card-scan-lead.vercel.app';

/**
 * Sends a WhatsApp message via 11za legacy/specific endpoint
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!AUTH_TOKEN) throw new Error("ELEVENZA_API_KEY is missing");

  const url = `https://api.11za.in/apis/session/sendMessage`;

  try {
    const response = await axios.post(url, {
      sendto: to,
      authToken: AUTH_TOKEN,
      originWebsite: ORIGIN_WEBSITE,
      message: message,
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("11za Send Error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

/**
 * Sends a WhatsApp media/document via 11za specific endpoint
 * @param to Recipient's phone
 * @param fileUrl URL of the file
 * @param fileName Name of file (e.g. John.vcf)
 * @param type 'document' or 'image'
 */
export async function sendWhatsAppDocument(to: string, fileUrl: string, fileName: string, type: string = 'document') {
  if (!AUTH_TOKEN) throw new Error("ELEVENZA_API_KEY is missing");

  const url = `https://api.11za.in/apis/session/sendMedia`;

  try {
    const response = await axios.post(url, {
      sendto: to,
      authToken: AUTH_TOKEN,
      originWebsite: ORIGIN_WEBSITE,
      mediaUrl: fileUrl,
      mediaType: type,
      fileName: fileName
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("11za Media Send Error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}
