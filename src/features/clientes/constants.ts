import type {
  ClienteEtapaFunil,
  ClientePrioridade,
  ClienteStatus,
  ClienteTemperatura,
} from './types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const STATUS_LABELS: Record<ClienteStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  perdido: 'Perdido',
  ganho: 'Ganho',
};

export const STATUS_BADGE_VARIANT: Record<ClienteStatus, BadgeVariant> = {
  ativo: 'default',
  inativo: 'secondary',
  perdido: 'destructive',
  ganho: 'default',
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

export const PRIORIDADE_BADGE_VARIANT: Record<ClientePrioridade, BadgeVariant> = {
  baixa: 'outline',
  media: 'secondary',
  alta: 'default',
  urgente: 'destructive',
};

export const TEMPERATURA_LABELS: Record<ClienteTemperatura, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};
