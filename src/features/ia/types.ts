export type AIProviderName = 'openai' | 'gemini' | 'claude' | 'stub';

export type AICategory =
  | 'whatsapp' | 'email' | 'cliente' | 'followup' | 'marketing'
  | 'funil' | 'documento' | 'resumo' | 'analise' | 'financeiro' | 'relatorio' | 'geral';

export type AIAction =
  | 'responder_cliente' | 'criar_whatsapp' | 'criar_email' | 'criar_followup'
  | 'criar_observacao' | 'criar_tarefa' | 'criar_proposta' | 'criar_roteiro_visita'
  | 'criar_anuncio' | 'criar_descricao_imovel' | 'resumir_timeline' | 'resumir_conversa'
  | 'analisar_cliente' | 'extrair_dados_documento' | 'sugerir_resposta' | 'custom';

export interface AIProvider {
  name: AIProviderName;
  models: string[];
  defaultModel: string;
  complete(request: AIRequest): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  estimateCost(tokens: number): number;
}

export interface AIMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  action: AIAction;
  category: AICategory;
  clientId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  provider: AIProviderName;
  model: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  costUsd: number;
  fromCache?: boolean;
  fromFallback?: boolean;
  fallbackFrom?: AIProviderName;
}

export interface AIRouterConfig {
  categoryProviders: Record<AICategory, AIProviderName>;
  fallbackOrder: AIProviderName[];
  timeouts: Record<AIProviderName, number>;
  cacheEnabled: boolean;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export const DEFAULT_ROUTER_CONFIG: AIRouterConfig = {
  categoryProviders: {
    whatsapp: 'openai', email: 'openai', cliente: 'claude', followup: 'openai',
    marketing: 'openai', funil: 'claude', documento: 'gemini', resumo: 'claude',
    analise: 'claude', financeiro: 'claude', relatorio: 'claude', geral: 'openai',
  },
  fallbackOrder: ['openai', 'claude', 'gemini', 'stub'],
  timeouts: { openai: 30_000, gemini: 30_000, claude: 30_000, stub: 1_000 },
  cacheEnabled: true,
  defaultTemperature: 0.7,
  defaultMaxTokens: 1_000,
};

export interface AIPrompt {
  id: string; owner_id: string; name: string; description: string | null;
  category: AICategory; content: string;
  variables: Array<{ name: string; description: string }>;
  provider: AIProviderName | null; favorite: boolean; is_system: boolean;
  version: number; metadata: Record<string, unknown>;
  created_at: string; updated_at: string; deleted_at: string | null;
}

export interface AIUsageLog {
  id: string; owner_id: string; action: AIAction; category: AICategory;
  provider: AIProviderName; model: string;
  prompt_tokens: number | null; output_tokens: number | null; total_tokens: number | null;
  cost_usd: number | null; duration_ms: number | null;
  status: 'success' | 'error' | 'fallback' | 'cancelled';
  error_message: string | null; fallback_from: string | null;
  client_id: string | null; entity_type: string | null; entity_id: string | null;
  metadata: Record<string, unknown>; created_at: string;
}

export interface AIUsageSummary {
  total_requests: number; success_count: number; error_count: number; fallback_count: number;
  total_tokens: number; total_cost_usd: number; avg_duration_ms: number;
  by_provider: Record<string, number>; by_category: Record<string, number>;
}

export interface AIContext {
  client?: { nome: string; telefone: string | null; email: string | null; etapa_funil: string; temperatura: string; score: number; observacoes: string | null; tags: string[]; };
  recentMessages?: Array<{ direction: string; content: string | null; sent_at: string }>;
  recentTimeline?: Array<{ event_type: string; title: string; created_at: string }>;
  documentSummary?: string;
  customContext?: string;
}

export const AI_CATEGORY_LABELS: Record<AICategory, string> = {
  whatsapp: 'WhatsApp', email: 'E-mail', cliente: 'Cliente', followup: 'Follow-up',
  marketing: 'Marketing', funil: 'Funil', documento: 'Documento', resumo: 'Resumo',
  analise: 'Análise', financeiro: 'Financeiro', relatorio: 'Relatório', geral: 'Geral',
};

export const AI_ACTION_LABELS: Record<AIAction, string> = {
  responder_cliente: 'Responder cliente', criar_whatsapp: 'Criar WhatsApp',
  criar_email: 'Criar e-mail', criar_followup: 'Criar follow-up',
  criar_observacao: 'Criar observação', criar_tarefa: 'Criar tarefa',
  criar_proposta: 'Criar proposta', criar_roteiro_visita: 'Criar roteiro de visita',
  criar_anuncio: 'Criar anúncio', criar_descricao_imovel: 'Criar descrição do imóvel',
  resumir_timeline: 'Resumir histórico', resumir_conversa: 'Resumir conversa',
  analisar_cliente: 'Analisar cliente', extrair_dados_documento: 'Extrair dados do documento',
  sugerir_resposta: 'Sugerir resposta', custom: 'Prompt personalizado',
};

export const PROVIDER_LABELS: Record<AIProviderName, string> = {
  openai: 'OpenAI (GPT)', gemini: 'Google Gemini', claude: 'Anthropic Claude', stub: 'Simulado',
};

export const PROVIDER_COLORS: Record<AIProviderName, string> = {
  openai:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  gemini:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  claude:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  stub:    'bg-muted text-muted-foreground',
};

export const AI_CATEGORIES: AICategory[] = [
  'whatsapp','email','cliente','followup','marketing',
  'funil','documento','resumo','analise','financeiro','relatorio','geral',
];

export const QUICK_ACTIONS: Array<{ action: AIAction; category: AICategory; icon: string }> = [
  { action: 'responder_cliente',      category: 'cliente',   icon: 'MessageSquare' },
  { action: 'criar_whatsapp',         category: 'whatsapp',  icon: 'MessageCircle' },
  { action: 'criar_email',            category: 'email',     icon: 'Mail' },
  { action: 'criar_followup',         category: 'followup',  icon: 'Phone' },
  { action: 'resumir_timeline',       category: 'resumo',    icon: 'FileText' },
  { action: 'resumir_conversa',       category: 'resumo',    icon: 'AlignLeft' },
  { action: 'analisar_cliente',       category: 'analise',   icon: 'BarChart2' },
  { action: 'criar_proposta',         category: 'documento', icon: 'FileCheck' },
  { action: 'criar_descricao_imovel', category: 'marketing', icon: 'Home' },
  { action: 'criar_roteiro_visita',   category: 'cliente',   icon: 'MapPin' },
  { action: 'criar_anuncio',          category: 'marketing', icon: 'Megaphone' },
  { action: 'criar_tarefa',           category: 'followup',  icon: 'CheckSquare' },
];
