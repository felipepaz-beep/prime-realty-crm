// PAZ v3 — executa sem confirmação, aceita mude/transfira
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
  tipo:
    | "MOVER_CRM"
    | "CONVERSAR"
    | "CRIAR_LEAD"
    | "REGISTRAR_ATIVIDADE"
    | "CRIAR_TAREFA"
    | "REGISTRAR_VENDA"
    | "REGISTRAR_PERDA"
    | "ADICIONAR_NOTA"
    | "AGENDAR_FOLLOWUP"
    | "ATUALIZAR_CLIENTE";
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  etapa?: string;
  texto?: string;
  motivo?: string;
  activity_type?: string;
  activity_title?: string;
  activity_description?: string;
  activity_outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  due_at?: string;
  priority?: string;
  location?: string;
  deal_value?: number;
  nota?: string;
  temperatura?: string;
  task_title?: string;
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

// ─── Transcrição de áudio via Whisper ─────────────────────────────────────────

async function transcreverAudio(audioUrl: string, openaiKey: string): Promise<string | null> {
  try {
    const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(15_000) });
    if (!audioRes.ok) return null;
    const audioBytes = await audioRes.arrayBuffer();

    const form = new FormData();
    form.append("file", new Blob([audioBytes], { type: "audio/ogg" }), "audio.ogg");
    form.append("model", "whisper-1");
    form.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string };
    return json.text?.trim() ?? null;
  } catch (err) {
    console.warn("[WHISPER] Erro ao transcrever áudio:", err instanceof Error ? err.message : err);
    return null;
  }
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
  fechado: "fechado_ganho",
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

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Ligação",
  MEETING: "Reunião",
  VISIT: "Visita",
  EMAIL: "E-mail",
  FOLLOWUP: "Follow-up",
  TASK: "Tarefa",
};

// ─── Registro de evento na timeline ──────────────────────────────────────────

async function registrarTimelineEdge(
  sb: SupabaseClient,
  ownerId: string,
  clientId: string,
  category: string,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await sb
    .from("client_timeline")
    .insert({
      client_id: clientId,
      owner_id: ownerId,
      category,
      event_type: eventType,
      title,
      description: description ?? null,
      metadata: metadata ?? {},
      created_by: ownerId,
    })
    .catch((err) => console.warn("[TIMELINE] Erro ao registrar:", err?.message ?? err));
}

// ─── Histórico de conversa com cliente ───────────────────────────────────────

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

// ─── Conversa PAZ: memória Felipe ↔ PAZ ──────────────────────────────────────

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
): Promise<Array<{ nome: string; etapa_funil: string; valor_negociado: number | null }>> {
  if (!ownerId) return [];
  const { data } = await sb
    .from("clients")
    .select("nome, etapa_funil, valor_negociado")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .not("tags", "cs", '{"_paz_system_"}')
    .order("updated_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Array<{
    nome: string;
    etapa_funil: string;
    valor_negociado: number | null;
  }>;
}

// ─── Busca cliente pelo nome ──────────────────────────────────────────────────

async function buscarClientePorNome(
  sb: SupabaseClient,
  ownerId: string | null,
  nome: string,
): Promise<{
  id: string;
  nome: string;
  whatsapp: string | null;
  telefone: string | null;
  email: string | null;
  etapa_funil: string | null;
  status: string | null;
  valor_negociado: number | null;
  proximo_followup: string | null;
} | null> {
  if (!ownerId || !nome) return null;
  const { data } = await sb
    .from("clients")
    .select(
      "id, nome, whatsapp, telefone, email, etapa_funil, status, valor_negociado, proximo_followup",
    )
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .not("tags", "cs", '{"_paz_system_"}')
    .ilike("nome", `%${nome.split(" ")[0]}%`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ─── Busca contato desconhecido nas conversas ─────────────────────────────────

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

// ─── Parse da resposta da IA ──────────────────────────────────────────────────

function parsearRespostaIA(resposta: string): { texto: string; acoes: AcaoIA[] } {
  try {
    const json = JSON.parse(resposta) as Record<string, unknown>;
    if (json.resposta !== undefined || json.acoes !== undefined) {
      return {
        texto: (json.resposta as string) ?? "",
        acoes: ((json.acoes as AcaoIA[]) ?? []).filter(Boolean),
      };
    }
  } catch {
    /* não é JSON */
  }

  const matches = [...resposta.matchAll(/<ACAO>([\s\S]*?)<\/ACAO>/g)];
  const textoLimpo = resposta.replace(/<ACAO>[\s\S]*?<\/ACAO>/g, "").trim();
  const acoes: AcaoIA[] = [];
  for (const match of matches) {
    try {
      acoes.push(JSON.parse(match[1].trim()) as AcaoIA);
    } catch {
      /* ignora */
    }
  }
  return { texto: textoLimpo, acoes };
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

// ─── Executa ação no CRM ─────────────────────────────────────────────────────

async function executarAcao(params: {
  sb: SupabaseClient;
  ownerId: string | null;
  evolutionConfig: EvolutionConfig;
  acao: AcaoIA;
}): Promise<string> {
  const { sb, ownerId, acao } = params;

  const resolverCliente = async () => {
    if (!acao.client_name) return null;
    return buscarClientePorNome(sb, ownerId, acao.client_name);
  };

  // ── MOVER_CRM ────────────────────────────────────────────────────────────────
  if (acao.tipo === "MOVER_CRM") {
    const etapa = normalizarEtapa(acao.etapa ?? "");
    if (!etapa) return "⚠️ Etapa não reconhecida.";
    if (!acao.client_name) return "⚠️ Me diz o nome do cliente para mover.";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${acao.client_name}" não encontrado no CRM.`;

    await sb.from("clients").update({ etapa_funil: etapa }).eq("id", cliente.id);
    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "pipeline",
        "etapa_alterada",
        `Etapa alterada para ${CRM_LABELS[etapa] ?? etapa}`,
        undefined,
        { etapa_nova: etapa },
      );
    return `✅ *${cliente.nome}* → *${CRM_LABELS[etapa] ?? etapa}*`;
  }

  // ── CRIAR_LEAD ────────────────────────────────────────────────────────────────
  if (acao.tipo === "CRIAR_LEAD") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Me diz o nome do lead pra adicionar.";

    const jaExiste = await buscarClientePorNome(sb, ownerId, nome);
    if (jaExiste)
      return `⚠️ *${jaExiste.nome}* já está no CRM (${CRM_LABELS[jaExiste.etapa_funil ?? ""] ?? "Lead"}).`;

    const contato = await buscarContatoNasConversas(sb, ownerId, nome);
    const phone = acao.client_phone?.replace(/\D/g, "") || contato?.phone || null;

    const { data: novoCliente, error: createErr } = await sb
      .from("clients")
      .insert({
        owner_id: ownerId,
        nome: contato?.nome ?? nome,
        whatsapp: phone,
        telefone: phone,
        email: acao.client_email ?? null,
        etapa_funil: normalizarEtapa(acao.etapa ?? "novo_lead") || "novo_lead",
      })
      .select("id")
      .single();

    if (createErr || !novoCliente)
      return `⚠️ Erro ao criar lead: ${createErr?.message ?? "desconhecido"}`;

    if (contato) {
      await sb
        .from("conversations")
        .update({ client_id: novoCliente.id })
        .eq("id", contato.conversationId);
    }

    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        novoCliente.id,
        "ciclo_vida",
        "cliente_criado",
        `${contato?.nome ?? nome} adicionado ao CRM via PAZ`,
      );

    const phoneStr = phone ? `\n📱 +${phone}` : "\n📌 _Sem número ainda._";
    return `✅ *${contato?.nome ?? nome}* adicionado como Novo Lead!${phoneStr}`;
  }

  // ── REGISTRAR_ATIVIDADE ───────────────────────────────────────────────────────
  if (acao.tipo === "REGISTRAR_ATIVIDADE") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Me diz com quem foi a atividade.";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${nome}" não encontrado no CRM.`;

    const tipo = (acao.activity_type ?? "MEETING").toUpperCase();
    const titulo =
      acao.activity_title ?? `${ACTIVITY_TYPE_LABELS[tipo] ?? tipo} com ${cliente.nome}`;
    const agora = new Date().toISOString();

    const { data: act, error: actErr } = await sb
      .from("activities")
      .insert({
        owner_id: ownerId,
        client_id: cliente.id,
        type: tipo,
        title: titulo,
        description: acao.activity_description ?? null,
        status: "COMPLETED",
        priority: (acao.priority ?? "MEDIUM").toUpperCase(),
        scheduled_at: acao.scheduled_at ?? acao.completed_at ?? agora,
        completed_at: acao.completed_at ?? agora,
        location: acao.location ?? null,
        metadata: { outcome: acao.activity_outcome ?? null, source: "paz" },
      })
      .select("id")
      .single();

    if (actErr || !act) return `⚠️ Erro ao registrar atividade: ${actErr?.message ?? "?"}`;

    const timelineEvent =
      tipo === "CALL"
        ? "ligacao_realizada"
        : tipo === "VISIT"
          ? "visita_realizada"
          : tipo === "EMAIL"
            ? "email_enviado"
            : "followup_realizado";

    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "comunicacao",
        timelineEvent,
        titulo,
        acao.activity_outcome ?? acao.activity_description ?? undefined,
        { activity_id: act.id },
      );

    const outcomeStr = acao.activity_outcome ? `\n📋 _${acao.activity_outcome}_` : "";
    return `✅ *${ACTIVITY_TYPE_LABELS[tipo] ?? tipo}* com *${cliente.nome}* registrada!${outcomeStr}`;
  }

  // ── CRIAR_TAREFA ──────────────────────────────────────────────────────────────
  if (acao.tipo === "CRIAR_TAREFA") {
    const tipo = (acao.activity_type ?? "TASK").toUpperCase();
    const titulo = acao.task_title ?? acao.activity_title ?? `${ACTIVITY_TYPE_LABELS[tipo] ?? tipo}`;
    const dueAt = acao.due_at ?? acao.scheduled_at ?? null;

    let clienteId: string | null = null;
    let clienteNome = "sem cliente";
    if (acao.client_name) {
      const cliente = await resolverCliente();
      if (cliente) {
        clienteId = cliente.id;
        clienteNome = cliente.nome;
      }
    }

    const { data: task, error: taskErr } = await sb
      .from("activities")
      .insert({
        owner_id: ownerId,
        client_id: clienteId,
        type: tipo,
        title: titulo,
        description: acao.activity_description ?? null,
        status: "PENDING",
        priority: (acao.priority ?? "MEDIUM").toUpperCase(),
        scheduled_at: dueAt,
        due_at: dueAt,
        location: acao.location ?? null,
        metadata: { source: "paz" },
      })
      .select("id")
      .single();

    if (taskErr || !task) return `⚠️ Erro ao criar tarefa: ${taskErr?.message ?? "?"}`;

    if (ownerId && clienteId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        clienteId,
        "tarefa",
        "tarefa_criada",
        titulo,
        undefined,
        { activity_id: task.id, due_at: dueAt },
      );

    const dueStr = dueAt
      ? `\n📅 ${new Date(dueAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}`
      : "";
    const clienteStr = clienteNome !== "sem cliente" ? ` com *${clienteNome}*` : "";
    return `✅ Tarefa criada: *${titulo}*${clienteStr}${dueStr}`;
  }

  // ── REGISTRAR_VENDA ───────────────────────────────────────────────────────────
  if (acao.tipo === "REGISTRAR_VENDA") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Me diz o nome do cliente da venda.";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${nome}" não encontrado no CRM.`;

    const valor = acao.deal_value ?? 0;
    await sb
      .from("clients")
      .update({
        status: "ganho",
        etapa_funil: "fechado_ganho",
        ...(valor > 0 ? { valor_negociado: valor } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "negocio",
        "venda_concluida",
        `Venda concluída com ${cliente.nome}`,
        valor > 0 ? `Valor: R$ ${valor.toLocaleString("pt-BR")}` : undefined,
        { valor_negociado: valor },
      );

    const valorStr =
      valor > 0 ? `\n💰 R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
    return `🎉 *VENDA REGISTRADA!*\n\n*${cliente.nome}* → *Vendido ✅*${valorStr}`;
  }

  // ── REGISTRAR_PERDA ───────────────────────────────────────────────────────────
  if (acao.tipo === "REGISTRAR_PERDA") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Me diz o nome do cliente.";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${nome}" não encontrado no CRM.`;

    await sb
      .from("clients")
      .update({
        status: "perdido",
        etapa_funil: "fechado_perdido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "negocio",
        "etapa_alterada",
        `Negócio perdido com ${cliente.nome}`,
        acao.motivo ?? undefined,
        { etapa_nova: "fechado_perdido", motivo: acao.motivo },
      );

    const motivoStr = acao.motivo ? `\n_Motivo: ${acao.motivo}_` : "";
    return `📌 *${cliente.nome}* marcado como *Perdido ❌*${motivoStr}`;
  }

  // ── ADICIONAR_NOTA ────────────────────────────────────────────────────────────
  if (acao.tipo === "ADICIONAR_NOTA") {
    const nota = acao.nota ?? acao.activity_description ?? acao.texto;
    if (!nota) return "⚠️ Qual a nota?";
    if (!acao.client_name) return "⚠️ Diz o nome do cliente para salvar a nota.";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${acao.client_name}" não encontrado.`;

    await sb.from("activities").insert({
      owner_id: ownerId,
      client_id: cliente.id,
      type: "TASK",
      title: "Nota adicionada",
      description: nota,
      status: "COMPLETED",
      priority: "LOW",
      completed_at: new Date().toISOString(),
      metadata: { source: "paz", is_note: true },
    });

    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "documento",
        "nota_adicionada",
        "Nota adicionada via PAZ",
        nota.slice(0, 300),
      );

    return `📝 Nota salva em *${cliente.nome}*:\n_${nota.slice(0, 150)}${nota.length > 150 ? "..." : ""}_`;
  }

  // ── AGENDAR_FOLLOWUP ──────────────────────────────────────────────────────────
  if (acao.tipo === "AGENDAR_FOLLOWUP") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Com quem é o follow-up?";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${nome}" não encontrado.`;

    const dataFollowup = acao.due_at ?? acao.scheduled_at ?? null;

    if (dataFollowup) {
      await sb.from("clients").update({ proximo_followup: dataFollowup }).eq("id", cliente.id);
    }

    await sb.from("activities").insert({
      owner_id: ownerId,
      client_id: cliente.id,
      type: "FOLLOWUP",
      title: acao.activity_title ?? `Follow-up com ${cliente.nome}`,
      description: acao.activity_description ?? null,
      status: "PENDING",
      priority: (acao.priority ?? "MEDIUM").toUpperCase(),
      scheduled_at: dataFollowup,
      due_at: dataFollowup,
      metadata: { source: "paz" },
    });

    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "comunicacao",
        "followup_criado",
        `Follow-up agendado com ${cliente.nome}`,
        undefined,
        { due_at: dataFollowup },
      );

    const dataStr = dataFollowup
      ? ` para *${new Date(dataFollowup).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}*`
      : "";
    return `📅 Follow-up${dataStr} agendado com *${cliente.nome}*`;
  }

  // ── ATUALIZAR_CLIENTE ─────────────────────────────────────────────────────────
  if (acao.tipo === "ATUALIZAR_CLIENTE") {
    const nome = acao.client_name;
    if (!nome) return "⚠️ Me diz o nome do cliente.";

    const cliente = await resolverCliente();
    if (!cliente) return `⚠️ Cliente "${nome}" não encontrado.`;

    const updates: Record<string, unknown> = {};
    if (acao.client_phone) updates.telefone = updates.whatsapp = acao.client_phone.replace(/\D/g, "");
    if (acao.client_email) updates.email = acao.client_email;
    if (acao.temperatura) updates.temperatura = acao.temperatura;

    if (Object.keys(updates).length === 0) return "⚠️ Nenhum dado para atualizar.";

    await sb.from("clients").update(updates).eq("id", cliente.id);
    if (ownerId)
      await registrarTimelineEdge(
        sb,
        ownerId,
        cliente.id,
        "ciclo_vida",
        "cliente_atualizado",
        `Dados de ${cliente.nome} atualizados via PAZ`,
        undefined,
        { campos: Object.keys(updates) },
      );

    return `✅ *${cliente.nome}* atualizado: ${Object.keys(updates).join(", ")}`;
  }

  return "";
}

// ─── Comandos diretos (sem IA) ────────────────────────────────────────────────

async function executarComandoDireto(params: {
  sb: SupabaseClient;
  ownerId: string | null;
  evolutionConfig: EvolutionConfig;
  mensagem: string;
}): Promise<string | null> {
  const { sb, ownerId, evolutionConfig, mensagem } = params;
  const msg = mensagem.trim();

  // ── ping de diagnóstico ──────────────────────────────────────────────────────
  if (/^paz\s+ping$/i.test(msg)) {
    return "🤖 PAZ ativa e respondendo!";
  }

  const mCriar = msg.match(
    /^(?:paz\s+)?(?:add|adicione?|adiciona(?:r)?|cadastra(?:r)?|cria(?:r)?)\s+(.+?)(?:\s+(?:no|ao)\s+(?:crm|sistema))?(?:\s+como\s+lead\s+(?:novo|nova))?$/i,
  );
  if (mCriar) {
    const nome = mCriar[1]
      .replace(/\s+(?:no|ao)\s+(?:crm|sistema)\s*$/i, "")
      .replace(/\s+como\s+lead\s+(?:novo|nova)\s*$/i, "")
      .trim();
    if (nome)
      return executarAcao({
        sb,
        ownerId,
        evolutionConfig,
        acao: { tipo: "CRIAR_LEAD", client_name: nome },
      });
  }

  const mMover = msg.match(
    /^(?:paz\s+)?(?:mov[ae](?:r)?|mud[ae]|transfer[ei](?:r[ae]?)?|coloca?(?:r)?)\s+(?:o\s+|a\s+)?(.+?)\s+(?:para?|pra|em|no\s+estágio|na\s+etapa)\s+(.+?)$/i,
  );
  if (mMover) {
    const [, nomeCliente, etapaRaw] = mMover;
    return executarAcao({
      sb,
      ownerId,
      evolutionConfig,
      acao: { tipo: "MOVER_CRM", client_name: nomeCliente.trim(), etapa: etapaRaw.trim() },
    });
  }

  const mVenda = msg.match(
    /^(?:paz\s+)?(?:fechei|vend(?:a|i|eu)|vendido|ganho|contrato\s+assinado)\b.*?(?:com\s+)?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-Za-zÀ-Ü][a-zà-ü]+)*)/i,
  );
  if (mVenda) {
    const nomeMatch = mVenda[1]?.trim();
    const valorMatch = msg.match(/r\$?\s*([\d.,]+)/i);
    const valor = valorMatch
      ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."))
      : undefined;
    if (nomeMatch)
      return executarAcao({
        sb,
        ownerId,
        evolutionConfig,
        acao: { tipo: "REGISTRAR_VENDA", client_name: nomeMatch, deal_value: valor },
      });
  }

  const mPerda = msg.match(
    /^(?:paz\s+)?(?:perdeu|perdi|não\s+fechou|negócio\s+perdido)\b.*?(?:com\s+(?:o\s+|a\s+)?)?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-Za-zÀ-Ü][a-zà-ü]+)*)/i,
  );
  if (mPerda) {
    const nomeMatch = mPerda[1]?.trim();
    if (nomeMatch) {
      const motivoMatch = msg.match(/(?:por(?:que)?|motivo)[:\s]+(.+)$/i);
      return executarAcao({
        sb,
        ownerId,
        evolutionConfig,
        acao: {
          tipo: "REGISTRAR_PERDA",
          client_name: nomeMatch,
          motivo: motivoMatch?.[1]?.trim(),
        },
      });
    }
  }

  if (
    /(?:quais|list[ae]|me\s+(?:diz|fala|mostra))\s+(?:os\s+|meus\s+)?clientes|clientes\s+(?:que\s+tenho\s+)?(?:no|do)\s+crm|meus\s+clientes/i.test(
      msg,
    )
  ) {
    const clientes = await buscarClientesAtivos(sb, ownerId);
    if (!clientes.length) return "📭 Nenhum cliente no CRM ainda.";
    return (
      `📋 *Seus ${clientes.length} clientes:*\n` +
      clientes
        .map((c) => {
          const valor = c.valor_negociado
            ? ` — R$ ${c.valor_negociado.toLocaleString("pt-BR")}`
            : "";
          return `• *${c.nome}* — ${CRM_LABELS[c.etapa_funil] ?? c.etapa_funil}${valor}`;
        })
        .join("\n")
    );
  }

  return null;
}

// ─── PAZ: assistente de vendas ────────────────────────────────────────────────

async function paz(params: {
  sb: SupabaseClient;
  mensagem: string;
  evolutionConfig: EvolutionConfig;
  ownerId: string | null;
}): Promise<void> {
  const { sb, mensagem, evolutionConfig, ownerId } = params;

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!openaiKey) {
    await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "⚠️ OpenAI não configurada.").catch(
      () => {},
    );
    return;
  }

  try {
    let pazConversationId: string | null = null;
    let historicoFelipePaz: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (ownerId) {
      pazConversationId = await buscarOuCriarConversaPaz(sb, ownerId);
      if (pazConversationId) {
        historicoFelipePaz = await buscarHistoricoPazMessages(sb, pazConversationId, 12);
      }
    }
    console.log(
      `[PAZ] memória: convId=${pazConversationId ?? "null"}, msgs=${historicoFelipePaz.length}`,
    );

    // ── Tenta executar comando direto (sem IA) ──────────────────────────────────
    const respostaDireta = await executarComandoDireto({
      sb,
      ownerId,
      evolutionConfig,
      mensagem,
    }).catch((err) => {
      console.warn("[PAZ] Erro no comando direto:", err);
      return null;
    });

    if (respostaDireta !== null) {
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
              content: respostaDireta,
              status: "delivered",
              sent_at: now,
              metadata: { source: "paz-direct" },
            },
          ])
          .catch(() => {});
      }
      await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, respostaDireta);
      return;
    }

    // ── Segue para IA ───────────────────────────────────────────────────────────
    const clientesAtivos = await buscarClientesAtivos(sb, ownerId);

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

    const dataAtual = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    });

    let contextoCrm = "";
    if (clientesAtivos.length > 0) {
      contextoCrm =
        `\n\n📋 *Clientes no CRM:*\n` +
        clientesAtivos
          .map((c) => {
            const valor = c.valor_negociado
              ? ` — R$ ${c.valor_negociado.toLocaleString("pt-BR")}`
              : "";
            return `• *${c.nome}* — ${CRM_LABELS[c.etapa_funil] ?? c.etapa_funil}${valor}`;
          })
          .join("\n");
    }

    let contextoDesconhecidos = "";
    if (contatosDesconhecidos.length > 0) {
      const linhas = contatosDesconhecidos.map(
        (m) => `• *${m.push_name}* (+${(m.remote_jid as string)?.split("@")[0] ?? "?"})`,
      );
      contextoDesconhecidos =
        `\n\n📥 *Contatos no WhatsApp sem cadastro no CRM:*\n` + linhas.join("\n");
    }

    // Histórico de conversa do cliente mencionado
    let historicoCliente = "";
    const msgLower = mensagem.toLowerCase();
    for (const c of clientesAtivos) {
      const primeiroNome = c.nome.split(" ")[0].toLowerCase();
      if (primeiroNome.length >= 3 && msgLower.includes(primeiroNome)) {
        const cf = await buscarClientePorNome(sb, ownerId, c.nome);
        if (cf) {
          const { data: conv } = await sb
            .from("conversations")
            .select("id")
            .eq("client_id", cf.id)
            .eq("channel", "whatsapp")
            .eq("status", "open")
            .maybeSingle();
          if (conv) {
            const hist = await buscarHistoricoConversa(sb, conv.id, 20);
            historicoCliente = hist
              ? `\n\n📝 *Conversa com ${c.nome}:*\n${hist}`
              : `\n\n📝 *${c.nome}* está no CRM mas sem mensagens registradas.`;
          }
        }
        break;
      }
    }

    // ── System prompt ────────────────────────────────────────────────────────────
    const systemPrompt =
      `Você é PAZ — a assistente pessoal de vendas do corretor Felipe Paz no WhatsApp.\n\n` +
      `Hoje: ${dataAtual}\n\n` +
      `## COMO FUNCIONA\n` +
      `Felipe te manda mensagens de texto ou áudio descrevendo o dia dele em linguagem natural.\n` +
      `Você extrai as ações necessárias para o CRM e as retorna em JSON estruturado.\n` +
      `IMPORTANTE: você NUNCA envia mensagens para os clientes. Apenas atualiza o CRM e responde ao Felipe.\n\n` +
      `## RETORNE SEMPRE ESTE JSON EXATO\n` +
      `{"resposta":"mensagem natural para Felipe (WhatsApp, use *negrito*, emojis)","acoes":[...array de ações...]}\n\n` +
      `## TIPOS DE AÇÃO DISPONÍVEIS\n` +
      `CRIAR_LEAD: novo cliente/lead. Campos: client_name, client_phone, client_email, etapa\n` +
      `MOVER_CRM: mudar etapa do funil. Campos: client_name, etapa (novo_lead|contato_iniciado|qualificacao|visita_agendada|proposta|negociacao|fechado_ganho|fechado_perdido)\n` +
      `REGISTRAR_ATIVIDADE: atividade JÁ REALIZADA. Campos: client_name, activity_type (CALL|MEETING|VISIT|EMAIL), activity_title, activity_outcome, scheduled_at, completed_at\n` +
      `CRIAR_TAREFA: compromisso FUTURO. Campos: client_name, activity_type, task_title, activity_description, due_at (ISO 8601), priority (LOW|MEDIUM|HIGH|URGENT), location\n` +
      `REGISTRAR_VENDA: negócio FECHADO. Campos: client_name, deal_value (número sem R$)\n` +
      `REGISTRAR_PERDA: negócio perdido. Campos: client_name, motivo\n` +
      `ADICIONAR_NOTA: observação sobre cliente. Campos: client_name, nota\n` +
      `AGENDAR_FOLLOWUP: próximo contato agendado. Campos: client_name, due_at, activity_title\n` +
      `ATUALIZAR_CLIENTE: atualizar dados do cliente. Campos: client_name, client_phone, client_email, temperatura (frio|morno|quente)\n` +
      `CONVERSAR: apenas conversa, sem ação no CRM. Campos: nenhum extra\n\n` +
      `## EXEMPLOS\n` +
      `"Fechei a venda com o João Alves por R$ 45 mil hoje" →\n` +
      `{"resposta":"🎉 Incrível! Venda de R$ 45.000 com João Alves registrada!","acoes":[{"tipo":"REGISTRAR_VENDA","client_name":"João Alves","deal_value":45000}]}\n\n` +
      `"Tive reunião com Maria Lima às 14h, ficou de visitar o apartamento na sexta" →\n` +
      `{"resposta":"✅ Reunião com Maria registrada! Visita agendada para sexta.","acoes":[{"tipo":"REGISTRAR_ATIVIDADE","client_name":"Maria Lima","activity_type":"MEETING","activity_title":"Reunião com Maria Lima","completed_at":"${new Date().toISOString()}"},{"tipo":"CRIAR_TAREFA","client_name":"Maria Lima","activity_type":"VISIT","task_title":"Visita ao apartamento","due_at":"${new Date(Date.now() + 5 * 86400000).toISOString()}"}]}\n\n` +
      `## REGRAS\n` +
      `1. NUNCA invente dados — se faltam infos, use null e mencione na resposta o que está faltando\n` +
      `2. Uma mensagem pode gerar MÚLTIPLAS ações — ex: criar lead + criar tarefa + registrar atividade\n` +
      `3. Datas/horas sempre em ISO 8601 baseadas em: ${dataAtual}\n` +
      `4. "Amanhã" = ${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}, "semana que vem" = ${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}\n` +
      `5. Telefones: apenas dígitos com DDD (sem +55 ou espaços)\n` +
      `6. Se Felipe apenas conversa (perguntas, estratégias), use tipo CONVERSAR com acoes=[]\n` +
      `7. Retorne APENAS o JSON — sem texto fora do JSON\n` +
      `8. EXECUTE IMEDIATAMENTE — NUNCA peça confirmação antes de agir. Nunca diga "Você confirma?", "Posso prosseguir?", "Tem certeza?", "Preciso da sua aprovação explícita". Execute e confirme o resultado na resposta.\n` +
      `9. Se faltar algum dado, salve o básico e pergunte o restante DEPOIS de executar — nunca antes.\n` +
      contextoCrm +
      contextoDesconhecidos +
      historicoCliente;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            ...historicoFelipePaz,
            { role: "user", content: mensagem },
          ],
        }),
      });

      if (!res.ok) {
        await enviarWhatsApp(
          evolutionConfig,
          FELIPE_PHONE,
          "⚠️ Erro ao processar. Tente novamente.",
        );
        return;
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const respostaCompleta = json.choices?.[0]?.message?.content?.trim() ?? "";

      const { texto, acoes } = parsearRespostaIA(respostaCompleta);

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
              metadata: { source: "paz-response", acoes_count: acoes.length },
            },
          ])
          .catch((err) => console.warn("[PAZ] Erro ao salvar histórico:", err));
      }

      if (texto) {
        await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, texto);
      }

      for (const acao of acoes) {
        if (acao.tipo === "CONVERSAR") continue;
        try {
          const resultado = await executarAcao({ sb, ownerId, evolutionConfig, acao });
          if (resultado) await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, resultado);
        } catch (errAcao) {
          console.error(`[PAZ] erro ao executar ação ${acao.tipo}:`, errAcao);
        }
      }
    } catch (err) {
      console.error("[PAZ] erro →", err instanceof Error ? err.message : String(err));
      await enviarWhatsApp(
        evolutionConfig,
        FELIPE_PHONE,
        "⚠️ PAZ com erro. Tente novamente.",
      ).catch(() => {});
    }
  } catch (errFatal) {
    console.error(
      "[PAZ] erro fatal →",
      errFatal instanceof Error ? errFatal.message : String(errFatal),
    );
    await enviarWhatsApp(
      evolutionConfig,
      FELIPE_PHONE,
      `⚠️ PAZ travou: ${errFatal instanceof Error ? errFatal.message.slice(0, 120) : "erro desconhecido"}`,
    ).catch(() => {});
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
  if (config?.instance_name && config.instance_name !== instanceName)
    return new Response("Instance mismatch", { status: 200 });

  let ownerId = integration.owner_id as string | null;
  if (!ownerId) {
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1 });
    ownerId = authData?.users?.[0]?.id ?? null;
  }

  const evolutionConfig: EvolutionConfig = {
    apiKey: (config?.api_key as string) ?? "",
    baseUrl: (
      (config?.base_url as string) ?? "https://evolution-api-production-448e.up.railway.app"
    ).replace(/\/$/, ""),
    instance: (config?.instance_name as string) ?? "prime-crm",
  };

  // ─── Detecta mensagem de Felipe para PAZ ─────────────────────────────────────
  const felipeVariants = normalizePhone(FELIPE_PHONE).map((v) => v.replace(/\D/g, ""));
  // isSelfChat: either remoteJid is Felipe's own number (true self-chat)
  // OR any outgoing message starting with "paz " (fallback for Evolution API routing)
  const isSelfPhone = felipeVariants.includes(rawPhone.replace(/\D/g, ""));
  const isPazFromMe =
    !!key?.fromMe && (content ?? "").trim().toLowerCase().startsWith("paz ");
  const isSelfChat = isSelfPhone || isPazFromMe;

  console.log(
    `[WEBHOOK] fromMe=${key?.fromMe} rawPhone=${rawPhone} isSelfChat=${isSelfChat} instance=${instanceName}`,
  );

  if (isSelfChat) {
    console.log(`[WEBHOOK] Felipe → PAZ: type=${type} content="${content?.slice(0, 60)}"`);

    let mensagemFinal = content;

    if (type === "audio" && attachment?.url) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
      if (openaiKey) {
        await enviarWhatsApp(evolutionConfig, FELIPE_PHONE, "🎙️ _Transcrevendo áudio..._").catch(
          () => {},
        );
        const transcricao = await transcreverAudio(attachment.url as string, openaiKey);
        if (transcricao) {
          mensagemFinal = transcricao;
          console.log(`[WEBHOOK] Áudio transcrito: "${transcricao.slice(0, 100)}"`);
        } else {
          await enviarWhatsApp(
            evolutionConfig,
            FELIPE_PHONE,
            "⚠️ Não consegui transcrever o áudio. Tenta mandar como texto?",
          ).catch(() => {});
          return new Response("OK", { status: 200 });
        }
      }
    }

    if (mensagemFinal) {
      paz({ sb: supabase, mensagem: mensagemFinal, evolutionConfig, ownerId }).catch((err) =>
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
        await supabase
          .from("messages")
          .insert({
            conversation_id: convOut.id,
            direction: "outgoing",
            sender: "Felipe Paz",
            type,
            content,
            status: "delivered",
            sent_at: sentAt,
            metadata: {
              provider_msg_id: key?.id,
              remote_jid: remoteJid,
              source: "whatsapp-direct",
            },
          })
          .catch((err) => console.warn("[WEBHOOK] Erro ao salvar mensagem saída:", err));
      }
    }
    return new Response("OK", { status: 200 });
  }

  // ─── Mensagem de cliente (apenas salva — nenhuma notificação automática) ─────
  const phoneVariants = normalizePhone(rawPhone);
  const { data: clientData } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .or(phoneVariants.flatMap((p) => [`telefone.eq.${p}`, `whatsapp.eq.${p}`]).join(","))
    .maybeSingle();

  if (!clientData) {
    if (!content) return new Response("OK", { status: 200 });

    const { data: allUnknownConvs } = await supabase
      .from("conversations")
      .select("id, metadata")
      .eq("owner_id", ownerId)
      .is("client_id", null);

    const existingUnknownConv = (allUnknownConvs ?? []).find(
      (c) => (c.metadata as Record<string, unknown>)?.remote_jid === remoteJid,
    );
    let unknownConvId: string | null = null;

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

    console.log(`[WEBHOOK] contato desconhecido: ${rawPhone} (${pushName}) — salvo silenciosamente`);
    return new Response("OK", { status: 200 });
  }

  // ─── Cliente cadastrado: salva mensagem, sem notificação ─────────────────────
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

  console.log(`[WEBHOOK] mensagem de ${pushName} salva — aguarda comando do Felipe`);
  return new Response("OK", { status: 200 });
});
