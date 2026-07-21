// Processamento de IA para resposta automática no webhook do WhatsApp
// Roda dentro da Edge Function — não importa de src/

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProcessarMensagemIaInput {
  supabase: SupabaseClient;
  clienteId: string;
  conversationId: string;
  mensagem: string;
  telefone: string;
  ownerId: string;
  evolutionConfig: {
    apiKey: string;
    baseUrl: string;
    instance: string;
  };
}

async function buscarChaveAnthropic(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("configuration")
    .eq("provider", "claude")
    .eq("status", "connected")
    .maybeSingle();

  const cfg = (data?.configuration ?? {}) as Record<string, string>;
  return cfg.anthropic_api_key || cfg.api_key || null;
}

async function buscarHistorico(
  supabase: SupabaseClient,
  conversationId: string,
  limite = 10
): Promise<Array<{ sender: string; content: string; direction: string }>> {
  const { data } = await supabase
    .from("messages")
    .select("sender, content, direction")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(limite);

  return (data ?? []).reverse();
}

async function gerarRespostaAnthropic(
  chave: string,
  historico: string,
  mensagemAtual: string
): Promise<string> {
  const prompt = `Você é Felipe Santos, corretor de imóveis autônomo no Brasil. Responda pelo WhatsApp de forma natural, profissional e breve (máximo 3 linhas).

HISTÓRICO RECENTE:
${historico}

ÚLTIMA MENSAGEM DO CLIENTE:
"${mensagemAtual}"

Responda APENAS com o texto da mensagem, sem explicações.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  return json.content?.[0]?.text?.trim() ?? "";
}

async function enviarRespostaEvolution(
  config: ProcessarMensagemIaInput["evolutionConfig"],
  telefone: string,
  texto: string
): Promise<void> {
  const { baseUrl, instance, apiKey } = config;
  const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: telefone,
      text: texto,
      options: { delay: 1200, presence: "composing" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Evolution sendText ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function processarMensagemIa(input: ProcessarMensagemIaInput): Promise<void> {
  const { supabase, clienteId, conversationId, mensagem, telefone, evolutionConfig } = input;

  try {
    const [anthropicKey, historico] = await Promise.all([
      buscarChaveAnthropic(supabase),
      buscarHistorico(supabase, conversationId),
    ]);

    if (!anthropicKey) {
      console.log("IA: chave Anthropic não configurada");
      return;
    }

    const historicoFormatado = historico
      .map((m) => `${m.direction === "outgoing" ? "EU" : m.sender}: ${m.content}`)
      .join("\n");

    const resposta = await gerarRespostaAnthropic(anthropicKey, historicoFormatado, mensagem);

    if (!resposta) {
      console.log("IA: resposta vazia");
      return;
    }

    // Envia pelo WhatsApp
    await enviarRespostaEvolution(evolutionConfig, telefone, resposta);

    // Salva a mensagem de saída no CRM
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      direction: "outgoing",
      sender: "Assistente IA",
      type: "text",
      content: resposta,
      status: "delivered",
      sent_at: new Date().toISOString(),
      metadata: { source: "ai-agent", client_id: clienteId },
    });

    if (error) {
      console.error("IA: erro ao salvar mensagem de saída:", error);
    }
  } catch (err: any) {
    console.error("IA: erro ao processar mensagem:", err?.message ?? err);
  }
}
