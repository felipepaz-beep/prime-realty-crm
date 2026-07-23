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

async function buscarChaveOpenAI(supabase: SupabaseClient): Promise<string | null> {
  const envKey = Deno.env.get("OPENAI_API_KEY");
  if (envKey) return envKey;

  const { data } = await supabase
    .from("integrations")
    .select("configuration")
    .eq("provider", "openai")
    .eq("status", "connected")
    .maybeSingle();

  const cfg = (data?.configuration ?? {}) as Record<string, string>;
  return cfg.openai_api_key || cfg.api_key || null;
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

async function gerarRespostaOpenAI(
  chave: string,
  historico: string,
  mensagemAtual: string
): Promise<string> {
  const systemPrompt = `Você é Felipe Santos, corretor de imóveis autônomo no Brasil. Responda pelo WhatsApp de forma natural, profissional e breve (máximo 3 linhas). Responda APENAS com o texto da mensagem, sem explicações.`;

  const userPrompt = `HISTÓRICO RECENTE:
${historico}

ÚLTIMA MENSAGEM DO CLIENTE:
"${mensagemAtual}"`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
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
    const [openaiKey, historico] = await Promise.all([
      buscarChaveOpenAI(supabase),
      buscarHistorico(supabase, conversationId),
    ]);

    if (!openaiKey) {
      console.log("IA: chave OpenAI não configurada");
      return;
    }

    const historicoFormatado = historico
      .map((m) => `${m.direction === "outgoing" ? "EU" : m.sender}: ${m.content}`)
      .join("\n");

    const resposta = await gerarRespostaOpenAI(openaiKey, historicoFormatado, mensagem);

    if (!resposta) {
      console.log("IA: resposta vazia");
      return;
    }

    await enviarRespostaEvolution(evolutionConfig, telefone, resposta);

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
