import { useRef, useEffect } from 'react';
import {
  UserPlus, RefreshCw, ArrowRightLeft, Phone, MessageCircle,
  Mail, MapPin, FileText, StickyNote, CheckSquare, Square,
  Send, ThumbsUp, Landmark, Trophy, Calendar, Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimeline } from '../hooks/use-timeline';
import type { TimelineEvent, TimelineEventType } from '../timeline.types';

// ─── Config visual por tipo de evento ────────────────────────────────────────

type EventConfig = {
  icon: React.ComponentType<{ className?: string }>;
  color: string;      // classe Tailwind para o círculo do ícone
  label: string;
};

const EVENT_CONFIG: Record<TimelineEventType, EventConfig> = {
  cliente_criado:        { icon: UserPlus,       color: 'bg-primary/10 text-primary',                          label: 'Cadastro'        },
  cliente_atualizado:    { icon: RefreshCw,       color: 'bg-secondary text-secondary-foreground',              label: 'Atualização'     },
  etapa_alterada:        { icon: ArrowRightLeft,  color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', label: 'Pipeline' },
  followup_realizado:    { icon: CheckSquare,     color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Follow-up' },
  ligacao_realizada:     { icon: Phone,           color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',        label: 'Ligação'    },
  whatsapp_enviado:      { icon: MessageCircle,   color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',    label: 'WhatsApp'   },
  whatsapp_recebido:     { icon: MessageCircle,   color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',    label: 'WhatsApp'   },
  email_enviado:         { icon: Mail,            color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',           label: 'E-mail'     },
  email_recebido:        { icon: Mail,            color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',           label: 'E-mail'     },
  visita_agendada:       { icon: Calendar,        color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',   label: 'Visita'     },
  visita_realizada:      { icon: MapPin,          color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',   label: 'Visita'     },
  documento_anexado:     { icon: FileText,        color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',      label: 'Documento'  },
  nota_adicionada:       { icon: StickyNote,      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Nota'     },
  tarefa_criada:         { icon: Square,          color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', label: 'Tarefa'   },
  tarefa_concluida:      { icon: CheckSquare,     color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Tarefa' },
  proposta_enviada:      { icon: Send,            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400', label: 'Proposta' },
  proposta_aceita:       { icon: ThumbsUp,        color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Proposta' },
  financiamento_iniciado:{ icon: Landmark,        color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',       label: 'Financeiro' },
  venda_concluida:       { icon: Trophy,          color: 'bg-[oklch(0.62_0.16_155/0.12)] text-[oklch(0.45_0.16_155)]',            label: 'Venda'      },
};

// ─── Formatação de data ───────────────────────────────────────────────────────

function formatarData(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (d.toDateString() === hoje.toDateString()) return `Hoje às ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem às ${hora}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + ` às ${hora}`;
}

// ─── Item individual ──────────────────────────────────────────────────────────

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = EVENT_CONFIG[event.event_type];
  const Icon = config.icon;
  const autor = event.author?.display_name ?? event.author?.full_name ?? 'Sistema';

  return (
    <div className="flex gap-3">
      {/* Linha vertical + ícone */}
      <div className="flex flex-col items-center">
        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Conteúdo */}
      <div className={cn('pb-5 flex-1 min-w-0', isLast && 'pb-0')}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{event.title}</p>
          <time className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
            {formatarData(event.created_at)}
          </time>
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-1">{autor}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            {i < 3 && <div className="w-px flex-1 bg-border mt-1 mb-0" style={{ minHeight: 40 }} />}
          </div>
          <div className="pb-5 flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Estado vazio ─────────────────────────────────────────────────────────────

function TimelineVazia() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <RefreshCw className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium">Nenhum evento registrado</p>
      <p className="text-xs text-muted-foreground">
        As ações realizadas neste cliente aparecerão aqui.
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ClienteTimelineProps {
  clienteId: string;
}

export function ClienteTimeline({ clienteId }: ClienteTimelineProps) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTimeline(clienteId);

  // Ref para sentinel de infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <TimelineSkeleton />;

  if (isError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">Erro ao carregar histórico.</p>
      </div>
    );
  }

  const allEvents = data?.pages.flatMap((p) => p.events) ?? [];

  if (allEvents.length === 0) return <TimelineVazia />;

  return (
    <div>
      {allEvents.map((event, index) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={index === allEvents.length - 1 && !hasNextPage}
        />
      ))}

      {/* Sentinel para infinite scroll automático */}
      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center pt-2">
          {isFetchingNextPage ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => fetchNextPage()}
            >
              Carregar mais
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
