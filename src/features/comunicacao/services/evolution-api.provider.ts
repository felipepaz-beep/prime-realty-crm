import type { CommunicationProvider, ConversationChannel, MessageAttachment, Conversation } from '../types';

export interface EvolutionApiConfig {
  base_url: string;
  api_key: string;
  instance_name: string;
}

export class EvolutionApiProvider implements CommunicationProvider {
  channel: ConversationChannel = 'whatsapp';

  constructor(private config: EvolutionApiConfig) {}

  private get headers() {
    return { 'Content-Type': 'application/json', apikey: this.config.api_key };
  }

  private get base() {
    return this.config.base_url.replace(/\/$/, '');
  }

  private formatNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  }

  async sendText(to: string, text: string): Promise<string> {
    const res = await fetch(`${this.base}/message/sendText/${this.config.instance_name}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ number: this.formatNumber(to), text }),
    });
    if (!res.ok) throw new Error(`Evolution API sendText: ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    const key = json.key as Record<string, unknown> | undefined;
    return (key?.id as string) ?? (json.messageId as string) ?? '';
  }

  async sendMedia(to: string, attachment: MessageAttachment): Promise<string> {
    const mime = attachment.mime_type;
    const mediatype = mime.startsWith('image/') ? 'image'
      : mime.startsWith('video/') ? 'video'
      : mime.startsWith('audio/') ? 'audio'
      : 'document';
    const res = await fetch(`${this.base}/message/sendMedia/${this.config.instance_name}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        number: this.formatNumber(to),
        mediatype,
        media: attachment.url,
        fileName: attachment.name,
      }),
    });
    if (!res.ok) throw new Error(`Evolution API sendMedia: ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    const key = json.key as Record<string, unknown> | undefined;
    return (key?.id as string) ?? (json.messageId as string) ?? '';
  }

  async isConnected(): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.base}/instance/connectionState/${this.config.instance_name}`,
        { headers: { apikey: this.config.api_key } },
      );
      if (!res.ok) return false;
      const json = await res.json() as { instance?: { state?: string } };
      return json.instance?.state === 'open';
    } catch {
      return false;
    }
  }

  getContactId(client: Conversation['client']): string | null {
    return client?.whatsapp ?? client?.telefone ?? null;
  }
}
