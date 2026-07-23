import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FELIPE_PHONE = Deno.env.get("OWNER_PHONE") || "5551997775943";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type MessageType =
  | "text"
  | "image"
  | "pdf"
  | "audio"
  | "video"
  | "location"
  | "contact"
  | "sticker"
  | "system";

interface ExtractedMessage {
  content: string | null;
  type: MessageType;
  attachment: Record<string, unknown> | null;
}

interface EvolutionConfig {
  apiKey: string;
  baseUrl: string;
  instance: string;
}

interface AcaoIA {
  tipo: "ENVIAR_CLIENTE" | "MOVER_CRM" | "IGNORAR" | "CONVERSAR";
  texto?: string;
  etapa?: string;
  motivo?: string;
}

// ─── Extração de mensagem ─────────────────────────────────────────────────────

function extractMessage(message: Record<string, unknown>): ExtractedMessage {
  if (!message) return { content: null, type: "text", attachment: null };
  if (message.conversation || (message.extendedTextMessage as Record<string, unknown>)?.text) {
    return {
      content:
        (message.conversation as string) ||
        ((message.extendedTextMessage as Record<string, unknown>)?.text as string),
      type: "text",
      attachment: null,
    };
  }
  if (message.imageMessage) {
    const img = message.imageMessage as Record<string, unknown>;
    return {
      content: (img.caption as string) || null,
      type: "image",
      attachment: { name: "imagem.jpg", type: "image/jpeg", url: img.url, size: img.fileLength },
    };
  }
  if (message.audioMessage || message.pttMessage) {
    const audio = (message.audioMessage || message.pttMessage) as Record<string, unknown>;
    return {
      content: null,
      type: "audio",
      attachment: { name: "audio.ogg", type: "audio/ogg", url: audio.url, size: audio.fileLength },
    };
  }
  if (message.videoMessage) {
    const vid = message.videoMessage as Record<string, unknown>;
    return {
      content: (vid.caption as string) || null,
      type: "video",
      attachment: { name: "video.mp4", type: "video/mp4", url: vid.url, size: vid.fileLength },
    };
  }
  if (
    message.documentMessage ||
    (message.documentWithCaptionMessage as Record<string, unknown>)?.message
  ) {
    const doc = (
      message.documentMessage ||
      (
        (
          (message.documentWithCaptionMessage as Record<string, unknown>)
            ?.message as Record<string, unknown>
        )?.documentMessage
      )
    ) as Record<string, unknown>;
    return {
      content: (doc?.caption as string) || null,
      type: "pdf",
      attachment: {
        name: doc?.fileName || "documento",
        type: doc?.mimetype,
        url: doc?.url,
        size: doc?.fileLength,
      },
    };
  }
  if (message.stickerMessage) {
    const sticker = message.stickerMessage as Record<string, unknown>;
    return {
      content: null,
      type: "sticker",
      attachment: { name: "sticker.webp", type: "image/webp", url: sticker.url },
    };
  }
  if (message.locationMessage) {
    const loc = message.locationMessage as Record<string, unknown>;
    return {
      content: `📍 ${loc.degreesLatitude},${loc.degreesLongitude}`,
      type: "location",
      attachment: null,
    };
  }
  if (message.contactMessage) {
    const contact = message.contactMessage as Record<string, unknown>;
    return {
      content: `📱 Contato: ${contact.displayName}`,
      type: "contact",
      attachment: null,
    };
  }
  return { content: "[mensagem não suportada]", type: "text", attachment: null };
}

// ─── Utilitários de telefone ──────────────────────────────────────────────────

function normalizePhone(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const variants: string[] = [digits, `+${digits}`];
  if (digits.startsWith("55") && digits.length === 13) {
    const without9 = digits.slice(0, 4) + digits.slice(5);
    variants.push(without9, `+${without9}`);
  }
  return variants;
}

// ─── Evolution API ────────────────────────────────────────────────────────────

async function enviarWhatsApp(config: EvolutionConfig, numero: string, texto: string): Promise<void> {
  const res = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey.trim(), "Content-Type": "application/json" },
    body: JSON.stringify({ number: numero, text: texto, options: { delay: 1200, presence: "composing" } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution ${res.status}: ${body.slice(0, 200)}`);
  }
}

// ─── OpenAI: gera sugestão inicial ───────────────────────────────────────────

async function gerarSugestao(
  mensagem: string,
  clienteNome: string,
  historico: string,
  isPrimeiroContato: boolean,
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!openaiKey) return "";

  const contexto = isPrimeiroContato
    ? `É o primeiro contato deste cliente. Sugira uma resposta de primeiro atendimento como corretor Felipe Paz: breve, natural, sem mencionar assistente. Máximo 2 linhas.`
    : `Sugira uma resposta natural e breve (máximo 2 linhas) como se fosse o corretor Felipe Paz respondendo pelo WhatsApp.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 150,
        messages: [
          { role: "system", content: contexto },
          {
            role: "user",
            content: `${historico ? `Histórico:\n${historico}\n\n` : ""}Cliente ${clienteNome}: "${mensagem}"\n\nSugira uma resposta:`,
          },
        ],
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

async function buscarHistorico(sb: SupabaseClient, conversationId: string): Promise<string> {
  const { data } = await sb
    .from("messages")
    .select("direction, sender, content")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(8);

  return (data ?? [])
    .reverse()
    .map((m) => `${m.direction === "outgoing" ? "Felipe" : m.sender}: ${m.content}`)
    .join("\n");
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

const CRM_ATALHOS: Record<string, string> = {
  contato: "contato_iniciado",
  qualificado: "qualificacao",
  qualificacao: "qualificacao",
  qualificação: "qualificacao",
  followup: "qualificacao",
  visita: "visita_agendada",
  proposta: "proposta",
  financiamento: "negociacao",
  negociacao: "negociacao",
  negociação: "negociacao",
  vendido: "fechado_ganho",
  fechado_ganho: "fechado_ganho",
  perdido: "fechado_perdido",
  fechado_perdido: "fechado_perdido",
};

const CRM_LABELS: Record<string, string> = {
  novo_lead: "Novo Lead",
  contato_iniciado: "Contato Iniciado",
  qualificacao: "Qualificação",
  visita_agendada: "Visita Agendada",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado_ganho: "Vendido ✅",
  fechado_perdido: "Perdido ❌",
};

// ─── Notifica Felipe quando cliente envia mensagem ────────────────────────────

async function processarMensagemIa(params: {
  sb: SupabaseClient;
  clienteId: string;
  conversationId: string;
  mensagem: string;
  telefone: string;
  clienteNome: string;
  ownerId: string | null;
  evolutionConfig: EvolutionConfig;
  isPrimeiroContato: boolean;
}): Promise<void> {
  const {
    sb,
    clienteId,
    conversationId,
    mensagem,
    telefone,
    clienteNome,
    ownerId,
    evolutionConfig,
    isPrimeiroContato,
  } = params;

  try {
    const historico = isPrimeiroContato ? "" : await buscarHistorico(sb, conversationId);
    const sugestao = await gerarSugestao(mensagem, clienteNome, historico, isPrimeiroContato);

    await sb.from("ai_pending_responses").insert({
      owner_id: ownerId,
      conversation_id: conversationId,
      client_id: clienteId,
      client_phone: telefone,
      client_name: clienteNome,
      client_message: mensagem,
      suggested_text: sugestao,
    });

    const notif =
      `📩 *${clienteNome}*${isPrimeiroContato ? " _(novo)_" : ""}:\n"${mensagem}"` +
      (sugestao ? `\n\n💡 *Sugestão:*\n"${sugestao}"` : "");

    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, notif);
    console.log(`[IA] Felipe notificado — ${clienteNome}`);
  } catch (err) {
    console.error("[IA] erro →", err instanceof Error ? err.message : String(err));
  }
}

// ─── Parse da ação estruturada retornada pela IA ─────────────────────────────

function parsearAcaoIA(resposta: string): { texto: string; acao: AcaoIA | null } {
  const match = resposta.match(/<ACAO>([\s\S]*?)<\/ACAO>/);
  if (!match) return { texto: resposta.trim(), acao: null };

  const textoLimpo = resposta.replace(/<ACAO>[\s\S]*?<\/ACAO>/g, "").trim();

  try {
    const acao = JSON.parse(match[1].trim()) as AcaoIA;
    return { texto: textoLimpo, acao };
  } catch {
    return { texto: textoLimpo, acao: null };
  }
}

// ─── Executa ação aprovada ────────────────────────────────────────────────────

async function executarAcao(params: {
  sb: SupabaseClient;
  evolutionConfig: EvolutionConfig;
  pending: Record<string, unknown>;
  acao: AcaoIA;
}): Promise<string> {
  const { sb, evolutionConfig, pending, acao } = params;

  if (acao.tipo === "ENVIAR_CLIENTE") {
    const texto = acao.texto || (pending.suggested_text as string);
    if (!texto) return "⚠️ Nenhum texto definido para enviar.";

    await enviarWhatsApp(evolutionConfig, pending.client_phone as string, texto);

    await sb.from("messages").insert({
      conversation_id: pending.conversation_id,
      direction: "outgoing",
      sender: "Felipe Paz",
      type: "text",
      content: texto,
      status: "delivered",
      sent_at: new Date().toISOString(),
      metadata: { source: "ai-approved", client_id: pending.client_id },
    });

    await sb
      .from("ai_pending_responses")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", pending.id as string);

    return `✅ Enviado para *${pending.client_name}*`;
  }

  if (acao.tipo === "MOVER_CRM") {
    const etapaRaw = (acao.etapa ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const etapa = CRM_ATALHOS[etapaRaw] ?? etapaRaw;

    await sb.from("clients").update({ etapa_funil: etapa }).eq("id", pending.client_id as string);

    await sb
      .from("ai_pending_responses")
      .update({ status: "skipped" })
      .eq("id", pending.id as string);

    return `✅ *${pending.client_name}* → *${CRM_LABELS[etapa] ?? etapa}*`;
  }

  if (acao.tipo === "IGNORAR") {
    await sb
      .from("ai_pending_responses")
      .update({ status: "skipped" })
      .eq("id", pending.id as string);

    return `⏭️ Mensagem de *${pending.client_name}* ignorada.`;
  }

  return "";
}

// ─── Conversa natural com Felipe (state machine via OpenAI) ──────────────────

async function conversarComFelipe(params: {
  sb: SupabaseClient;
  mensagem: string;
  evolutionConfig: EvolutionConfig;
}): Promise<void> {
  const { sb, mensagem, evolutionConfig } = params;

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!openaiKey) {
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ OpenAI não configurada.");
    return;
  }

  const { data: pending } = await sb
    .from("ai_pending_responses")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const contextoCliente = pending
    ? `
ESTADO: AGUARDANDO_APROVAÇÃO

Cliente aguardando decisão:
• Nome: ${pending.client_name}
• Mensagem dele: "${pending.client_message}"
• Sugestão de resposta: "${pending.suggested_text}"

REGRA CRÍTICA: Quando há um cliente pendente, seja GENEROSO ao interpretar aprovação.
Dúvida → prefira ENVIAR_CLIENTE a CONVERSAR.
NUNCA peça confirmação dupla — se Felipe disse para enviar, execute imediatamente.

APROVAÇÃO DA SUGESTÃO (use o texto da sugestão): "sim", "ok", "pode", "envia", "manda", "vai", "confirmado", "perfeito", "tá bom", "isso", "isso mesmo", "pode enviar", "aprovo", "envia isso", "manda isso", "responder cliente", "responde", "responder", "responde pra ele", "responde ao cliente"

TEXTO PERSONALIZADO (use o texto que Felipe escreveu após os dois-pontos ou após "fala/manda/envia/responde pro cliente"): "fala pra ele: X", "manda: X", "envia: X", "responde pro cliente X: Y", "fala: X", "di pra ele: X"

MOVER NO CRM: "move pra X", "muda pra X", "coloca em X", "passa pra X", "etapa X"

IGNORAR: "ignora", "deixa", "não responde", "depois", "skip", "pula"

APENAS CONVERSANDO (pergunta sobre estratégia, análise, informação): tipo CONVERSAR`
    : `
ESTADO: OBSERVANDO — Nenhum cliente aguardando resposta no momento.
Felipe pode estar pedindo estratégias, informações ou discutindo negociações. → tipo CONVERSAR`;

  const systemPrompt =
    `Você é a assistente operacional do Felipe Paz, corretor de imóveis autônomo. ` +
    `Você conversa EXCLUSIVAMENTE com o Felipe — nunca com clientes. ` +
    `REGRAS ABSOLUTAS: (1) NUNCA envie mensagem ao cliente sem aprovação explícita. ` +
    `(2) NUNCA altere o CRM sem aprovação explícita. ` +
    `Seja natural, objetiva e útil. Responda sempre em português brasileiro. ` +
    `Você é especialista em vendas imobiliárias. ` +
    contextoCliente +
    `

OBRIGATÓRIO — inclua ao final de TODA resposta exatamente este bloco (sem exceções):

<ACAO>
{
  "tipo": "ENVIAR_CLIENTE",
  "texto": "texto exato a enviar ao cliente",
  "motivo": "uma linha"
}
</ACAO>

ou

<ACAO>
{
  "tipo": "MOVER_CRM",
  "etapa": "etapa em português (contato, qualificado, visita, proposta, financiamento, vendido, perdido)",
  "motivo": "uma linha"
}
</ACAO>

ou

<ACAO>
{
  "tipo": "IGNORAR",
  "motivo": "uma linha"
}
</ACAO>

ou

<ACAO>
{
  "tipo": "CONVERSAR",
  "motivo": "uma linha"
}
</ACAO>`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mensagem },
        ],
      }),
    });

    if (!res.ok) {
      await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ Erro ao processar sua mensagem.");
      return;
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const respostaCompleta = json.choices?.[0]?.message?.content?.trim() ?? "";

    const { texto, acao } = parsearAcaoIA(respostaCompleta);

    if (texto) {
      await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, texto);
    }

    if (acao && acao.tipo !== "CONVERSAR" && pending) {
      const resultado = await executarAcao({
        sb,
        evolutionConfig,
        pending: pending as unknown as Record<string, unknown>,
        acao,
      });
      if (resultado) {
        await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, resultado);
      }
    }
  } catch (err) {
    console.error("[CHAT] erro →", err instanceof Error ? err.message : String(err));
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ Erro na conversa.");
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const rawEvent = ((payload.event as string) ?? "").toLowerCase().replace(/_/g, ".");
  if (rawEvent !== "messages.upsert") return new Response("OK", { status: 200 });

  const data = payload.data as Record<string, unknown>;
  if (!data) return new Response("OK", { status: 200 });

  const key = data.key as Record<string, unknown>;
  const remoteJid = key?.remoteJid as string;
  if (!remoteJid || remoteJid.endsWith("@g.us")) return new Response("OK", { status: 200 });

  const instanceName = payload.instance as string;
  const rawPhone = remoteJid.split("@")[0];
  const pushName = (data.pushName as string) || rawPhone;
  const messageTimestamp = data.messageTimestamp as number;
  const message = data.message as Record<string, unknown>;
  const { content, type, attachment } = extractMessage(message || {});

  const { data: integration } = await supabase
    .from("integrations")
    .select("owner_id, configuration")
    .eq("provider", "whatsapp")
    .eq("status", "connected")
    .maybeSingle();
  if (!integration) return new Response("No integration", { status: 200 });

  const config = integration.configuration as Record<string, unknown>;
  if (config?.instance_name && config.instance_name !== instanceName) {
    return new Response("Instance mismatch", { status: 200 });
  }

  let ownerId = integration.owner_id as string | null;
  if (!ownerId) {
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1 });
    ownerId = authData?.users?.[0]?.id ?? null;
  }

  const evolutionConfig: EvolutionConfig = {
    apiKey: (config?.api_key as string) ?? "",
    baseUrl: ((config?.base_url as string) ?? "https://evolution-api-production-448e.up.railway.app").replace(/\/$/, ""),
    instance: (config?.instance_name as string) ?? "prime-crm",
  };

  // ─── Self-chat: Felipe conversando com a IA ──────────────────────────────────
  const felipeVariants = normalizePhone(FELIPE_PHONE).map((v) => v.replace(/\D/g, ""));
  const isSelfChat = key?.fromMe === true && felipeVariants.includes(rawPhone.replace(/\D/g, ""));

  if (isSelfChat) {
    console.log(`[WEBHOOK] self-chat Felipe: "${content}"`);
    if (content) {
      conversarComFelipe({ sb: supabase, mensagem: content, evolutionConfig }).catch((err) =>
        console.error("[WEBHOOK] Erro na conversa:", err),
      );
    }
    return new Response("OK", { status: 200 });
  }

  if (key?.fromMe === true) return new Response("OK", { status: 200 });

  // ─── Fluxo de cliente ─────────────────────────────────────────────────────
  const phoneVariants = normalizePhone(rawPhone);

  const { data: clientData } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .or(phoneVariants.flatMap((p) => [`telefone.eq.${p}`, `whatsapp.eq.${p}`]).join(","))
    .maybeSingle();

  let clientId: string;

  if (clientData) {
    clientId = clientData.id;
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from("clients")
      .insert({
        owner_id: ownerId,
        nome: pushName,
        whatsapp: `+${rawPhone}`,
        origem_lead: "whatsapp",
        etapa_funil: "novo_lead",
        tags: ["lead_inbound"],
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      console.error("[WEBHOOK] Erro ao criar cliente:", clientErr?.message);
      return new Response("Error creating client", { status: 500 });
    }
    clientId = newClient.id;
    console.log(`[WEBHOOK] novo cliente: ${clientId}`);
  }

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("channel", "whatsapp")
    .eq("status", "open")
    .is("deleted_at", null)
    .maybeSingle();

  let conversationId: string;
  const isPrimeiroContato = !existingConv;

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        owner_id: ownerId,
        client_id: clientId,
        channel: "whatsapp",
        status: "open",
        metadata: { remote_jid: remoteJid },
      })
      .select("id")
      .single();
    if (convErr || !newConv) {
      console.error("[WEBHOOK] Erro ao criar conversa:", convErr?.message);
      return new Response("Error creating conversation", { status: 500 });
    }
    conversationId = newConv.id;
    console.log(`[WEBHOOK] nova conversa: ${conversationId}`);
  }

  const sentAt = messageTimestamp
    ? new Date(messageTimestamp * 1000).toISOString()
    : new Date().toISOString();

  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "incoming",
    sender: pushName,
    type,
    content,
    attachment,
    status: "delivered",
    sent_at: sentAt,
    metadata: { provider_msg_id: key?.id, remote_jid: remoteJid },
  });
  if (msgErr) {
    console.error("[WEBHOOK] Erro ao salvar mensagem:", msgErr.message);
    return new Response("Error saving message", { status: 500 });
  }

  console.log(`[WEBHOOK] mensagem salva | ${pushName} | ${content?.slice(0, 60)}`);

  // Notifica Felipe — NÃO envia ao cliente automaticamente
  if (content && evolutionConfig.apiKey) {
    processarMensagemIa({
      sb: supabase,
      clienteId: clientId,
      conversationId,
      mensagem: content,
      telefone: rawPhone,
      clienteNome: pushName,
      ownerId,
      evolutionConfig,
      isPrimeiroContato,
    }).catch((err) => console.error("[WEBHOOK] Erro IA:", err));
  }

  return new Response("OK", { status: 200 });
});
