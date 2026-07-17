import { cn } from '@/lib/utils';
import {
  ETAPA_FUNIL_LABELS,
  PRIORIDADE_CLASSES,
  PRIORIDADE_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  TEMPERATURA_LABELS,
} from '../constants';
import type { ClienteEtapaFunil, ClientePrioridade, ClienteStatus, ClienteTemperatura } from '../types';

function MiniTag({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  );
}

export function StatusBadge({ value }: { value: ClienteStatus }) {
  return <MiniTag label={STATUS_LABELS[value]} className={STATUS_CLASSES[value]} />;
}

export function PrioridadeBadge({ value }: { value: ClientePrioridade }) {
  return <MiniTag label={PRIORIDADE_LABELS[value]} className={PRIORIDADE_CLASSES[value]} />;
}

export function TemperaturaBadge({ value }: { value: ClienteTemperatura }) {
  return <MiniTag label={TEMPERATURA_LABELS[value]} />;
}

export function EtapaFunilBadge({ value }: { value: ClienteEtapaFunil }) {
  return (
    <MiniTag
      label={ETAPA_FUNIL_LABELS[value]}
      className="bg-accent text-accent-foreground"
    />
  );
}
