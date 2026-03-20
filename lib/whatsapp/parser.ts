import axios from 'axios';
import { ElevenZaWebhookPayload, ElevenZaIncomingMessage, ElevenZaStatusEvent } from './types';

/**
 * Parses 11za (v2) webhook payload to extract relevant content
 * @param payload The incoming webhook JSON body from 11za
 * @returns Object including sender, text, media, status events, etc.
 */
export async function parseWebhookPayload(payload: ElevenZaWebhookPayload) {
  // 1. Handle Status Events
  if ('status' in payload) {
    const statusEvent = payload as ElevenZaStatusEvent;
    return {
      type: 'status',
      messageId: statusEvent.messageId,
      status: statusEvent.status,
      timestamp: statusEvent.timestamp,
    };
  }

  // 2. Handle Incoming Messages (MoMessage or MoMessage::Postback)
  const incoming = payload as ElevenZaIncomingMessage;
  if (!incoming.event || !incoming.content) {
    return { type: 'unknown', data: payload };
  }

  const { from, content, event, UserResponse, TemplateName, InteractiveMessageTitle, postback } = incoming;
  const contentType = content.contentType;
  const mediaType = content.media?.type;
  
  // Extract primary text content
  const text = UserResponse || content.text || incoming.whatsapp?.text || incoming.whatsapp?.title || '';

  const result: any = {
    type: 'message',
    event,
    sender: from,
    contentType,
    mediaType,
    text,
    messageId: incoming.messageId,
    receivedAt: incoming.receivedAt,
    template: TemplateName,
    interactive: InteractiveMessageTitle,
    postback: postback?.data,
  };

  // 3. Process Image specifically for OCR
  if (contentType === 'media' && mediaType === 'image' && content.media?.url) {
    try {
      const response = await axios.get(content.media.url, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data, 'binary');
      result.base64Image = buffer.toString('base64');
      result.isImage = true;
    } catch (error: any) {
      console.error("Error downloading image from 11za URL:", error.message);
      // We don't throw here to allow other parts of the message to still be processed
      result.isImage = false;
      result.downloadError = error.message;
    }
  } else {
    result.isImage = false;
  }

  return result;
}
