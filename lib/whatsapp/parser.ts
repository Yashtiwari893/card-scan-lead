import axios from 'axios';

/**
 * Parses official 11za (MoMessage) webhook payload
 * Docs: https://11za.in/docs/incoming-messages
 * @param payload The incoming webhook JSON body from 11za
 */
export async function parseWebhookPayload(payload: any) {
  // Ignore status update events (delivered, seen, failed) — not actual messages
  if (payload?.status) {
    return { sender: null, isImage: false, text: '' };
  }

  // Only handle actual incoming message events
  if (payload?.event !== 'MoMessage' && payload?.event !== 'MoMessage::Postback') {
    return { sender: null, isImage: false, text: '' };
  }

  const from: string = payload.from || '';
  const contentType: string = payload?.content?.contentType || '';
  const text: string = payload?.content?.text || payload?.UserResponse || '';

  // Handle non-media (text/emoji) messages
  if (contentType !== 'media') {
    return { sender: from, isImage: false, text };
  }

  const media = payload?.content?.media;

  // Only process image type media (ignore video/audio/voice/document)
  if (!media || media.type !== 'image' || !media.url) {
    return { sender: from, isImage: false, text };
  }

  const mediaUrl: string = media.url;

  try {
    // Download image from 11za CDN
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');

    return {
      sender: from,
      isImage: true,
      text,
      base64Image: base64,
    };
  } catch (error: any) {
    console.error("Error downloading image from 11za URL:", mediaUrl, error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}
