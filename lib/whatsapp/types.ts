export type ElevenZaChannel = 'whatsapp';

export type ElevenZaContentType = 'text' | 'media';

export type ElevenZaMediaType = 'image' | 'video' | 'audio' | 'voice' | 'document';

export interface ElevenZaMedia {
  type: ElevenZaMediaType;
  url: string;
  filename?: string;
}

export interface ElevenZaContent {
  contentType: ElevenZaContentType;
  text?: string;
  media?: ElevenZaMedia;
}

export interface ElevenZaIncomingMessage {
  messageId: string;
  channel: ElevenZaChannel;
  from: string;
  to: string;
  receivedAt: string;
  content: ElevenZaContent;
  whatsapp: {
    senderName?: string;
    text?: string;
    title?: string;
  };
  context?: {
    messageId: string;
  };
  postback?: {
    data: string;
  };
  timestamp: string | number;
  event: 'MoMessage' | 'MoMessage::Postback';
  isin24window: boolean;
  isResponded: boolean;
  UserResponse?: string;
  TemplateName?: string;
  InteractiveMessageTitle?: string;
}

export type ElevenZaMessageStatus = 'accepted' | 'delivered' | 'seen' | 'failed';

export interface ElevenZaStatusEvent {
  messageId: string;
  status: ElevenZaMessageStatus;
  timestamp: string;
}

export type ElevenZaWebhookPayload = ElevenZaIncomingMessage | ElevenZaStatusEvent;
