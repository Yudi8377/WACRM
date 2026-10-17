export type Channel = 'whatsapp' | 'facebook_messenger' | 'instagram' | 'tiktok' | 'youtube';

export type NormalizedInboundMessage = {
  channel: Channel;
  externalEventId: string;
  externalConversationId: string;
  externalContactId: string;
  contactName?: string;
  text?: string;
  media?: Array<{ kind: 'image' | 'video' | 'audio' | 'document' | 'other'; url?: string; mimeType?: string }>;
  occurredAt: string;
  rawPayload: unknown;
};

export type SendMessageInput = {
  tenantId: string;
  connectionId: string;
  conversationExternalId: string;
  text: string;
  idempotencyKey: string;
};

export type SendMessageResult = { externalMessageId: string; status: 'accepted' | 'sent' };

export interface ChannelConnector {
  readonly channel: Channel;
  verifyWebhook(request: Request): Promise<boolean>;
  parseInbound(request: Request): Promise<NormalizedInboundMessage[]>;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
