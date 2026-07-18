import type { ActivityPriority, ActivityStatus, ActivityType } from './types';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  TASK: 'Tarefa', FOLLOWUP: 'Follow-up', VISIT: 'Visita',
  CALL: 'Ligação', MEETING: 'Reunião', EMAIL: 'E-mail', PERSONAL: 'Pessoal',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  TASK:     'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  FOLLOWUP: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  VISIT:    'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  CALL:     'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  MEETING:  'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  EMAIL:    'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  PERSONAL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  PENDING: 'Pendente', IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída', CANCELLED: 'Cancelada',
};

export const ACTIVITY_STATUS_CLASSES: Record<ActivityStatus, string> = {
  PENDING:     'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED:   'bg-destructive/10 text-destructive',
};

export const ACTIVITY_PRIORITY_LABELS: Record<ActivityPriority, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};

export const ACTIVITY_PRIORITY_CLASSES: Record<ActivityPriority, string> = {
  LOW:    'bg-muted text-muted-foreground',
  MEDIUM: 'bg-secondary text-secondary-foreground',
  HIGH:   'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-destructive/10 text-destructive',
};

export const ACTIVITY_TYPES: ActivityType[] = [
  'TASK','FOLLOWUP','VISIT','CALL','MEETING','EMAIL','PERSONAL',
];
