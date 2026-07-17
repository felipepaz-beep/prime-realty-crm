import type {
  ClienteEtapaFunil,
  ClientePrioridade,
  ClienteStatus,
  ClienteTemperatura,
} from './types';

export const STATUS_LABELS: Record<ClienteStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  perdido: 'Perdido',
  ganho: 'Ganho',
};

export const STATUS_CLASSES: Record<ClienteStatus, string> = {
  ativo: 'bg-primary/10 text-primary',
  inativo: 'bg-muted text-muted-foreground',
  perdido: 'bg-destructive/10 text-destructive',
  ganho: 'bg-[oklch(0.62_0.16_155/0.12)] text-[oklch(0.62_0.16_155)]',
};

export const ETAPA_FUNIL_LABELS: Record<ClienteEtapaFunil, string> = {
  novo_lead: 'Novo lead',
  contato_iniciado: 'Contato iniciado',
  qualificacao: 'Qualificação',
  visita_agendada: 'Visita agendada',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado_ganho: 'Fechado (ganho)',
  fechado_perdido: 'Fechado (perdido)',
};

export const ETAPA_FUNIL_ORDEM: ClienteEtapaFunil[] = [
  'novo_lead',
  'contato_iniciado',
  'qualificacao',
  'visita_agendada',
  'proposta',
  'negociacao',
  'fechado_ganho',
  'fechado_perdido',
];

export const PRIORIDADE_LABELS: Record<ClientePrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const PRIORIDADE_CLASSES: Record<ClientePrioridade, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-secondary text-secondary-foreground',
  alta: 'bg-[oklch(0.75_0.15_75/0.15)] text-[oklch(0.55_0.15_75)]',
  urgente: 'bg-destructive/10 text-destructive',
};

export const TEMPERATURA_LABELS: Record<ClienteTemperatura, string> = {
  frio: '🧊 Frio',
  morno: '🌡️ Morno',
  quente: '🔥 Quente',
};
