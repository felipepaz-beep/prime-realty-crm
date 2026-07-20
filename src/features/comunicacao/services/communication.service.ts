import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from '@/features/clientes/services/timeline.service';
import { IntegrationService } from '@/features/configuracoes/services/settings.service';
import { EvolutionApiProvider } from './evolution-api.provider';
import type { EvolutionApiConfig } from './evolution-api.provider';
import type { Conversation, ConversationChannel, ConversationFiltros, ConversationInsert, ConversationPaginadas, Message, MessageInsert, CommunicationProvider } from '../types';
import { StubCommunicationProvider } from '../types';

const CONV_TABLE = 'conversations';
const MSG_TABLE = 'messages';
const PAGE_SIZE = 30;

async function getProvider(channel: ConversationChannel): Promise<CommunicationProvider> {
  if (channel === 'whatsapp') {
    try {
      const integration = await IntegrationService.buscarProvider('whatsapp');
      if (integration?.status === 'connected' && integration.configuration?.base_url) {
        return new EvolutionApiProvider(integration.configuration as unknown as EvolutionApiConfig);
      }
    } catch { /* fall through to stub */ }
  }
  return new StubCommunicationProvider(channel);
}

export async function listarConversas(filtros: ConversationFiltros = {}): Promise<ConversationPaginadas> {
  const { channel, status, busca, pagina = 1, porPagina = 20 } = filtros;
  let query = supabase
    .from(CONV_TABLE)
    .select('*, client:clients(nome,telefone,whatsapp,email,etapa_funil,prioridade,proximo_followup,ultimo_contato,tags)', { count: 'exact' })
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (channel) query = query.eq('channel', channel);
  if (status)  query = query.eq('status', status);
  if (busca)   query = query.ilike('last_message', `%${busca}%`);
  const inicio = (pagina - 1) * porPagina;
  const { data, error, count } = await query.range(inicio, inicio + porPagina - 1);
  if (error) throw error;
  return { data: (data ?? []) as Conversation[], total: count ?? 0, pagina, porPagina };
}

export async function buscarConversaPorId(id: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from(CONV_TABLE)
    .select('*, client:clients(nome,telefone,whatsapp,email,etapa_funil,prioridade,proximo_followup,ultimo_contato,tags)')
    .eq('id', id).is('deleted_at', null).single();
  if (error) throw error;
  return data as Conversation;
}

export async function iniciarConversa(payload: ConversationInsert): Promise<Conversation> {
  const { data: sessionData } = await supabase.auth.getUser();
  const ownerId = sessionData.user?.id;
  if (!ownerId) throw new Error('Usuário não autenticado.');
  const { data: existing } = await supabase.from(CONV_TABLE).select('id')
    .eq('client_id', payload.client_id).eq('channel', payload.channel ?? 'whatsapp')
    .eq('status', 'open').is('deleted_at', null).maybeSingle();
  if (existing) return buscarConversaPorId(existing.id);
  const { data, error } = await supabase.from(CONV_TABLE)
    .insert({ ...payload, owner_id: ownerId } as never)
    .select('*, client:clients(nome,telefone,whatsapp,email,etapa_funil,prioridade,proximo_followup,ultimo_contato,tags)')
    .single();
  if (error) throw error;
  const conversa = data as Conversation;
  TimelineService.whatsappEnviado(payload.client_id, `Conversa iniciada via ${payload.channel ?? 'whatsapp'}`);
  return conversa;
}

export async function encerrarConversa(id: string): Promise<Conversation> {
  const { data, error } = await supabase.from(CONV_TABLE)
    .update({ status: 'closed' } as never).eq('id', id)
    .select('*, client:clients(nome,telefone,whatsapp,email,etapa_funil,prioridade,proximo_followup,ultimo_contato,tags)')
    .single();
  if (error) throw error;
  const conversa = data as Conversation;
  if (conversa.client_id) TimelineService.eventoCustomizado(conversa.client_id, 'Conversa encerrada', `Canal: ${conversa.channel}`, 'comunicacao');
  return conversa;
}

export async function marcarComoLida(id: string): Promise<void> {
  const { error } = await supabase.from(CONV_TABLE).update({ unread_count: 0 } as never).eq('id', id);
  if (error) throw error;
}

export async function listarMensagens(conversationId: string, cursor?: string): Promise<{ messages: Message[]; hasMore: boolean }> {
  let query = supabase.from(MSG_TABLE).select('*')
    .eq('conversation_id', conversationId).is('deleted_at', null)
    .order('sent_at', { ascending: false }).limit(PAGE_SIZE + 1);
  if (cursor) query = query.lt('sent_at', cursor);
  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []) as Message[];
  const hasMore = items.length > PAGE_SIZE;
  if (hasMore) items.pop();
  return { messages: items.reverse(), hasMore };
}

export async function enviarMensagem(payload: MessageInsert & { client_id: string }): Promise<Message> {
  const { client_id, ...msgPayload } = payload;
  const { data, error } = await supabase.from(MSG_TABLE)
    .insert({ ...msgPayload, direction: 'outgoing' } as never).select('*').single();
  if (error) throw error;
  const msg = data as Message;
  try {
    const conversa = await buscarConversaPorId(payload.conversation_id);
    const provider = await getProvider(conversa.channel);
    const contactId = provider.getContactId(conversa.client ?? null);
    if (contactId && (await provider.isConnected())) {
      const externalId = msg.type === 'text' && msg.content
        ? await provider.sendText(contactId, msg.content)
        : msg.attachment ? await provider.sendMedia(contactId, msg.attachment) : '';
      if (externalId) {
        await supabase.from(MSG_TABLE).update({ metadata: { ...msg.metadata, provider_msg_id: externalId }, status: 'sent' } as never).eq('id', msg.id);
      }
    }
  } catch (e) { console.warn('[CommunicationService] Falha no provider:', e); }
  if (msg.type === 'text') TimelineService.whatsappEnviado(client_id, msg.content ?? undefined);
  else if (msg.attachment) TimelineService.whatsappEnviado(client_id, `Arquivo enviado: ${msg.attachment.name}`);
  return msg;
}

export async function receberMensagem(payload: MessageInsert & { client_id: string }): Promise<Message> {
  const { client_id, ...msgPayload } = payload;
  const { data, error } = await supabase.from(MSG_TABLE)
    .insert({ ...msgPayload, direction: 'incoming' } as never).select('*').single();
  if (error) throw error;
  const msg = data as Message;
  if (msg.type === 'text') TimelineService.whatsappRecebido(client_id, msg.content ?? undefined);
  else if (msg.attachment) TimelineService.whatsappRecebido(client_id, `Arquivo recebido: ${msg.attachment.name}`);
  return msg;
}

export async function removerMensagem(id: string): Promise<void> {
  const { error } = await supabase.from(MSG_TABLE).update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) throw error;
}
