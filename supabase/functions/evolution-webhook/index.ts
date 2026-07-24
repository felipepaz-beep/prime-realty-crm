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
  tipo: "ENVIAR_CLIENTE" | "MOVER_CRM" | "IGNORAR" | "CONVERSAR" | "CRIAR_LEAD";
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
  "follow-up": "qualificacao",
  visita: "visita_agendada",
  proposta: "proposta",
  financiamento: "negociacao",
  negociacao: "negociacao",
  negociação: "negociacao",
  vendido: "fechado_ganho",
  ganho: "fechado_ganho",
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

// ─── Conversa PAZ: histórico Felipe ↔ PAZ (memória entre mensagens) ──────────

async function buscarOuCriarConversaPaz(
  sb: SupabaseClient,
  ownerId: string,
): Promise<string | null> {
  try {
    const { data: pazClient } = await sb
      .from("clients")
      .select("id")
      .eq("owner_id", ownerId)
      .contains("tags", ["_paz_system_"])
      .limit(1)
      .maybeSingle();

    let pazClientId: string;
    let isNewClient = false;

    if (pazClient) {
      pazClientId = pazClient.id;
    } else {
      const { data: newClient, error: newClientErr } = await sb
        .from("clients")
        .insert({
          owner_id: ownerId,
          nome: "PAZ (Sistema)",
          etapa_funil: "novo_lead",
          tags: ["_paz_system_"],
        })
        .select("id")
        .single();
      if (newClientErr || !newClient) {
        console.warn("[PAZ] Erro ao criar cliente PAZ:", newClientErr?.message);
        return null;
      }
      pazClientId = newClient.id;
      isNewClient = true;
    }

    const { data: existingConv } = await sb
      .from("conversations")
      .select("id")
      .eq("client_id", pazClientId)
      .maybeSingle();

    if (existingConv) return existingConv.id;

    const { data: newConv, error: newConvErr } = await sb
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

    if (newConvErr || !newConv) {
      console.warn("[PAZ] Erro ao criar conversa PAZ:", newConvErr?.message);
      return null;
    }

    // Soft-delete DEPOIS de criar a conversa (evita trigger que rejeita conv com cliente deletado)
    if (isNewClient) {
      await sb
        .from("clients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", pazClientId);
    }

    return newConv.id;
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

// ─── Clientes ativos no CRM ───────────────────────────────────────────────────

async function buscarClientesAtivos(
  sb: SupabaseClient,
  ownerId: string | null,
): Promise<Array<{ nome: string; etapa_funil: string }>> {
  if (!ownerId) return [];
  const { data } = await sb
    .from("clients")
    .select("nome, etapa_funil")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .not("tags", "cs", '{"_paz_system_"}')
    .order("updated_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Array<{ nome: string; etapa_funil: string }>;
}

// ─── Busca cliente pelo nome no CRM ──────────────────────────────────────────

async function buscarClientePorNome(
  sb: SupabaseClient,
  ownerId: string | null,
  nome: string,
): Promise<{
  id: string;
  nome: string;
  whatsapp: string | null;
  telefone: string | null;
  etapa_funil: string | null;
} | null> {
  if (!ownerId || !nome) return null;
  const { data } = await sb
    .from("clients")
    .select("id, nome, whatsapp, telefone, etapa_funil")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .not("tags", "cs", '{"_paz_system_"}')
    .ilike("nome", `%${nome.split(" ")[0]}%`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ─── Busca contato desconhecido salvo nas conversas staging ──────────────────

async function buscarContatoNasConversas(
  sb: SupabaseClient,
  ownerId: string | null,
  nome: string,
): Promise<{ nome: string; phone: string; conversationId: string } | null> {
  if (!ownerId) return null;
  const { data: convs } = await sb
    .from("conversations")
    .select("id, metadata")
    .eq("owner_id", ownerId)
    .is("client_id", null)
    .order("updated_at", { ascending: false })
    .limit(30);

  const nomeLower = nome.split(" ")[0].toLowerCase();
  for (const conv of convs ?? []) {
    const meta = conv.metadata as Record<string, unknown>;
    const pushName = (meta?.push_name as string) ?? "";
    if (pushName.toLowerCase().includes(nomeLower)) {
      const remoteJid = (meta?.remote_jid as string) ?? "";
      const phone = remoteJid.split("@")[0];
      if (phone) return { nome: pushName, phone, conversationId: conv.id };
    }
  }
  return null;
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

    const { data: clienteInfo } = await sb
      .from("clients")
      .select("etapa_funil")
      .eq("id", clienteId)
      .single();
    const etapaLabel = CRM_LABELS[clienteInfo?.etapa_funil ?? ""] ?? "Novo Lead";

    // Se já existe pending deste cliente, apenas atualiza — sem nova notificação
    const { data: existingPending } = await sb
      .from("ai_pending_responses")
      .select("id")
      .eq("client_id", clienteId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      await sb
        .from("ai_pending_responses")
        .update({ client_message: mensagem, suggested_text: sugestao })
        .eq("id", existingPending.id);
      console.log(`[PAZ] Pendente atualizado silenciosamente — ${clienteNome}`);
      return;
    }

    // Primeiro contato desta sessão — insere e notifica Felipe
    await sb.from("ai_pending_responses").insert({
      owner_id: ownerId,
      conversation_id: conversationId,
      client_id: clienteId,
      client_phone: telefone,
      client_name: clienteNome,
      client_message: mensagem,
      suggested_text: sugestao,
    });

    let notif: string;
    if (isPrimeiroContato) {
      const fone = telefone.startsWith("+") ? telefone : `+${telefone}`;
      notif =
        `📥 *Novo Lead: ${clienteNome}*\n` +
        `📱 ${fone}\n\n` +
        `"${mensagem}"` +
        (sugestao
          ? `\n\n💬 *PAZ sugere:*\n"${sugestao}"`
          : `\n\n💬 _Me fala como quer abordar._`);
    } else {
      notif =
        `📩 *${clienteNome}* _(${etapaLabel})_:\n"${mensagem}"` +
        (sugestao ? `\n\n💡 *PAZ sugere:*\n"${sugestao}"` : "");
    }

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

// ─── Normaliza etapa CRM ──────────────────────────────────────────────────────

function normalizarEtapa(raw: string): string {
  const k = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  return CRM_ATALHOS[k] ?? k;
}

// ─── Executa ação — busca cliente em pending OU diretamente no CRM ────────────

async function executarAcao(params: {
  sb: SupabaseClient;
  ownerId: string | null;
  evolutionConfig: EvolutionConfig;
  allPending: PendingRecord[];
  acao: AcaoIA;
}): Promise<string> {
  const { sb, ownerId, evolutionConfig, allPending, acao } = params;

  // ── Tenta encontrar pending pelo nome ────────────────────────────────────────
  let pending: PendingRecord | undefined = undefined;
  if (acao.client_name) {
    pending = allPending.find((p) =>
      p.client_name.toLowerCase().includes(acao.client_name!.toLowerCase().split(" ")[0]),
    );
  } else if (allPending.length > 0) {
    pending = allPending[0];
  }

  // ── MOVER_CRM ────────────────────────────────────────────────────────────────
  if (acao.tipo === "MOVER_CRM") {
    const etapa = normalizarEtapa(acao.etapa ?? "");
    if (!etapa) return "⚠️ Etapa não reconhecida.";

    if (pending) {
      await sb.from("clients").update({ etapa_funil: etapa }).eq("id", pending.client_id);
      await sb.from("ai_pending_responses").update({ status: "skipped" }).eq("id", pending.id);
      return `✅ *${pending.client_name}* → *${CRM_LABELS[etapa] ?? etapa}*`;
    }

    if (acao.client_name) {
      const cliente = await buscarClientePorNome(sb, ownerId, acao.client_name);
      if (cliente) {
        await sb.from("clients").update({ etapa_funil: etapa }).eq("id", cliente.id);
        return `✅ *${cliente.nome}* → *${CRM_LABELS[etapa] ?? etapa}*`;
      }
      return `⚠️ Cliente "${acao.client_name}" não encontrado no CRM.`;
    }

    return "⚠️ Nenhum cliente identificado para mover.";
  }

  // ── ENVIAR_CLIENTE ───────────────────────────────────────────────────────────
  if (acao.tipo === "ENVIAR_CLIENTE") {
    const texto = acao.texto || pending?.suggested_text;
    if (!texto) return "⚠️ Nenhum texto para enviar.";

    if (pending) {
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

    if (acao.client_name) {
      const cliente = await buscarClientePorNome(sb, ownerId, acao.client_name);
      if (cliente) {
        const phone = (cliente.whatsapp || cliente.telefone || "").replace(/\D/g, "");
        if (!phone) return `⚠️ *${cliente.nome}* não tem número cadastrado.`;

        await enviarWhatsApp(evolutionConfig, phone, texto);

        const { data: conv } = await sb
          .from("conversations")
          .select("id")
          .eq("client_id", cliente.id)
          .eq("status", "open")
          .maybeSingle();

        if (conv) {
          await sb.from("messages").insert({
            conversation_id: conv.id,
            direction: "outgoing",
            sender: "Felipe Paz",
            type: "text",
            content: texto,
            status: "delivered",
            sent_at: new Date().toISOString(),
            metadata: { source: "paz-approved", client_id: cliente.id },
          });
        }
        return `✅ Enviado para *${cliente.nome}*`;
      }
      return `⚠️ Cliente "${acao.client_name}" não encontrado.`;
    }

    return "⚠️ Nenhum cliente pendente para enviar mensagem.";
  }

  // ── IGNORAR ──────────────────────────────────────────────────────────────────
  if (acao.tipo === "IGNORAR" && pending) {
    await sb.from("ai_pending_responses").update({ status: "skipped" }).eq("id", pending.id);
    return `⏭️ *${pending.client_name}* ignorado.`;
  }

  // ── CRIAR_LEAD ────────────────────────────────────────────────────────────────
  if (acao.tipo === "CRIAR_LEAD") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Me diz o nome do lead pra adicionar.";

    const jaExiste = await buscarClientePorNome(sb, ownerId, nome);
    if (jaExiste) {
      return `⚠️ *${jaExiste.nome}* já está no CRM (${CRM_LABELS[jaExiste.etapa_funil ?? ""] ?? "Lead"}).`;
    }

    // Tenta vincular ao contato já existente no WhatsApp (staging)
    const contato = await buscarContatoNasConversas(sb, ownerId, nome);

    const { data: novoCliente, error: createErr } = await sb
      .from("clients")
      .insert({
        owner_id: ownerId,
        nome: contato?.nome ?? nome,
        whatsapp: contato?.phone ?? null,
        etapa_funil: "novo_lead",
      })
      .select("id")
      .single();

    if (createErr || !novoCliente) {
      return `⚠️ Erro ao criar lead: ${createErr?.message ?? "desconhecido"}`;
    }

    if (contato) {
      await sb
        .from("conversations")
        .update({ client_id: novoCliente.id })
        .eq("id", contato.conversationId);
      return `✅ *${contato.nome}* adicionado como Novo Lead!\n📱 +${contato.phone}`;
    }

    return (
      `✅ *${nome}* adicionado como Novo Lead!\n` +
      `📌 _Sem número ainda — quando ele te mandar mensagem o WhatsApp vincula automático._`
    );
  }

  return "";
}

// ─── Detecção direta de comandos (bypass da IA para comandos simples) ─────────

async function executarComandoDireto(params: {
  sb: SupabaseClient;
  ownerId: string | null;
  evolutionConfig: EvolutionConfig;
  mensagem: string;
  allPending: PendingRecord[];
}): Promise<string | null> {
  const { sb, ownerId, evolutionConfig, mensagem, allPending } = params;
  const msg = mensagem.trim();

  // "adicione/adiciona [nome] [no crm]" ou "paz adiciona [nome]"
  const mCriar = msg.match(
    /^(?:paz\s+)?(?:adicione?|adiciona(?:r)?)\s+(.+?)(?:\s+(?:no|ao)\s+(?:crm|sistema))?$/i,
  );
  if (mCriar) {
    const nome = mCriar[1].replace(/\s+(?:no|ao)\s+(?:crm|sistema)\s*$/i, "").trim();
    if (nome) {
      return executarAcao({ sb, ownerId, evolutionConfig, allPending, acao: { tipo: "CRIAR_LEAD", client_name: nome } });
    }
  }

  // "move/mova [nome] para/pra [etapa]" ou "paz move..."
  const mMover = msg.match(
    /^(?:paz\s+)?(?:mov[ae](?:r)?|muda)\s+(?:o\s+|a\s+)?(.+?)\s+(?:para?|pra)\s+(.+?)$/i,
  );
  if (mMover) {
    const [, nomeCliente, etapaRaw] = mMover;
    return executarAcao({ sb, ownerId, evolutionConfig, allPending, acao: { tipo: "MOVER_CRM", client_name: nomeCliente.trim(), etapa: etapaRaw.trim() } });
  }

  // "quais os clientes / lista clientes / meus clientes / clientes no crm"
  if (
    /(?:quais|list[ae]|me\s+(?:diz|fala|mostra))\s+(?:os\s+|meus\s+)?clientes|clientes\s+(?:que\s+tenho\s+)?(?:no|do)\s+crm|meus\s+clientes/i.test(msg)
  ) {
    const clientes = await buscarClientesAtivos(sb, ownerId);
    if (!clientes.length) return "📭 Nenhum cliente no CRM ainda.";
    return (
      `📋 *Seus ${clientes.length} clientes:*\n` +
      clientes
        .map((c) => `• *${c.nome}* — ${CRM_LABELS[c.etapa_funil] ?? c.etapa_funil}`)
        .join("\n")
    );
  }

  // "pendentes / quem tá sem resposta"
  if (/pendente|sem\s+resposta|aguardando/i.test(msg)) {
    const agora = Date.now();
    if (!allPending.length) return "📭 Nenhum cliente aguardando resposta agora.";
    return (
      `📬 *${allPending.length} aguardando:*\n` +
      allPending
        .map((p) => {
          const horas = Math.floor((agora - new Date(p.created_at).getTime()) / 3_600_000);
          const idade = horas >= 24 ? `${Math.floor(horas / 24)}d` : `${horas}h`;
          return `• *${p.client_name}* (${idade}): "${p.client_message}"`;
        })
        .join("\n")
    );
  }

  return null; // Não é um comando direto reconhecido → vai pra IA
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
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ OpenAI não configurada.").catch(() => {});
    return;
  }

  try {
  // Memória da conversa Felipe ↔ PAZ
  let pazConversationId: string | null = null;
  let historicoFelipePaz: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (ownerId) {
    pazConversationId = await buscarOuCriarConversaPaz(sb, ownerId);
    if (pazConversationId) {
      historicoFelipePaz = await buscarHistoricoPazMessages(sb, pazConversationId, 12);
    }
  }
  console.log(`[PAZ] memória: convId=${pazConversationId ?? "null"}, msgs=${historicoFelipePaz.length}`);

  // Clientes pendentes (aguardando decisão de resposta)
  const { data: allPendingRaw } = await sb
    .from("ai_pending_responses")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);
  const allPending = (allPendingRaw ?? []) as PendingRecord[];

  // ── Tenta executar comando diretamente (sem IA) ─────────────────────────────
  const respostaDireta = await executarComandoDireto({
    sb, ownerId, evolutionConfig, mensagem, allPending,
  }).catch((err) => {
    console.warn("[PAZ] Erro no comando direto:", err);
    return null;
  });

  if (respostaDireta !== null) {
    if (pazConversationId) {
      const now = new Date().toISOString();
      await sb.from("messages").insert([
        { conversation_id: pazConversationId, direction: "incoming", sender: "Felipe", type: "text", content: mensagem, status: "delivered", sent_at: now, metadata: { source: "paz-self-chat" } },
        { conversation_id: pazConversationId, direction: "outgoing", sender: "PAZ", type: "text", content: respostaDireta, status: "delivered", sent_at: now, metadata: { source: "paz-direct" } },
      ]).catch(() => {});
    }
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, respostaDireta);
    return;
  }
  // ── Fim do bypass — segue para IA ──────────────────────────────────────────

  // Todos os clientes ativos no CRM (para PAZ saber quem existe)
  const clientesAtivos = await buscarClientesAtivos(sb, ownerId);

  // Contatos que mandaram mensagem mas ainda não estão no CRM
  const { data: rawUnknown } = await sb
    .from("conversations")
    .select("metadata")
    .eq("owner_id", ownerId)
    .is("client_id", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  const contatosDesconhecidos = (rawUnknown ?? [])
    .map((c) => c.metadata as Record<string, unknown>)
    .filter((m) => m?.push_name);

  // ── Contexto de pendentes (com idade para PAZ sugerir follow-ups) ────────────
  const agora = Date.now();
  let contextoPendentes = "";
  if (allPending.length === 0) {
    contextoPendentes = "\n\n📭 Nenhum cliente aguardando resposta agora.";
  } else {
    const linhas = allPending.map((p, i) => {
      const horas = Math.floor((agora - new Date(p.created_at).getTime()) / 3_600_000);
      const idadeStr = horas >= 24 ? `${Math.floor(horas / 24)}d atrás` : `${horas}h atrás`;
      return (
        `${i + 1}. *${p.client_name}* (${idadeStr}): "${p.client_message}"\n` +
        `   💡 "${p.suggested_text}"`
      );
    });
    contextoPendentes =
      `\n\n📬 *${allPending.length} cliente(s) aguardando resposta:*\n` + linhas.join("\n");
  }

  // ── Contexto do CRM ──────────────────────────────────────────────────────────
  let contextoCrm = "";
  if (clientesAtivos.length > 0) {
    contextoCrm =
      `\n\n📋 *Clientes no CRM:*\n` +
      clientesAtivos
        .map((c) => `• *${c.nome}* — ${CRM_LABELS[c.etapa_funil] ?? c.etapa_funil}`)
        .join("\n");
  }

  // ── Histórico de conversa do cliente mencionado (pending OU qualquer ativo) ──
  let historicoCliente = "";
  {
    const msgLower = mensagem.toLowerCase();

    // 1. Tenta nos pendentes
    const mencionadoPending = allPending.find((p) =>
      msgLower.includes(p.client_name.toLowerCase().split(" ")[0]),
    );
    if (mencionadoPending) {
      const hist = await buscarHistoricoConversa(sb, mencionadoPending.conversation_id, 20);
      historicoCliente = hist
        ? `\n\n📝 *Conversa com ${mencionadoPending.client_name}:*\n${hist}`
        : `\n\n📝 *${mencionadoPending.client_name}* ainda não tem histórico de mensagens.`;
    } else {
      // 2. Tenta qualquer cliente ativo mencionado pelo primeiro nome
      for (const c of clientesAtivos) {
        const primeiroNome = c.nome.split(" ")[0].toLowerCase();
        if (primeiroNome.length >= 3 && msgLower.includes(primeiroNome)) {
          const cf = await buscarClientePorNome(sb, ownerId, c.nome);
          if (cf) {
            const { data: conv } = await sb
              .from("conversations")
              .select("id")
              .eq("client_id", cf.id)
              .eq("status", "open")
              .maybeSingle();
            if (conv) {
              const hist = await buscarHistoricoConversa(sb, conv.id, 20);
              historicoCliente = hist
                ? `\n\n📝 *Conversa com ${c.nome}:*\n${hist}`
                : `\n\n📝 *${c.nome}* está no CRM mas ainda não tem mensagens registradas.`;
            } else {
              historicoCliente = `\n\n⚠️ *${c.nome}* está no CRM mas não tem conversa WhatsApp aberta.`;
            }
          } else {
            historicoCliente = `\n\n⚠️ Não encontrei "${primeiroNome}" no CRM.`;
          }
          break;
        }
      }
    }
  }

  // ── Contexto de contatos sem cadastro no CRM ─────────────────────────────────
  let contextoDesconhecidos = "";
  if (contatosDesconhecidos.length > 0) {
    const linhas = contatosDesconhecidos.map(
      (m) => `• *${m.push_name}* (+${(m.remote_jid as string)?.split("@")[0] ?? "?"})`,
    );
    contextoDesconhecidos =
      `\n\n📥 *Contatos no WhatsApp sem cadastro no CRM:*\n` + linhas.join("\n");
  }

  // ── System prompt ────────────────────────────────────────────────────────────
  const systemPrompt =
    `Você é PAZ — a assistente pessoal do corretor Felipe Paz no WhatsApp.\n\n` +
    `Você não é um bot de comandos. É a sócia inteligente do Felipe que vive no WhatsApp dele. ` +
    `Felipe te dá comandos e você executa no CRM — nunca age por conta própria.\n\n` +
    `CAPACIDADES:\n` +
    `• Adicionar lead: "PAZ adiciona Michel" → busca Michel nos contatos do WhatsApp (lista acima) e cria no CRM\n` +
    `• Mover cliente no CRM: "PAZ move o André pra qualificação" → execute\n` +
    `• Enviar mensagem para cliente: "PAZ manda isso pro João: [texto]" → execute\n` +
    `• Analisar conversa: "PAZ analisa a conversa com o André" → o histórico aparece acima automaticamente. Se não aparecer, digo que não encontrei (nunca peço para Felipe me contar a conversa)\n` +
    `• Pendentes: "PAZ pendentes" ou "PAZ quem tá sem resposta?" → liste os clientes aguardando + há quantos dias\n` +
    `• Pipeline: "PAZ como tá meu pipeline?" → analise os clientes ativos e dê um diagnóstico\n` +
    `• Sugerir abordagem: "PAZ como abordo o cliente que quer visitar?" → dê opinião estratégica\n` +
    `• Montar mensagem: "PAZ monta uma mensagem perguntando sobre financiamento" → crie o texto\n` +
    `• Qualquer papo de negócio imobiliário: estratégia, negociação, precificação, timing\n\n` +
    `REGRA DE EXECUÇÃO — CRÍTICA:\n` +
    `Quando Felipe pedir uma ação, EXECUTE e diga claramente o que está fazendo:\n` +
    `✓ "Adicionando Michel como Novo Lead agora." (não "Tudo certo! Como posso ajudar?")\n` +
    `✓ "Movendo Andre Luis para Qualificação."\n` +
    `"sim", "ok", "pode", "vai", "manda", "faz", "adiciona" = execute imediatamente, sem pedir confirmação.\n\n` +
    `REGRA DE CADASTRO:\n` +
    `Você NUNCA cria lead sozinha — só quando Felipe mandar explicitamente.\n` +
    `"PAZ adiciona [nome]" → execute CRIAR_LEAD com o nome. O sistema busca o contato no WhatsApp.\n` +
    `Se o contato não aparecer na lista de "Contatos sem cadastro", avise Felipe que ele precisa mandar uma mensagem primeiro.\n\n` +
    contextoPendentes +
    contextoCrm +
    contextoDesconhecidos +
    historicoCliente +
    `\n\n` +
    `Quando for executar uma ação, inclua ao final (Felipe não vê):\n` +
    `<ACAO>{"tipo":"ENVIAR_CLIENTE"|"MOVER_CRM"|"IGNORAR"|"CONVERSAR"|"CRIAR_LEAD","client_name":"nome","texto":"(só ENVIAR_CLIENTE)","etapa":"contato|qualificado|visita|proposta|negociacao|vendido|perdido (só MOVER_CRM)","motivo":"..."}</ACAO>`;

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
      await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ Erro ao processar. Tente novamente.");
      return;
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const respostaCompleta = json.choices?.[0]?.message?.content?.trim() ?? "";

    const { texto, acao } = parsearAcaoIA(respostaCompleta);

    // Salva troca para memória
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

    if (acao && acao.tipo !== "CONVERSAR") {
      const resultado = await executarAcao({
        sb,
        ownerId,
        evolutionConfig,
        allPending,
        acao,
      });
      if (resultado) {
        await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, resultado);
      }
    }
  } catch (err) {
    console.error("[PAZ] erro →", err instanceof Error ? err.message : String(err));
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ PAZ com erro. Tente novamente.").catch(() => {});
  }

  } catch (errFatal) {
    console.error("[PAZ] erro fatal (fora do bloco IA) →", errFatal instanceof Error ? errFatal.message : String(errFatal));
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, `⚠️ PAZ travou: ${errFatal instanceof Error ? errFatal.message.slice(0, 120) : "erro desconhecido"}`).catch(() => {});
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

  // ─── Self-chat: Felipe conversando com PAZ ────────────────────────────────────
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

  // ─── Mensagem saindo de Felipe para um cliente (captura para histórico) ──────
  if (key?.fromMe === true) {
    const phoneVariants = normalizePhone(rawPhone);
    const { data: clienteOut } = await supabase
      .from("clients")
      .select("id")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .not("tags", "cs", '{"_paz_system_"}')
      .or(phoneVariants.flatMap((p) => [`telefone.eq.${p}`, `whatsapp.eq.${p}`]).join(","))
      .maybeSingle();

    if (clienteOut && content) {
      const { data: convOut } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clienteOut.id)
        .eq("channel", "whatsapp")
        .eq("status", "open")
        .maybeSingle();

      if (convOut) {
        const sentAt = messageTimestamp
          ? new Date(messageTimestamp * 1000).toISOString()
          : new Date().toISOString();
        await supabase.from("messages").insert({
          conversation_id: convOut.id,
          direction: "outgoing",
          sender: "Felipe Paz",
          type,
          content,
          status: "delivered",
          sent_at: sentAt,
          metadata: { provider_msg_id: key?.id, remote_jid: remoteJid, source: "whatsapp-direct" },
        }).catch((err) => console.warn("[WEBHOOK] Erro ao salvar mensagem saída:", err));

        // Marcar pendente como enviado quando Felipe responde diretamente
        await supabase
          .from("ai_pending_responses")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("client_id", clienteOut.id)
          .eq("status", "pending")
          .catch(() => {});
      }
    }
    return new Response("OK", { status: 200 });
  }

  // ─── Fluxo de cliente ─────────────────────────────────────────────────────────
  const phoneVariants = normalizePhone(rawPhone);

  const { data: clientData } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .or(phoneVariants.flatMap((p) => [`telefone.eq.${p}`, `whatsapp.eq.${p}`]).join(","))
    .maybeSingle();

  if (!clientData) {
    // Número desconhecido — NÃO cria lead automaticamente
    if (!content) return new Response("OK", { status: 200 });

    const fone = `+${rawPhone}`;

    // Busca ou cria conversa staging para este contato (necessário para "PAZ adiciona [nome]")
    const { data: allUnknownConvs } = await supabase
      .from("conversations")
      .select("id, metadata")
      .eq("owner_id", ownerId)
      .is("client_id", null);

    const existingUnknownConv = (allUnknownConvs ?? []).find(
      (c) => (c.metadata as Record<string, unknown>)?.remote_jid === remoteJid,
    );

    let unknownConvId: string | null = null;
    const isPrimeiroContatoDesconhecido = !existingUnknownConv;

    if (existingUnknownConv) {
      unknownConvId = existingUnknownConv.id;
    } else {
      const { data: newUnknownConv } = await supabase
        .from("conversations")
        .insert({
          owner_id: ownerId,
          client_id: null,
          channel: "whatsapp",
          status: "open",
          metadata: { remote_jid: remoteJid, push_name: pushName, unknown_contact: true },
        })
        .select("id")
        .single()
        .catch(() => ({ data: null, error: null }));
      unknownConvId = (newUnknownConv as { id: string } | null)?.id ?? null;
    }

    // Salva mensagem na conversa staging
    if (unknownConvId) {
      const sentAt = messageTimestamp
        ? new Date(messageTimestamp * 1000).toISOString()
        : new Date().toISOString();
      await supabase
        .from("messages")
        .insert({
          conversation_id: unknownConvId,
          direction: "incoming",
          sender: pushName,
          type,
          content,
          attachment,
          status: "delivered",
          sent_at: sentAt,
          metadata: { provider_msg_id: key?.id, remote_jid: remoteJid },
        })
        .catch((err) => console.warn("[WEBHOOK] Erro ao salvar msg desconhecido:", err));
    }

    // Notifica Felipe apenas na primeira mensagem deste contato (sem spam)
    if (isPrimeiroContatoDesconhecido && evolutionConfig.apiKey) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
      let sugestao = "";
      if (openaiKey) {
        try {
          const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              max_tokens: 100,
              messages: [
                { role: "system", content: "Sugira uma resposta de primeiro atendimento como corretor Felipe Paz. Breve, natural, máximo 2 linhas." },
                { role: "user", content: `Número desconhecido (${fone}): "${content}"\n\nSugira uma resposta:` },
              ],
            }),
          });
          if (r.ok) {
            const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
            sugestao = j.choices?.[0]?.message?.content?.trim() ?? "";
          }
        } catch { /* ignora */ }
      }

      const notif =
        `📱 *Novo contato: ${pushName}*\n${fone}\n\n` +
        `"${content}"` +
        (sugestao ? `\n\n💬 *PAZ sugere:*\n"${sugestao}"` : "") +
        `\n\n_Diga "PAZ adiciona ${pushName}" para criar no CRM._`;

      enviarWhatsApp(evolutionConfig, FELIPE_PHONE, notif).catch((err) =>
        console.error("[WEBHOOK] Erro ao notificar número desconhecido:", err),
      );
    }

    console.log(`[WEBHOOK] contato desconhecido ${isPrimeiroContatoDesconhecido ? "novo" : "msg adicional"}: ${rawPhone} (${pushName})`);
    return new Response("OK", { status: 200 });
  }

  const clientId = clientData.id;

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
