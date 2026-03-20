import axios from 'axios';

/**
 * Parses 11za webhook payload to extract media content
 * @param payload The incoming webhook JSON body from 11za
 * @returns Object including sender, text, and base64 encoded image
 */
export async function parseWebhookPayload(payload: any) {
  const { sender, type, mediaUrl, text } = payload;

  if (type !== 'image') {
    return { sender, isImage: false, text };
  }

  if (!mediaUrl) {
    throw new Error("Image message received but mediaUrl is missing");
  }

  // 11za media URL usually requires the same api-key for access
  const API_KEY = process.env.ELEVENZA_API_KEY;

  try {
    const response = await axios.get(mediaUrl, {
      headers: { 'api-key': API_KEY || "" },
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');

    return {
      sender,
      isImage: true,
      text,
      base64Image: base64,
    };
  } catch (error: any) {
    console.error("Error downloading image from 11za:", error.message);
    throw new Error("Failed to download image from 11za");
  }
}
