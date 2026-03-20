import axios from 'axios';

/**
 * Parses 11za (v2) webhook payload to extract media content
 * @param payload The incoming webhook JSON body from 11za
 * @returns Object including sender, text, and base64 encoded image
 */
export async function parseWebhookPayload(payload: any) {
  // Check if payload has the expected 11za structure
  if (payload?.event !== 'message' || !payload?.data) {
    return { sender: null, isImage: false, text: '' };
  }

  const { from, type, image, text } = payload.data;
  const messageText = text?.body || '';

  if (type !== 'image' || !image?.url) {
    return { sender: from, isImage: false, text: messageText };
  }

  const mediaUrl = image.url;

  try {
    // Usually these CDNs don't need auth headers to download if the URL is signed,
    // but we can add authorization if required by 11za
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');

    return {
      sender: from,
      isImage: true,
      text: messageText,
      base64Image: base64,
    };
  } catch (error: any) {
    console.error("Error downloading image from 11za URL:", error.message);
    throw new Error("Failed to download image from 11za");
  }
}
