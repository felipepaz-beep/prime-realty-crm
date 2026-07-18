export type SettingsCategory = 'perfil' | 'agenda' | 'financeiro' | 'ia' | 'funil' | 'notificacoes' | 'comunicacao' | 'sistema';
export type IntegrationProvider = 'google_calendar' | 'google_drive' | 'openai' | 'gemini' | 'claude' | 'whatsapp' | 'instagram' | 'telegram' | 'messenger' | 'webhook';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface UserSetting { id: string; owner_id: string; category: SettingsCategory; key: string; value: unknown; created_at: string; updated_at: string; }
export interface Integration { id: string; owner_id: string; provider: IntegrationProvider; status: IntegrationStatus; configuration: Record<string, unknown>; last_sync: string | null; created_at: string; updated_at: string; }

export interface AgendaSettings { horario_inicio: string; horario_fim: string; dias_uteis: number[]; duracao_visita: number; duracao_followup: number; lembrete_minutos: number; }
export interface FinanceiroSettings { comissao_padrao: number; meta_mensal: number; moeda: string; }
export interface IASettings { provider_padrao: string; temperatura: number; max_tokens: number; historico_ativo: boolean; }
export interface NotificacoesSettings { followup_lembrete: boolean; tarefa_lembrete: boolean; meta_alerta: boolean; email_resumo: boolean; }
export interface SistemaSettings { tema: 'light' | 'dark' | 'system'; idioma: string; formato_data: string; timezone: string; }

export const DEFAULT_AGENDA_SETTINGS: AgendaSettings = { horario_inicio: '08:00', horario_fim: '18:00', dias_uteis: [1,2,3,4,5], duracao_visita: 60, duracao_followup: 30, lembrete_minutos: 30 };
export const DEFAULT_FINANCEIRO_SETTINGS: FinanceiroSettings = { comissao_padrao: 6, meta_mensal: 0, moeda: 'BRL' };
export const DEFAULT_IA_SETTINGS: IASettings = { provider_padrao: 'openai', temperatura: 0.7, max_tokens: 1000, historico_ativo: true };
export const DEFAULT_NOTIFICACOES_SETTINGS: NotificacoesSettings = { followup_lembrete: true, tarefa_lembrete: true, meta_alerta: true, email_resumo: false };
export const DEFAULT_SISTEMA_SETTINGS: SistemaSettings = { tema: 'system', idioma: 'pt-BR', formato_data: 'dd/MM/yyyy', timezone: 'America/Sao_Paulo' };

export const INTEGRATION_LABELS: Record<IntegrationProvider, string> = { google_calendar: 'Google Calendar', google_drive: 'Google Drive', openai: 'OpenAI (GPT)', gemini: 'Google Gemini', claude: 'Anthropic Claude', whatsapp: 'WhatsApp Business', instagram: 'Instagram Direct', telegram: 'Telegram', messenger: 'Messenger', webhook: 'Webhook' };
export const INTEGRATION_DESCRIPTIONS: Record<IntegrationProvider, string> = { google_calendar: 'Sincronize visitas e compromissos automaticamente', google_drive: 'Salve documentos diretamente no Drive', openai: 'Ative o assistente GPT-4o', gemini: 'Ative a análise de documentos e PDFs', claude: 'Ative análise avançada e resumos', whatsapp: 'Envie e receba mensagens via WhatsApp Business API', instagram: 'Gerencie mensagens do Instagram Direct', telegram: 'Conecte seu bot do Telegram', messenger: 'Integre com o Facebook Messenger', webhook: 'Receba notificações em sistemas externos' };
export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = { connected: 'Conectado', disconnected: 'Não conectado', error: 'Erro na conexão', pending: 'Pendente' };
export const INTEGRATION_STATUS_CLASSES: Record<IntegrationStatus, string> = { connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', disconnected: 'bg-muted text-muted-foreground', error: 'bg-destructive/10 text-destructive', pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
export const SETTINGS_CATEGORIES: Array<{ id: SettingsCategory; label: string; icon: string }> = [ { id: 'perfil', label: 'Perfil', icon: 'User' }, { id: 'agenda', label: 'Agenda', icon: 'Calendar' }, { id: 'financeiro', label: 'Financeiro', icon: 'Wallet' }, { id: 'ia', label: 'Inteligência Artificial', icon: 'Sparkles' }, { id: 'comunicacao', label: 'Comunicação', icon: 'MessageCircle' }, { id: 'notificacoes', label: 'Notificações', icon: 'Bell' }, { id: 'sistema', label: 'Sistema', icon: 'Settings' } ];
