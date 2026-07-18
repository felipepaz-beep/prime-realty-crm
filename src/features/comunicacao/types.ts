export type ConversationChannel = 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'email' | 'sms' | 'internal';
export type ConversationStatus = 'open' | 'closed' | 'waiting' | 'archived';
export type MessageDirection = 'incoming' | 'outgoing';
export type MessageType = 'text' | 'image' | 'pdf' | 'audio' | 'video' | 'location' | 'contact' | 'sticker' | 'system';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ConversationMetadata {
  ai_summary?: string;
  lead_intent?: string;
  sentiment_score?: number;
  suggested_reply?: string;
  lead_score_delta?: number;
  [key: string]: unknown;
}

export interface MessageMetadata {
  provider_msg_id?: string;
  intent?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  entities?: string[];
  summary?: string;
  [key: string]: unknown;
}

export interface MessageAttachment {
  url: string;
  mime_type: string;
  name: string;
  size?: number;
  duration?: number;
}

export interface Conversation {
  id: string;
  owner_id: string;
  client_id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  subject: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  metadata: ConversationMetadata;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  client?: { nome: string; telefone: string | null; whatsapp: string | null; email: string | null; etapa_funil: string; prioridade: string; proximo_followup: string | null; ultimo_contato: string | null; tags: string[]; } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender: string | null;
  type: MessageType;
  content: string | null;
  attachment: MessageAttachment | null;
  status: MessageStatus;
  metadata: MessageMetadata;
  sent_at: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ConversationInsert = Pick<Conversation, 'client_id' | 'channel'> & Partial<Pick<Conversation, 'subject' | 'metadata'>>;
export type MessageInsert = Pick<Message, 'conversation_id' | 'direction' | 'type'> & Partial<Pick<Message, 'content' | 'attachment' | 'sender' | 'metadata'>>;

export interface ConversationFiltros {
  channel?: ConversationChannel;
  status?: ConversationStatus;
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

export interface ConversationPaginadas {
  data: Conversation[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface CommunicationProvider {
  channel: ConversationChannel;
  sendText(to: string, text: string): Promise<string>;
  sendMedia(to: string, attachment: MessageAttachment): Promise<string>;
  isConnected(): Promise<boolean>;
  getContactId(client: Conversation['client']): string | null;
}

export class StubCommunicationProvider implements CommunicationProvider {
  channel: ConversationChannel;
  constructor(channel: ConversationChannel) { this.channel = channel; }
  async sendText(_to: string, _text: string): Promise<string> { console.info(`[${this.channel}] Stub — canal não conectado.`); return crypto.randomUUID(); }
  async sendMedia(_to: string, _attachment: MessageAttachment): Promise<string> { console.info(`[${this.channel}] Stub — canal não conectado.`); return crypto.randomUUID(); }
  async isConnected(): Promise<boolean> { return false; }
  getContactId(client: Conversation['client']): string | null { return client?.whatsapp ?? client?.telefone ?? null; }
}

export const CHANNEL_PROVIDERS: Record<ConversationChannel, CommunicationProvider> = {
  whatsapp: new StubCommunicationProvider('whatsapp'),
  instagram: new StubCommunicationProvider('instagram'),
  messenger: new StubCommunicationProvider('messenger'),
  telegram: new StubCommunicationProvider('telegram'),
  email: new StubCommunicationProvider('email'),
  sms: new StubCommunicationProvider('sms'),
  internal: new StubCommunicationProvider('internal'),
};

export const CHANNEL_LABELS: Record<ConversationChannel, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger',
  telegram: 'Telegram', email: 'E-mail', sms: 'SMS', internal: 'Interno',
};

export const CHANNEL_COLORS: Record<ConversationChannel, string> = {
  whatsapp:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  messenger: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  telegram:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  email:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  sms:       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  internal:  'bg-muted text-muted-foreground',
};

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Aberta', closed: 'Encerrada', waiting: 'Aguardando', archived: 'Arquivada',
};

export const CONVERSATION_CHANNELS: ConversationChannel[] = [
  'whatsapp','instagram','messenger','telegram','email','sms','internal',
];
