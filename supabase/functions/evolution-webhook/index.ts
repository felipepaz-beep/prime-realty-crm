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

interface PendingRecord {
  id: string;
  client_id: string;
  client_phone: string;
  client_name: string;
  client_message: string;
  suggested_text: string;
  conversation_id: string;
  created_at: string;
}

interface AcaoIA {
  tipo: "ENVIAR_CLIENTE" | "MOVER_CRM" | "IGNORAR" | "CONVERSAR";
  texto?: string;
  etapa?: string;
  client_name?: string;
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
        (message.documentWithCaptionMessage as Record<string, unknown>)
          ?.message as Record<string, unknown>
      )?.documentMessage
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

async function enviarWhatsApp(
  config: EvolutionConfig,
  numero: string,
  texto: string,
): Promise<void> {
  const res = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey.trim(), "Content-Type": "application/json" },
    body: JSON.stringify({
      number: numero,
      text: texto,
      options: { delay: 1200, presence: "composing" },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution ${res.status}: ${body.slice(0, 200)}`);
  }
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

// ─── Busca histórico da conversa com o cliente ────────────────────────────────

async function buscarHistoricoConversa(
  sb: SupabaseClient,
  conversationId: string,
  limite = 10,
): Promise<string> {
  const { data } = await sb
    .from("messages")
    .select("direction, sender, content, sent_at")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(limite);

  return (data ?? [])
    .reverse()
    .map((m) => `${m.direction === "outgoing" ? "Felipe" : m.sender}: ${m.content}`)
    .join("\n");
}

// ─── Conversa PAZ: histórico Felipe ↔ PAZ (para contexto entre mensagens) ────

async function buscarOuCriarConversaPaz(
  sb: SupabaseClient,
  ownerId: string,
): Promise<string | null> {
  try {
    // Procura cliente-placeholder PAZ (inclusive soft-deleted)
    const { data: pazClient } = await sb
      .from("clients")
      .select("id")
      .eq("owner_id", ownerId)
      .contains("tags", ["_paz_system_"])
      .limit(1)
      .maybeSingle();

    let pazClientId: string;

    if (pazClient) {
      pazClientId = pazClient.id;
    } else {
      const { data: newClient } = await sb
        .from("clients")
        .insert({
          owner_id: ownerId,
          nome: "PAZ (Sistema)",
          etapa_funil: "novo_lead",
          tags: ["_paz_system_"],
        })
        .select("id")
        .single();
      if (!newClient) return null;
      pazClientId = newClient.id;
      // Soft-delete para não aparecer na lista de clientes do CRM
      await sb
        .from("clients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", pazClientId);
    }

    // Procura conversa PAZ existente
    const { data: existingConv } = await sb
      .from("conversations")
      .select("id")
      .eq("client_id", pazClientId)
      .maybeSingle();

    if (existingConv) return existingConv.id;

    // Cria conversa PAZ
    const { data: newConv } = await sb
      .from("conversations")
      .insert({
        owner_id: ownerId,
        client_id: pazClientId,
        channel: "whatsapp",
        status: "open",
        metadata: { paz_self_chat: true },
      })
      .select("id")
      .single();

    return newConv?.id ?? null;
  } catch (err) {
    console.warn("[PAZ] Erro ao criar conversa histórico:", err);
    return null;
  }
}

async function buscarHistoricoPazMessages(
  sb: SupabaseClient,
  conversationId: string,
  limite = 10,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await sb
    .from("messages")
    .select("direction, content")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(limite);

  return (data ?? [])
    .reverse()
    .map((m) => ({
      role: (m.direction === "incoming" ? "user" : "assistant") as "user" | "assistant",
      content: (m.content ?? "") as string,
    }))
    .filter((m) => m.content.length > 0);
}

// ─── Gera sugestão de resposta ────────────────────────────────────────────────

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

// ─── Notifica Felipe quando cliente manda mensagem ───────────────────────────

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
    const historico = isPrimeiroContato
      ? ""
      : await buscarHistoricoConversa(sb, conversationId, 8);
    const sugestao = await gerarSugestao(mensagem, clienteNome, historico, isPrimeiroContato);

    // Busca etapa atual do cliente
    const { data: clienteInfo } = await sb
      .from("clients")
      .select("etapa_funil")
      .eq("id", clienteId)
      .single();
    const etapaLabel = CRM_LABELS[clienteInfo?.etapa_funil ?? ""] ?? "Novo Lead";

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
      `📩 *${clienteNome}* _(${isPrimeiroContato ? "novo" : etapaLabel})_:\n"${mensagem}"` +
      (sugestao ? `\n\n💡 *PAZ sugere:*\n"${sugestao}"` : "");

    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, notif);
    console.log(`[PAZ] Felipe notificado — ${clienteNome}`);
  } catch (err) {
    console.error("[PAZ] erro notificação →", err instanceof Error ? err.message : String(err));
  }
}

// ─── Parse da ação estruturada ────────────────────────────────────────────────

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

// ─── Executa ação ─────────────────────────────────────────────────────────────

async function executarAcao(params: {
  sb: SupabaseClient;
  evolutionConfig: EvolutionConfig;
  allPending: PendingRecord[];
  acao: AcaoIA;
}): Promise<string> {
  const { sb, evolutionConfig, allPending, acao } = params;

  // Seleciona o cliente alvo (por nome se especificado, senão o mais recente)
  let pending = allPending[0];
  if (acao.client_name && allPending.length > 1) {
    const match = allPending.find((p) =>
      p.client_name.toLowerCase().includes(acao.client_name!.toLowerCase()),
    );
    if (match) pending = match;
  }

  if (!pending) return "⚠️ Nenhum cliente pendente para executar ação.";

  if (acao.tipo === "ENVIAR_CLIENTE") {
    const texto = acao.texto || pending.suggested_text;
    if (!texto) return "⚠️ Nenhum texto para enviar.";

    await enviarWhatsApp(evolutionConfig, pending.client_phone, texto);

    await sb.from("messages").insert({
      conversation_id: pending.conversation_id,
      direction: "outgoing",
      sender: "Felipe Paz",
      type: "text",
      content: texto,
      status: "delivered",
      sent_at: new Date().toISOString(),
      metadata: { source: "paz-approved", client_id: pending.client_id },
    });

    await sb
      .from("ai_pending_responses")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", pending.id);

    return `✅ Enviado para *${pending.client_name}*`;
  }

  if (acao.tipo === "MOVER_CRM") {
    const etapaRaw = (acao.etapa ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const etapa = CRM_ATALHOS[etapaRaw] ?? etapaRaw;

    await sb.from("clients").update({ etapa_funil: etapa }).eq("id", pending.client_id);
    await sb.from("ai_pending_responses").update({ status: "skipped" }).eq("id", pending.id);

    return `✅ *${pending.client_name}* → *${CRM_LABELS[etapa] ?? etapa}*`;
  }

  if (acao.tipo === "IGNORAR") {
    await sb.from("ai_pending_responses").update({ status: "skipped" }).eq("id", pending.id);
    return `⏭️ *${pending.client_name}* ignorado.`;
  }

  return "";
}

// ─── PAZ: assistente de vendas do Felipe ─────────────────────────────────────

async function paz(params: {
  sb: SupabaseClient;
  mensagem: string;
  evolutionConfig: EvolutionConfig;
  ownerId: string | null;
}): Promise<void> {
  const { sb, mensagem, evolutionConfig, ownerId } = params;

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!openaiKey) {
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ OpenAI não configurada.");
    return;
  }

  // Histórico de conversa Felipe ↔ PAZ (memória entre mensagens)
  let pazConversationId: string | null = null;
  let historicoFelipePaz: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (ownerId) {
    pazConversationId = await buscarOuCriarConversaPaz(sb, ownerId);
    if (pazConversationId) {
      historicoFelipePaz = await buscarHistoricoPazMessages(sb, pazConversationId, 10);
    }
  }

  // Busca todos os clientes pendentes (até 5)
  const { data: allPendingRaw } = await sb
    .from("ai_pending_responses")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  const allPending = (allPendingRaw ?? []) as PendingRecord[];

  // Monta contexto de clientes pendentes
  let contextoPendentes = "";
  if (allPending.length === 0) {
    contextoPendentes = "\n\n📭 Nenhum cliente aguardando resposta no momento.";
  } else if (allPending.length === 1) {
    const p = allPending[0];
    contextoPendentes =
      `\n\n📬 *Cliente aguardando decisão:*\n` +
      `• *${p.client_name}*: "${p.client_message}"\n` +
      `  💡 Sugestão: "${p.suggested_text}"`;
  } else {
    contextoPendentes =
      `\n\n📬 *${allPending.length} clientes aguardando:*\n` +
      allPending
        .map(
          (p, i) =>
            `${i + 1}. *${p.client_name}*: "${p.client_message}"\n   💡 "${p.suggested_text}"`,
        )
        .join("\n");
  }

  // Busca histórico da conversa com cliente específico se mencionado
  let historicoCliente = "";
  if (allPending.length > 0) {
    const nomesMencionados = allPending.filter((p) =>
      mensagem.toLowerCase().includes(p.client_name.toLowerCase().split(" ")[0]),
    );
    if (nomesMencionados.length > 0) {
      const conversaId = nomesMencionados[0].conversation_id;
      const hist = await buscarHistoricoConversa(sb, conversaId, 15);
      if (hist) {
        historicoCliente = `\n\n📝 *Histórico da conversa com ${nomesMencionados[0].client_name}:*\n${hist}`;
      }
    }
  }

  const systemPrompt =
    `Você é PAZ, a assistente pessoal de vendas do Felipe Paz, corretor de imóveis autônomo. ` +
    `Você é inteligente, proativa, direta e especialista em vendas imobiliárias. ` +
    `Você conversa com o Felipe de forma natural, como uma secretária muito competente. ` +
    `Você pode ser chamada de PAZ — "PAZ faz isso", "PAZ analisa", "PAZ responde". ` +
    `\n\n` +
    `SUAS CAPACIDADES:\n` +
    `• Analisar conversas com clientes e dar opiniões estratégicas\n` +
    `• Sugerir abordagens de venda e follow-up\n` +
    `• Responder perguntas sobre clientes pendentes\n` +
    `• Executar ações no CRM quando Felipe aprovar\n` +
    `• Discutir negociações e estratégias\n` +
    `• Lembrar contexto dos clientes durante a conversa\n` +
    `\n` +
    `REGRAS INVIOLÁVEIS:\n` +
    `1. NUNCA envie mensagem ao cliente sem aprovação explícita do Felipe\n` +
    `2. NUNCA altere o CRM sem aprovação explícita do Felipe\n` +
    `3. Comando direto de Felipe = aprovação explícita. Se Felipe diz "muda", "move", "adiciona", "envia", "responde", "faz", "manda" — EXECUTE IMEDIATAMENTE com a ação estruturada\n` +
    `4. NUNCA pergunte "Quer que eu faça?" ou "Posso prosseguir?" — se Felipe pediu, já é a aprovação. Execute.\n` +
    `5. "sim", "ok", "pode", "vai", "faz", "confirma" após você propor algo = EXECUTE a ação proposta imediatamente\n` +
    contextoPendentes +
    historicoCliente +
    `\n\n` +
    `REGRAS DE AÇÃO:\n` +
    `• Felipe dá comando direto ("muda", "move", "adiciona no crm", "envia", "responde", "manda") → use MOVER_CRM ou ENVIAR_CLIENTE DIRETAMENTE, sem perguntar\n` +
    `• Felipe confirma ("sim", "ok", "pode", "vai", "confirma") após você propor → EXECUTE a ação proposta com MOVER_CRM ou ENVIAR_CLIENTE\n` +
    `• Felipe dá texto customizado ("fala pra ele X", "manda: X", "responde assim: X") → ENVIAR_CLIENTE com esse texto exato\n` +
    `• Felipe pede análise, opinião ou está discutindo → CONVERSAR\n` +
    `\n` +
    `SEMPRE inclua ao final da resposta:\n` +
    `<ACAO>\n` +
    `{\n` +
    `  "tipo": "ENVIAR_CLIENTE" | "MOVER_CRM" | "IGNORAR" | "CONVERSAR",\n` +
    `  "client_name": "nome do cliente se houver mais de 1 pendente",\n` +
    `  "texto": "texto a enviar (só ENVIAR_CLIENTE)",\n` +
    `  "etapa": "etapa CRM (só MOVER_CRM): contato, qualificado, visita, proposta, financiamento, vendido, perdido",\n` +
    `  "motivo": "uma linha"\n` +
    `}\n` +
    `</ACAO>`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          ...historicoFelipePaz,
          { role: "user", content: mensagem },
        ],
      }),
    });

    if (!res.ok) {
      await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ Erro ao processar.");
      return;
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const respostaCompleta = json.choices?.[0]?.message?.content?.trim() ?? "";

    const { texto, acao } = parsearAcaoIA(respostaCompleta);

    // Salva troca Felipe ↔ PAZ para memória entre mensagens
    if (pazConversationId) {
      const now = new Date().toISOString();
      await sb
        .from("messages")
        .insert([
          {
            conversation_id: pazConversationId,
            direction: "incoming",
            sender: "Felipe",
            type: "text",
            content: mensagem,
            status: "delivered",
            sent_at: now,
            metadata: { source: "paz-self-chat" },
          },
          {
            conversation_id: pazConversationId,
            direction: "outgoing",
            sender: "PAZ",
            type: "text",
            content: texto || respostaCompleta,
            status: "delivered",
            sent_at: now,
            metadata: { source: "paz-response" },
          },
        ])
        .catch((err) => console.warn("[PAZ] Erro ao salvar histórico:", err));
    }

    if (texto) {
      await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, texto);
    }

    if (acao && acao.tipo !== "CONVERSAR" && allPending.length > 0) {
      const resultado = await executarAcao({ sb, evolutionConfig, allPending, acao });
      if (resultado) {
        await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, resultado);
      }
    }
  } catch (err) {
    console.error("[PAZ] erro →", err instanceof Error ? err.message : String(err));
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ PAZ com erro. Tente novamente.");
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
    baseUrl: (
      (config?.base_url as string) ?? "https://evolution-api-production-448e.up.railway.app"
    ).replace(/\/$/,  ""),
    instance: (config?.instance_name as string) ?? "prime-crm",
  };

  // ─── Self-chat: Felipe conversando com PAZ ───────────────────────────────────
  const felipeVariants = normalizePhone(FELIPE_PHONE).map((v) => v.replace(/\D/g, ""));
  const isSelfChat =
    key?.fromMe === true && felipeVariants.includes(rawPhone.replace(/\D/g, ""));

  if (isSelfChat) {
    console.log(`[WEBHOOK] Felipe → PAZ: "${content}"`);
    if (content) {
      paz({ sb: supabase, mensagem: content, evolutionConfig, ownerId }).catch((err) =>
        console.error("[WEBHOOK] Erro PAZ:", err),
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

  // PAZ notifica Felipe — NÃO envia ao cliente automaticamente
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
    }).catch((err) => console.error("[WEBHOOK] Erro PAZ notificação:", err));
  }

  return new Response("OK", { status: 200 });
});
