import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from '@/features/clientes/services/timeline.service';
import { openAIComplete } from '@/lib/ai.functions';
import type { AIAction, AICategory, AIContext, AIMessage, AIProvider, AIProviderName, AIRequest, AIResponse, AIRouterConfig, AIUsageLog, AIUsageSummary } from '../types';
import { DEFAULT_ROUTER_CONFIG } from '../types';

class OpenAIServerProvider implements AIProvider {
  name: AIProviderName = 'openai';
  models = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
  defaultModel = 'gpt-4o-mini';
  async complete(request: AIRequest): Promise<AIResponse> {
    const result = await openAIComplete({
      data: {
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        model: this.defaultModel,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      },
    });
    return {
      content: result.content,
      provider: 'openai',
      model: result.model,
      promptTokens: result.promptTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.totalTokens,
      durationMs: result.durationMs,
      costUsd: 0,
      fromCache: false,
      fromFallback: false,
    };
  }
  async isAvailable(): Promise<boolean> { return true; }
  estimateCost(_tokens: number): number { return 0; }
}


class StubAIProvider implements AIProvider {
  name: AIProviderName; models: string[]; defaultModel: string;
  constructor(name: AIProviderName, models: string[], defaultModel: string) { this.name = name; this.models = models; this.defaultModel = defaultModel; }
  async complete(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    const durationMs = Date.now() - start;
    const promptTokens = Math.ceil(request.messages.reduce((s, m) => s + m.content.length, 0) / 4);
    const outputTokens = 150 + Math.floor(Math.random() * 200);
    return {
      content: `[${this.name.toUpperCase()} — Stub] Resposta simulada para a ação "${request.action}".\n\nQuando as chaves de API forem configuradas em Configurações → IA, este texto será substituído pela resposta real do modelo ${this.defaultModel}.`,
      provider: this.name, model: this.defaultModel,
      promptTokens, outputTokens, totalTokens: promptTokens + outputTokens,
      durationMs, costUsd: 0, fromCache: false, fromFallback: false,
    };
  }
  async isAvailable(): Promise<boolean> { return false; }
  estimateCost(_tokens: number): number { return 0; }
}

const AI_PROVIDERS: Record<AIProviderName, AIProvider> = {
  openai: new StubAIProvider('openai', ['gpt-4o','gpt-4o-mini','gpt-3.5-turbo'], 'gpt-4o'),
  gemini: new StubAIProvider('gemini', ['gemini-1.5-pro','gemini-1.5-flash'], 'gemini-1.5-pro'),
  claude: new StubAIProvider('claude', ['claude-3-5-sonnet-20241022','claude-3-haiku-20240307'], 'claude-3-5-sonnet-20241022'),
  stub:   new StubAIProvider('stub', ['stub'], 'stub'),
};
(AI_PROVIDERS.stub as StubAIProvider).isAvailable = async () => true;

const CACHE = new Map<string, { response: AIResponse; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(request: AIRequest): string {
  return `${request.action}:${request.category}:${request.messages.map((m) => `${m.role}:${m.content}`).join('|')}`;
}

export class AIRouter {
  private config: AIRouterConfig;
  constructor(config: AIRouterConfig = DEFAULT_ROUTER_CONFIG) { this.config = config; }

  async route(request: AIRequest): Promise<AIResponse> {
    if (this.config.cacheEnabled) {
      const key = cacheKey(request);
      const cached = CACHE.get(key);
      if (cached && cached.expiresAt > Date.now()) return { ...cached.response, fromCache: true };
    }
    const preferred = this.config.categoryProviders[request.category] ?? 'openai';
    const order = [preferred, ...this.config.fallbackOrder.filter((p) => p !== preferred)];
    let fallbackFrom: AIProviderName | undefined;
    for (const providerName of order) {
      const provider = AI_PROVIDERS[providerName];
      if (!provider) continue;
      const available = await provider.isAvailable().catch(() => false);
      if (!available) continue;
      try {
        const timeout = this.config.timeouts[providerName] ?? 30_000;
        const response = await Promise.race([
          provider.complete(request),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout`)), timeout)),
        ]);
        if (fallbackFrom) { response.fromFallback = true; response.fallbackFrom = fallbackFrom; }
        if (this.config.cacheEnabled) CACHE.set(cacheKey(request), { response, expiresAt: Date.now() + CACHE_TTL });
        return response;
      } catch { if (!fallbackFrom) fallbackFrom = providerName; }
    }
    const stubResponse = await AI_PROVIDERS.stub.complete(request);
    stubResponse.fromFallback = true; stubResponse.fallbackFrom = fallbackFrom;
    return stubResponse;
  }

  updateConfig(partial: Partial<AIRouterConfig>): void { this.config = { ...this.config, ...partial }; }
}

export const aiRouter = new AIRouter();

export const PromptService = {
  interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  },
  getSystemPrompt(action: AIAction, context: AIContext): string {
    const c = context.client;
    const nome = c?.nome ?? 'o cliente';
    const etapa = c?.etapa_funil ?? '';
    const score = c?.score ?? 0;
    const base = `Você é um assistente especializado em mercado imobiliário, ajudando um corretor autônomo a ser mais produtivo e profissional.\nSempre responda em português brasileiro.\nSeja direto, objetivo e profissional.`;
    const prompts: Partial<Record<AIAction, string>> = {
      criar_whatsapp: `${base}\n\nCrie uma mensagem de WhatsApp profissional e personalizada para ${nome}.\nEtapa no funil: ${etapa}. Score: ${score}/100.\nA mensagem deve ser cordial, direta e gerar engajamento. Máximo 3 parágrafos curtos.`,
      criar_email: `${base}\n\nEscreva um e-mail profissional para ${nome}.\nEtapa: ${etapa}.\nInclua: assunto, saudação, corpo e despedida. Tom profissional e personalizado.`,
      analisar_cliente: `${base}\n\nAnalise o perfil deste cliente:\nNome: ${nome}\nEtapa: ${etapa}\nTemperatura: ${c?.temperatura ?? ''}\nScore: ${score}/100\nObservações: ${c?.observacoes ?? 'nenhuma'}\n\nForneça: análise do momento, próximos passos recomendados, pontos de atenção.`,
      resumir_timeline: `${base}\n\nResumo do histórico de interações com ${nome}.\nCrie um resumo executivo com: principais eventos, status atual, próximas ações recomendadas. Máximo 200 palavras.`,
      resumir_conversa: `${base}\n\nResuma esta conversa com ${nome}.\nDestaque: tom, intenções identificadas, próximos passos. Máximo 150 palavras.`,
      criar_proposta: `${base}\n\nCrie uma proposta comercial profissional para ${nome}.\nInclua: apresentação, benefícios, próximos passos e call-to-action claro.`,
      criar_descricao_imovel: `${base}\n\nCrie uma descrição atraente para um imóvel. Destaque os diferenciais, use linguagem persuasiva, máximo 300 palavras.`,
      criar_anuncio: `${base}\n\nCrie um anúncio para redes sociais sobre um imóvel. Seja criativo, use emojis com moderação. Versões para Instagram e WhatsApp Status.`,
      criar_roteiro_visita: `${base}\n\nCrie um roteiro de visita para apresentar um imóvel a ${nome}. Inclua: pontos de destaque, como abordar objeções, próximos passos após a visita.`,
    };
    return prompts[action] ?? `${base}\n\nExecute a ação solicitada de forma profissional para ${nome}.`;
  },
};

export const ContextBuilder = {
  async buildForClient(clientId: string): Promise<AIContext> {
    const [clientResult, timelineResult] = await Promise.allSettled([
      supabase.from('clients').select('nome,telefone,email,etapa_funil,temperatura,score,observacoes,tags').eq('id', clientId).single(),
      supabase.from('client_timeline').select('event_type,title,created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
    ]);
    const context: AIContext = {};
    if (clientResult.status === 'fulfilled' && clientResult.value.data) {
      const c = clientResult.value.data as Record<string, unknown>;
      context.client = { nome: String(c.nome ?? ''), telefone: (c.telefone as string) ?? null, email: (c.email as string) ?? null, etapa_funil: String(c.etapa_funil ?? ''), temperatura: String(c.temperatura ?? ''), score: Number(c.score ?? 0), observacoes: (c.observacoes as string) ?? null, tags: (c.tags as string[]) ?? [] };
    }
    if (timelineResult.status === 'fulfilled' && timelineResult.value.data) {
      context.recentTimeline = (timelineResult.value.data as Array<Record<string, unknown>>).map((t) => ({ event_type: String(t.event_type), title: String(t.title), created_at: String(t.created_at) }));
    }
    return context;
  },
  buildMessages(systemPrompt: string, userPrompt: string, context: AIContext): AIMessage[] {
    const ctx = context.recentTimeline?.length
      ? `\n\nHistórico recente:\n${context.recentTimeline.map((t) => `- ${t.title} (${new Date(t.created_at).toLocaleDateString('pt-BR')})`).join('\n')}`
      : '';
    return [{ role: 'system', content: systemPrompt + ctx }, { role: 'user', content: userPrompt }];
  },
};

export const UsageService = {
  async log(params: { action: AIAction; category: AICategory; response: AIResponse; clientId?: string; entityType?: string; entityId?: string; status?: 'success' | 'error' | 'fallback' | 'cancelled'; errorMessage?: string; }): Promise<void> {
    const { data: sessionData } = await supabase.auth.getUser();
    const ownerId = sessionData.user?.id;
    if (!ownerId) return;
    try {
      await supabase.from('ai_usage_logs').insert({ owner_id: ownerId, action: params.action, category: params.category, provider: params.response.provider, model: params.response.model, prompt_tokens: params.response.promptTokens, output_tokens: params.response.outputTokens, total_tokens: params.response.totalTokens, cost_usd: params.response.costUsd, duration_ms: params.response.durationMs, status: params.response.fromFallback ? 'fallback' : (params.status ?? 'success'), error_message: params.errorMessage ?? null, fallback_from: params.response.fallbackFrom ?? null, client_id: params.clientId ?? null, entity_type: params.entityType ?? null, entity_id: params.entityId ?? null } as never);
    } catch (e) { console.warn(e); }
  },
  async getSummary(days = 30): Promise<AIUsageSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('ai_usage_logs').select('status,provider,category,total_tokens,cost_usd,duration_ms').gte('created_at', since);
    const logs = (data ?? []) as Array<Record<string, unknown>>;
    const summary: AIUsageSummary = { total_requests: logs.length, success_count: logs.filter((l) => l.status === 'success').length, error_count: logs.filter((l) => l.status === 'error').length, fallback_count: logs.filter((l) => l.status === 'fallback').length, total_tokens: logs.reduce((s, l) => s + (Number(l.total_tokens) || 0), 0), total_cost_usd: logs.reduce((s, l) => s + (Number(l.cost_usd) || 0), 0), avg_duration_ms: logs.length ? logs.reduce((s, l) => s + (Number(l.duration_ms) || 0), 0) / logs.length : 0, by_provider: {}, by_category: {} };
    for (const log of logs) { const p = String(log.provider); const c = String(log.category); summary.by_provider[p] = (summary.by_provider[p] ?? 0) + 1; summary.by_category[c] = (summary.by_category[c] ?? 0) + 1; }
    return summary;
  },
  async getRecentLogs(limit = 20): Promise<AIUsageLog[]> {
    const { data, error } = await supabase.from('ai_usage_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as AIUsageLog[];
  },
};

export const AIService = {
  async execute(params: { action: AIAction; category: AICategory; userPrompt: string; clientId?: string; entityType?: string; entityId?: string; customContext?: string; temperature?: number; maxTokens?: number; }): Promise<AIResponse> {
    const { action, category, userPrompt, clientId, temperature, maxTokens } = params;
    const context = clientId ? await ContextBuilder.buildForClient(clientId) : {};
    if (params.customContext) (context as AIContext).customContext = params.customContext;
    const systemPrompt = PromptService.getSystemPrompt(action, context as AIContext);
    const messages = ContextBuilder.buildMessages(systemPrompt, userPrompt, context as AIContext);
    let response: AIResponse;
    try { response = await aiRouter.route({ messages, action, category, temperature, maxTokens, clientId, entityType: params.entityType, entityId: params.entityId }); }
    catch { response = await AI_PROVIDERS.stub.complete({ messages, action, category }); response.fromFallback = true; }
    UsageService.log({ action, category, response, clientId, entityType: params.entityType, entityId: params.entityId }).catch(console.warn);
    if (clientId) TimelineService.eventoCustomizado(clientId, `IA — ${action.replace(/_/g, ' ')}`, `Modelo: ${response.model}`, 'sistema');
    return response;
  },
};

export const PromptLibrary = {
  async listar(category?: AICategory) {
    let query = supabase.from('ai_prompts').select('*').is('deleted_at', null).order('favorite', { ascending: false }).order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    const { data, error } = await query; if (error) throw error; return data ?? [];
  },
  async criar(payload: Partial<Record<string, unknown>>) {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const { data, error } = await supabase.from('ai_prompts').insert({ ...payload, owner_id: ownerId } as never).select('*').single(); if (error) throw error; return data;
  },
  async atualizar(id: string, payload: Partial<Record<string, unknown>>) {
    const { data, error } = await supabase.from('ai_prompts').update(payload as never).eq('id', id).select('*').single(); if (error) throw error; return data;
  },
  async toggleFavorito(id: string, favorite: boolean) { await supabase.from('ai_prompts').update({ favorite } as never).eq('id', id); },
  async remover(id: string) { await supabase.from('ai_prompts').update({ deleted_at: new Date().toISOString() } as never).eq('id', id); },
};
