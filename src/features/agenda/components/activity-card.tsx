import { CheckSquare, PhoneCall, MapPin, Phone, Users, Mail, User, Clock, AlertCircle, MoreHorizontal, Check, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS, ACTIVITY_STATUS_CLASSES, ACTIVITY_STATUS_LABELS, ACTIVITY_PRIORITY_CLASSES, ACTIVITY_PRIORITY_LABELS } from '../constants';
import type { Activity, ActivityType } from '../types';

const TYPE_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  TASK: CheckSquare, FOLLOWUP: PhoneCall, VISIT: MapPin,
  CALL: Phone, MEETING: Users, EMAIL: Mail, PERSONAL: User,
};

function formatarData(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === amanha.toDateString()) return 'Amanhã';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatarHorario(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface ActivityCardProps {
  activity: Activity;
  onConcluir?: (id: string) => void;
  onCancelar?: (id: string) => void;
  onEditar?: (activity: Activity) => void;
  onDuplicar?: (id: string) => void;
  onRemover?: (id: string) => void;
  compact?: boolean;
}

export function ActivityCard({ activity, onConcluir, onCancelar, onEditar, onDuplicar, onRemover, compact = false }: ActivityCardProps) {
  const Icon = TYPE_ICONS[activity.type];
  const isConcluida = activity.status === 'COMPLETED';
  const isCancelada = activity.status === 'CANCELLED';
  const dataRef = activity.scheduled_at ?? activity.due_at;
  const isAtrasada = dataRef && new Date(dataRef) < new Date() && !isConcluida && !isCancelada;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30', (isConcluida || isCancelada) && 'opacity-60', isAtrasada && 'border-destructive/30 bg-destructive/5')}>
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', ACTIVITY_TYPE_COLORS[activity.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium leading-tight truncate', isConcluida && 'line-through text-muted-foreground')}>{activity.title}</p>
            {!compact && activity.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activity.description}</p>}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-muted-foreground">{ACTIVITY_TYPE_LABELS[activity.type]}</span>
              {dataRef && (
                <span className={cn('text-[10px] flex items-center gap-0.5', isAtrasada ? 'text-destructive' : 'text-muted-foreground')}>
                  {isAtrasada && <AlertCircle className="h-2.5 w-2.5" />}
                  <Clock className="h-2.5 w-2.5" />
                  {formatarData(dataRef)} {formatarHorario(dataRef)}
                </span>
              )}
              <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium', ACTIVITY_STATUS_CLASSES[activity.status])}>{ACTIVITY_STATUS_LABELS[activity.status]}</span>
              {(activity.priority === 'HIGH' || activity.priority === 'URGENT') && (
                <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium', ACTIVITY_PRIORITY_CLASSES[activity.priority])}>{ACTIVITY_PRIORITY_LABELS[activity.priority]}</span>
              )}
              {activity.client?.nome && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{activity.client.nome}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isConcluida && !isCancelada && onConcluir && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" onClick={() => onConcluir(activity.id)} title="Concluir">
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {onEditar && <DropdownMenuItem onClick={() => onEditar(activity)}>Editar</DropdownMenuItem>}
                {onDuplicar && <DropdownMenuItem onClick={() => onDuplicar(activity.id)}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicar</DropdownMenuItem>}
                {!isConcluida && !isCancelada && onConcluir && <DropdownMenuItem onClick={() => onConcluir(activity.id)}><Check className="mr-2 h-3.5 w-3.5" /> Concluir</DropdownMenuItem>}
                {!isCancelada && onCancelar && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onCancelar(activity.id)} className="text-muted-foreground"><X className="mr-2 h-3.5 w-3.5" /> Cancelar</DropdownMenuItem></>)}
                {onRemover && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onRemover(activity.id)} className="text-destructive focus:text-destructive">Remover</DropdownMenuItem></>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
