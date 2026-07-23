import { supabase } from '@/integrations/supabase/client';
import { openAIComplete } from '@/lib/ai.functions';

export interface MensagemConversa {
  id: string;
  direction: string;
  sender: string | null;
  content: string | null;
  sent_at: string;
  type: string;
}

export interface AnaliseConversa {
  score: number;
  etapa_detectada: string;
  resumo: string;
  pontos_positivos: string[];
  pontos_negativos: string[];
  proximos_passos: string[];
}

export interface MensagemCopiloto {
  role: 'user' | 'assistant';
  content: string;
}

export const CopilotoService = {
  async buscarMensagensCliente(clientId: string): Promise<MensagemConversa[]> {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .is('deleted_at', null);

    if (!convs?.length) return [];

    const ids = convs.map((c: { id: string }) => c.id);

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('id, direction, sender, content, sent_at, type')
      .in('conversation_id', ids)
      .is('deleted_at', null)
      .not('content', 'is', null)
      .order('sent_at', { ascending: true })
      .limit(120);

    if (error) throw error;
    return (msgs ?? []) as MensagemConversa[];
  },

  async analisarConversa(clienteNome: string, mensagens: MensagemConversa[]): Promise<AnaliseConversa> {
    if (!mensagens.length) {
      return {
        score: 0,
        etapa_detectada: 'Sem histórico',
        resumo: 'Nenhuma conversa registrada para este cliente.',
        pontos_positivos: [],
        pontos_negativos: [],
        proximos_passos: ['Iniciar o primeiro contato com o cliente.'],
      };
    }

    const transcript = mensagens
      .filter((m) => m.content)
      .map((m) => `[${m.direction === 'incoming' ? clienteNome : 'Corretor'}]: ${m.content}`)
      .join('\n');

    const systemPrompt = `Você é um especialista em vendas imobiliárias. Analise a conversa entre um corretor autônomo e o cliente "${clienteNome}".

Responda APENAS com um JSON válido, sem markdown, neste formato exato:
{
  "score": <número inteiro 0-100 indicando temperatura de compra>,
  "etapa_detectada": "<uma das etapas: Novo lead | Contato iniciado | Qualificação | Visita agendada | Proposta | Negociação | Fechado>",
  "resumo": "<resumo executivo da conversa em 2-3 frases, em português>",
  "pontos_positivos": ["<ponto>", "<ponto>"],
  "pontos_negativos": ["<ponto>", "<ponto>"],
  "proximos_passos": ["<ação concreta>", "<ação concreta>", "<ação concreta>"]
}`;

    const result = await openAIComplete({
      data: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversa a analisar:\n\n${transcript.slice(0, 6000)}` },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 900,
      },
    });

    try {
      const json = result.content.replace(/^```(?:json)?\n?|\n?```$/gm, '').trim();
      return JSON.parse(json) as AnaliseConversa;
    } catch {
      return {
        score: 50,
        etapa_detectada: 'Indefinido',
        resumo: result.content.slice(0, 300),
        pontos_positivos: [],
        pontos_negativos: [],
        proximos_passos: [],
      };
    }
  },

  async chatCopiloto(params: {
    clienteNome: string;
    mensagens: MensagemConversa[];
    historico: MensagemCopiloto[];
    pergunta: string;
  }): Promise<string> {
    const { clienteNome, mensagens, historico, pergunta } = params;

    const transcript = mensagens
      .filter((m) => m.content)
      .slice(-50)
      .map((m) => `[${m.direction === 'incoming' ? clienteNome : 'Corretor'}]: ${m.content}`)
      .join('\n');

    const systemPrompt = `Você é um copiloto de vendas imobiliárias. Você tem acesso ao histórico de conversa entre o corretor e o cliente "${clienteNome}".

Histórico da conversa (${mensagens.length} mensagens):
${transcript || 'Sem mensagens registradas ainda.'}

Seja direto, prático e foque em ajudar o corretor a fechar o negócio. Responda em português brasileiro.`;

    const result = await openAIComplete({
      data: {
        messages: [
          { role: 'system', content: systemPrompt },
          ...historico.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: pergunta },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.6,
        maxTokens: 700,
      },
    });

    return result.content;
  },
};
