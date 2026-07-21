// src/features/ia/services/whatsapp-agent.ts
// Agente de IA para WhatsApp — lê conversas, analisa, sugere respostas e alimenta o CRM

import { supabase } from '@/integrations/supabase/client'
import { TimelineService } from '@/features/clientes/services/timeline.service'
import { IntegrationService } from '@/features/configuracoes/services/settings.service'

// ─── Configuração ────────────────────────────────────────────────────────────

const HORAS_SEM_RESPOSTA = 2    // considera pendente após 2h sem resposta
const DIAS_SEM_CONTATO = 7     // considera para follow-up após 7 dias

const EVOLUTION_URL_FALLBACK = 'https://evolution-api-production-448e.up.railway.app'
const INSTANCE_FALLBACK = 'prime-crm'

interface EvolutionConfig {
  apiKey: string
  baseUrl: string
  instance: string
}

async function getEvolutionConfig(): Promise<EvolutionConfig> {
  const integration = await IntegrationService.buscarProvider('whatsapp')
  const cfg = (integration?.configuration ?? {}) as Record<string, string>
  return {
    apiKey: cfg.api_key ?? '',
    baseUrl: (cfg.base_url ?? EVOLUTION_URL_FALLBACK).replace(/\/$/, ''),
    instance: cfg.instance_name ?? INSTANCE_FALLBACK,
  }
}

async function getAnthropicKey(): Promise<string> {
  const integration = await IntegrationService.buscarProvider('claude')
  const cfg = (integration?.configuration ?? {}) as Record<string, string>
  return cfg.anthropic_api_key ?? cfg.api_key ?? ''
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PendingChat {
  chatId: string
  contactName: string
  contactPhone: string
  lastMessage: string
  lastMessageTime: Date
  hoursWaiting: number
  messages: ChatMessage[]
}

export interface ChatMessage {
  fromMe: boolean
  body: string
  timestamp: Date
}

export interface AgentSuggestion {
  chatId: string
  contactName: string
  contactPhone: string
  hoursWaiting: number
  suggestedReply: string
  context: string
}

// ─── 1. Buscar conversas pendentes ───────────────────────────────────────────

export async function fetchPendingChats(): Promise<PendingChat[]> {
  const { apiKey, baseUrl, instance } = await getEvolutionConfig()
  if (!apiKey) throw new Error('Chave da Evolution API não configurada.')

  // Busca todos os chats da instância (Evolution API v2 usa POST)
  const res = await fetch(`${baseUrl}/chat/findChats/${instance}`, {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!res.ok) throw new Error(`Evolution API erro: ${res.status}`)

  const chats = await res.json()
  const pending: PendingChat[] = []
  const agora = new Date()

  // filtra chats sem id válido e limita a 50 chats por rodada
  const chatsParaAnalisar = chats
    .filter((c: any) => c.id && c.id !== 'null')
    .slice(0, 50)

  for (const chat of chatsParaAnalisar) {
    // Ignora grupos
    if (chat.id?.includes('@g.us')) continue

    // Busca últimas 20 mensagens do chat
    const msgRes = await fetch(
      `${baseUrl}/chat/findMessages/${instance}`,
      {
        method: 'POST',
        headers: { apikey: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid: chat.id } }, limit: 20 })
      }
    )

    if (!msgRes.ok) continue

    const msgData = await msgRes.json()
    const messages: ChatMessage[] = (msgData.messages?.records ?? []).map((m: any) => ({
      fromMe: m.key?.fromMe ?? false,
      body: m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? '',
      timestamp: new Date((m.messageTimestamp ?? 0) * 1000)
    })).filter((m: ChatMessage) => m.body)

    if (!messages.length) continue

    // Ordena por data crescente
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    const lastMsg = messages[messages.length - 1]

    // Só é pendente se a última mensagem NÃO foi minha
    if (lastMsg.fromMe) continue

    const hoursWaiting = (agora.getTime() - lastMsg.timestamp.getTime()) / 1000 / 3600

    if (hoursWaiting < HORAS_SEM_RESPOSTA) continue

    const phone = chat.id.replace('@s.whatsapp.net', '').replace('@c.us', '')

    pending.push({
      chatId: chat.id,
      contactName: chat.name ?? chat.pushName ?? phone,
      contactPhone: phone,
      lastMessage: lastMsg.body,
      lastMessageTime: lastMsg.timestamp,
      hoursWaiting: Math.round(hoursWaiting * 10) / 10,
      messages
    })
  }

  return pending
}

// ─── 2. Analisar conversa e sugerir resposta ─────────────────────────────────

export async function analyzeConversation(chat: PendingChat): Promise<string> {
  const anthropicKey = await getAnthropicKey()
  if (!anthropicKey) throw new Error('Chave da Anthropic não configurada.')

  // Monta histórico legível
  const historico = chat.messages
    .slice(-10) // últimas 10 mensagens
    .map(m => `${m.fromMe ? 'EU' : chat.contactName}: ${m.body}`)
    .join('\n')

  const prompt = `Você é um assistente especializado em ajudar corretores de imóveis a responder clientes pelo WhatsApp.

CONTEXTO:
- Corretor: Felipe Santos
- Cliente: ${chat.contactName} (${chat.contactPhone})
- Tempo sem resposta: ${chat.hoursWaiting} horas
- Última mensagem do cliente: "${chat.lastMessage}"

HISTÓRICO DA CONVERSA:
${historico}

TAREFA:
Sugira UMA resposta profissional, natural e personalizada para o corretor enviar agora.
A resposta deve:
- Ser em português brasileiro informal mas profissional
- Retomar o assunto da última mensagem do cliente
- Ser curta (máximo 3 linhas)
- Soar como o corretor escrevendo, não como robô
- Se for sobre imóvel, mencionar que pode ajudar a encontrar opções

Responda APENAS com o texto da mensagem, sem explicações.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!res.ok) throw new Error(`Anthropic API erro: ${res.status}`)

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── 3. Sincronizar contato com CRM ──────────────────────────────────────────

export async function syncContactToCRM(chat: PendingChat): Promise<string | null> {
  // Verifica se já existe pelo telefone
  const { data: existing } = await supabase
    .from('clients')
    .select('id, nome, telefone')
    .or(`telefone.eq.${chat.contactPhone},whatsapp.eq.${chat.contactPhone}`)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return existing.id

  // Cria novo cliente
  const { data: sessionData } = await supabase.auth.getUser()
  const ownerId = sessionData.user?.id
  if (!ownerId) return null

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      owner_id: ownerId,
      nome: chat.contactName,
      telefone: chat.contactPhone,
      origem_lead: 'WhatsApp',
      status: 'ativo',
      etapa_funil: 'novo_lead',
      prioridade: 'media',
      temperatura: 'morno',
      observacoes: `Contato importado automaticamente via agente de IA em ${new Date().toLocaleDateString('pt-BR')}`
    } as never)
    .select('id')
    .single()

  if (error) {
    console.error('Erro ao criar cliente:', error)
    return null
  }

  return created?.id ?? null
}

// ─── 4. Registrar interação na Timeline ──────────────────────────────────────

export async function logInteractionToTimeline(
  clientId: string,
  chat: PendingChat,
  suggestion: string
) {
  await TimelineService.agenteIADetectado(
    clientId,
    `Cliente aguarda resposta há ${chat.hoursWaiting}h.\n\nÚltima mensagem: "${chat.lastMessage}"\n\nSugestão do agente: "${suggestion}"`,
    {
      chatId: chat.chatId,
      hoursWaiting: chat.hoursWaiting,
      suggestedReply: suggestion,
      source: 'whatsapp-agent'
    }
  )
}

// ─── 5. Identificar contatos para follow-up ──────────────────────────────────

export async function fetchFollowUpCandidates() {
  const diasAtras = new Date()
  diasAtras.setDate(diasAtras.getDate() - DIAS_SEM_CONTATO)

  const { data: clients } = await supabase
    .from('clients')
    .select('id, nome, telefone, status, updated_at')
    .in('status', ['ativo', 'inativo'])
    .lt('updated_at', diasAtras.toISOString())
    .is('deleted_at', null)

  return clients ?? []
}

export async function generateFollowUpMessage(
  clientName: string,
  daysSinceContact: number
): Promise<string> {
  const anthropicKey = await getAnthropicKey()
  if (!anthropicKey) {
    return `Olá ${clientName}! Tudo bem? Estou à disposição caso queira retomar a busca pelo imóvel ideal. 😊`
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Você é um corretor de imóveis chamado Felipe Santos. 
Crie uma mensagem de follow-up para o cliente "${clientName}" que não teve contato há ${daysSinceContact} dias.
A mensagem deve ser curta (2 linhas), natural, sem ser invasiva, e abrir espaço para retomar a conversa sobre imóveis.
Responda APENAS com o texto da mensagem.`
      }]
    })
  })

  if (!res.ok) {
    return `Olá ${clientName}! Tudo bem? Estou à disposição caso queira retomar a busca pelo imóvel ideal. 😊`
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? `Olá ${clientName}! Tudo bem? Estou à disposição caso queira retomar a busca pelo imóvel ideal. 😊`
}

// ─── 6. Função principal — orquestra tudo ────────────────────────────────────

export interface AgentRunResult {
  pendingChats: AgentSuggestion[]
  followUpCandidates: Array<{ name: string; phone: string; daysSinceContact: number; message: string }>
  newClientsCreated: number
  errors: string[]
}

export async function runWhatsAppAgent(): Promise<AgentRunResult> {
  const result: AgentRunResult = {
    pendingChats: [],
    followUpCandidates: [],
    newClientsCreated: 0,
    errors: []
  }

  // 1. Busca conversas pendentes
  let pendingChats: PendingChat[] = []
  try {
    pendingChats = await fetchPendingChats()
  } catch (e: any) {
    result.errors.push(`Erro ao buscar chats: ${e.message}`)
  }

  // 2. Para cada pendente: analisa, sincroniza CRM, registra timeline
  for (const chat of pendingChats) {
    try {
      const [suggestion, clientId] = await Promise.all([
        analyzeConversation(chat),
        syncContactToCRM(chat)
      ])

      if (clientId) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .or(`telefone.eq.${chat.contactPhone},whatsapp.eq.${chat.contactPhone}`)
          .is('deleted_at', null)
          .maybeSingle()

        if (!existing) result.newClientsCreated++

        await logInteractionToTimeline(clientId, chat, suggestion)
      }

      result.pendingChats.push({
        chatId: chat.chatId,
        contactName: chat.contactName,
        contactPhone: chat.contactPhone,
        hoursWaiting: chat.hoursWaiting,
        suggestedReply: suggestion,
        context: chat.lastMessage
      })
    } catch (e: any) {
      result.errors.push(`Erro em ${chat.contactName}: ${e.message}`)
    }
  }

  // 3. Candidatos para follow-up
  try {
    const candidates = await fetchFollowUpCandidates()
    const agora = new Date()

    for (const client of candidates.slice(0, 10)) { // máximo 10 por vez
      const days = Math.floor(
        (agora.getTime() - new Date(client.updated_at).getTime()) / 1000 / 3600 / 24
      )
      const message = await generateFollowUpMessage(client.nome, days)
      result.followUpCandidates.push({
        name: client.nome,
        phone: client.telefone ?? '',
        daysSinceContact: days,
        message
      })
    }
  } catch (e: any) {
    result.errors.push(`Erro no follow-up: ${e.message}`)
  }

  return result
}
