import { useRef, useEffect, useState } from 'react';
import {
  UserPlus, RefreshCw, ArrowRightLeft, Phone, MessageCircle,
  Mail, MapPin, FileText, StickyNote, CheckSquare, Square,
  Send, ThumbsUp, Landmark, Trophy, Calendar, Loader2,
  Search, Filter, X, CalendarDays, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTimeline } from '../hooks/use-timeline';
import type { TimelineCategory, TimelineEvent, TimelineEventType, TimelineFiltros, TimelineGrupo } from '../timeline.types';

type EventConfig = { icon: React.ComponentType<{ className?: string }>; color: string; label: string };

const EVENT_CONFIG: Record<TimelineEventType, EventConfig> = {
  cliente_criado:         { icon: UserPlus,       color: 'bg-primary/10 text-primary', label: 'Cadastro' },
  cliente_atualizado:     { icon: RefreshCw,      color: 'bg-secondary text-secondary-foreground', label: 'Atualização' },
  cliente_deletado:       { icon: Trash2,         color: 'bg-destructive/10 text-destructive', label: 'Remoção' },
  etapa_alterada:         { icon: ArrowRightLeft, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', label: 'Pipeline' },
  followup_criado:        { icon: Calendar,       color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Follow-up' },
  followup_realizado:     { icon: CheckSquare,    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Follow-up' },
  tarefa_criada:          { icon: Square,         color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', label: 'Tarefa' },
  tarefa_concluida:       { icon: CheckSquare,    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Tarefa' },
  ligacao_realizada:      { icon: Phone,          color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', label: 'Ligação' },
  ligacao_recebida:       { icon: Phone,          color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', label: 'Ligação' },
  whatsapp_enviado:       { icon: MessageCircle,  color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', label: 'WhatsApp' },
  whatsapp_recebido:      { icon: MessageCircle,  color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', label: 'WhatsApp' },
  email_enviado:          { icon: Mail,           color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400', label: 'E-mail' },
  email_recebido:         { icon: Mail,           color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400', label: 'E-mail' },
  visita_agendada:        { icon: Calendar,       color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', label: 'Visita' },
  visita_realizada:       { icon: MapPin,         color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', label: 'Visita' },
  documento_anexado:      { icon: FileText,       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: 'Documento' },
  documento_removido:     { icon: FileText,       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: 'Documento' },
  nota_adicionada:        { icon: StickyNote,     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Nota' },
  nota_atualizada:        { icon: StickyNote,     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Nota' },
  proposta_enviada:       { icon: Send,           color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400', label: 'Proposta' },
  proposta_aceita:        { icon: ThumbsUp,       color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Proposta' },
  financiamento_iniciado: { icon: Landmark,       color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400', label: 'Financeiro' },
  financiamento_aprovado: { icon: Landmark,       color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400', label: 'Financeiro' },
  venda_concluida:        { icon: Trophy,         color: 'bg-[oklch(0.62_0.16_155/0.12)] text-[oklch(0.45_0.16_155)]', label: 'Venda' },
  evento_customizado:     { icon: CalendarDays,   color: 'bg-muted text-muted-foreground', label: 'Evento' },
};

const CATEGORIA_LABELS: Record<TimelineCategory, string> = {
  ciclo_vida: 'Ciclo de vida', pipeline: 'Pipeline', comunicacao: 'Comunicação',
  visita: 'Visita', documento: 'Documento', tarefa: 'Tarefa', negocio: 'Negócio', sistema: 'Sistema',
};

const CATEGORIAS: TimelineCategory[] = [
  'ciclo_vida','pipeline','comunicacao','visita','documento','tarefa','negocio',
];

function agruparPorDia(events: TimelineEvent[]): TimelineGrupo[] {
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const semanaPassada = new Date(hoje); semanaPassada.setDate(hoje.getDate() - 7);
  const grupos = new Map<string, TimelineGrupo>();
  for (const event of events) {
    const d = new Date(event.created_at);
    let label: string;
    if (d.toDateString() === hoje.toDateString()) label = 'Hoje';
    else if (d.toDateString() === ontem.toDateString()) label = 'Ontem';
    else if (d > semanaPassada) label = 'Últimos 7 dias';
    else label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!grupos.has(label)) grupos.set(label, { label, events: [] });
    grupos.get(label)!.events.push(event);
  }
  return Array.from(grupos.values());
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG['evento_customizado'];
  const Icon = config.icon;
  const autor = event.author?.display_name ?? event.author?.full_name ?? 'Sistema';
  const hora = new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className={cn('pb-5 flex-1 min-w-0', isLast && 'pb-0')}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{event.title}</p>
          <time className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">{hora}</time>
        </div>
        {event.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>}
        <p className="text-[11px] text-muted-foreground/60 mt-1">{autor}</p>
      </div>
    </div>
  );
}

function GrupoSeparador({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            {i < 3 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 40 }} />}
          </div>
          <div className="pb-5 flex-1 space-y-1.5">
            <div className="flex justify-between"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-12" /></div>
            <Skeleton className="h-3 w-56" /><Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineVazia({ comFiltros }: { comFiltros: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <RefreshCw className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium">{comFiltros ? 'Nenhum evento encontrado' : 'Nenhum evento registrado'}</p>
      <p className="text-xs text-muted-foreground">{comFiltros ? 'Tente ajustar os filtros.' : 'As ações realizadas neste cliente aparecerão aqui.'}</p>
    </div>
  );
}

export function ClienteTimeline({ clienteId }: { clienteId: string }) {
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [categorias, setCategorias] = useState<TimelineCategory[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const filtros: TimelineFiltros = {
    busca: buscaDebounced || undefined,
    categoria: categorias.length === 1 ? categorias[0] : undefined,
  };

  const temFiltros = !!buscaDebounced || categorias.length > 0;
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useTimeline(clienteId, filtros);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleCategoria = (cat: TimelineCategory) =>
    setCategorias((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  const allEvents = data?.pages.flatMap((p) => p.events) ?? [];
  const grupos = agruparPorDia(allEvents);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar no histórico..." className="pl-9 h-8 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {busca && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setBusca('')}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
              {categorias.length > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{categorias.length}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Categoria</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORIAS.map((cat) => (
              <DropdownMenuCheckboxItem key={cat} checked={categorias.includes(cat)} onCheckedChange={() => toggleCategoria(cat)} className="text-sm">
                {CATEGORIA_LABELS[cat]}
              </DropdownMenuCheckboxItem>
            ))}
            {categorias.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={() => setCategorias([])}>Limpar filtros</Button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? <TimelineSkeleton /> : isError ? (
        <div className="py-8 text-center"><p className="text-sm text-destructive">Erro ao carregar histórico.</p></div>
      ) : allEvents.length === 0 ? <TimelineVazia comFiltros={temFiltros} /> : (
        <div>
          {grupos.map((grupo) => (
            <div key={grupo.label}>
              <GrupoSeparador label={grupo.label} />
              {grupo.events.map((event, index) => (
                <TimelineItem key={event.id} event={event} isLast={index === grupo.events.length - 1 && grupo === grupos[grupos.length - 1] && !hasNextPage} />
              ))}
            </div>
          ))}
          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center pt-2">
              {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => fetchNextPage()}>Carregar mais</Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
