import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Users, TrendingUp, Trophy, AlertCircle, Flame, Clock, ArrowRight,
  CalendarClock, CheckSquare, Phone, MapPin, PhoneCall, Mail, User,
  Search, X, Building2, Target, UserCheck, Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useMetricas, useFunilDashboard, useFollowupsPendentes, useClientesPrioritarios,
  useAtividadesDoDia, useAtividadesAtrasadas, useAtividadesHoje, useIndicadores, usePesquisaGlobal,
} from '@/features/dashboard/hooks/use-dashboard';
import { useConcluirActivity } from '@/features/agenda/hooks/use-activities';
import { ETAPA_FUNIL_LABELS } from '@/features/clientes/constants';
import { EtapaFunilBadge, PrioridadeBadge, TemperaturaBadge } from '@/features/clientes/components/cliente-badge';
import { ACTIVITY_TYPE_COLORS } from '@/features/agenda/constants';
import type { ClienteEtapaFunil, ClientePrioridade, ClienteTemperatura } from '@/features/clientes/types';
import type { ActivityType } from '@/features/agenda/types';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [{ title: 'Dashboard — Corretor CRM' }, { name: 'robots', content: 'noindex' }] }),
  component: DashboardPage,
});

const ETAPA_CORES: Record<string, string> = {
  novo_lead: '#94a3b8', contato_iniciado: '#60a5fa', qualificacao: '#a78bfa',
  visita_agendada: '#fbbf24', proposta: '#fb923c', negociacao: '#f87171',
  fechado_ganho: '#34d399', fechado_perdido: '#71717a',
};
const ETAPA_ORDEM: ClienteEtapaFunil[] = [
  'novo_lead','contato_iniciado','qualificacao','visita_agendada',
  'proposta','negociacao','fechado_ganho','fechado_perdido',
];
const ACTIVITY_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  TASK: CheckSquare, FOLLOWUP: PhoneCall, VISIT: MapPin,
  CALL: Phone, MEETING: Users, EMAIL: Mail, PERSONAL: User,
};

function formatarMoeda(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function formatarHorario(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function formatarDataCurta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso); const hoje = new Date();
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  if (d.toDateString() === hoje.toDateString()) return `Hoje ${formatarHorario(iso)}`;
  if (d.toDateString() === amanha.toDateString()) return `Amanhã ${formatarHorario(iso)}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function CardSkeleton() {
  return <Card><CardContent className="pt-6 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-32" /></CardContent></Card>;
}

interface MetricaCardProps {
  titulo: string; valor: number | string;
  icon: React.ComponentType<{ className?: string }>;
  descricao?: string; tooltip?: string; destaque?: boolean; onClick?: () => void;
}
function MetricaCard({ titulo, valor, icon: Icon, descricao, tooltip, destaque, onClick }: MetricaCardProps) {
  const card = (
    <Card className={['transition-all', destaque ? 'border-destructive/40 bg-destructive/5' : '', onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''].join(' ')} onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{titulo}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{valor}</p>
            {descricao && <p className="text-xs text-muted-foreground mt-1">{descricao}</p>}
          </div>
          <div className={`rounded-md p-2 shrink-0 ${destaque ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (!tooltip) return card;
  return (
    <Tooltip><TooltipTrigger asChild>{card}</TooltipTrigger><TooltipContent><p className="text-xs">{tooltip}</p></TooltipContent></Tooltip>
  );
}

function PesquisaGlobal() {
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');
  const [aberta, setAberta] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: resultados, isLoading } = usePesquisaGlobal(termo);
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setAberta(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente, telefone, e-mail, código do imóvel..." className="pl-9 pr-8"
          value={termo} onChange={(e) => { setTermo(e.target.value); setAberta(true); }} onFocus={() => setAberta(true)} />
        {termo && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => { setTermo(''); setAberta(false); }}><X className="h-3 w-3" /></Button>}
      </div>
      {aberta && termo.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden">
          {isLoading ? <div className="p-3 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          : resultados?.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado</div>
          : <div className="py-1">{resultados?.map((r) => (
              <button key={r.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                onClick={() => { navigate({ to: '/clientes/$clienteId', params: { clienteId: r.id } }); setAberta(false); setTermo(''); }}>
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.telefone || r.whatsapp || r.email || r.codigo_imovel || '—'}</p>
                </div>
                <EtapaFunilBadge value={r.etapa_funil as ClienteEtapaFunil} />
              </button>
            ))}</div>}
        </div>
      )}
    </div>
  );
}

function MeuDia() {
  const { data: hoje, isLoading: loadingHoje } = useAtividadesDoDia();
  const { data: atrasadas, isLoading: loadingAtrasadas } = useAtividadesAtrasadas();
  const concluir = useConcluirActivity();
  const handleConcluir = useCallback(async (id: string) => { await concluir.mutateAsync(id); toast.success('Concluída!'); }, [concluir]);
  const todas = [
    ...(atrasadas ?? []).map((a) => ({ ...a, _atrasada: true })),
    ...(hoje ?? []).filter((a) => !atrasadas?.some((at) => at.id === a.id)).map((a) => ({ ...a, _atrasada: false })),
  ];
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Meu dia</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/agenda">Ver agenda <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent>
        {(loadingHoje || loadingAtrasadas) ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        : todas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <CheckSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade para hoje</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-1.5 pr-2">
              {todas.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type as ActivityType] ?? CheckSquare;
                return (
                  <div key={a.id} className={['flex items-center gap-2.5 rounded-md p-2 group', a._atrasada ? 'bg-destructive/5 border border-destructive/20' : 'hover:bg-muted/40'].join(' ')}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${ACTIVITY_TYPE_COLORS[a.type as ActivityType]}`}><Icon className="h-3.5 w-3.5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <div className="flex items-center gap-1.5">
                        {a._atrasada && <span className="text-[10px] text-destructive font-medium">Atrasada</span>}
                        {!a._atrasada && <span className="text-[10px] text-muted-foreground">{formatarHorario(a.scheduled_at ?? a.due_at)}</span>}
                        {a.client?.nome && <span className="text-[10px] text-muted-foreground truncate">{a.client.nome}</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-opacity" onClick={() => handleConcluir(a.id)}><CheckSquare className="h-3.5 w-3.5" /></Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function ClientesPrioritarios() {
  const { data, isLoading } = useClientesPrioritarios();
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5"><Target className="h-4 w-4" /> Clientes prioritários</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/clientes">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        : data?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente ativo.</p>
        : (
          <div className="divide-y">
            {data?.map((c) => (
              <Link key={c.id} to="/clientes/$clienteId" params={{ clienteId: c.id }}
                className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <TemperaturaBadge value={c.temperatura as ClienteTemperatura} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <EtapaFunilBadge value={c.etapa_funil as ClienteEtapaFunil} />
                    <span className="text-[10px] text-muted-foreground">Score {c.score}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <PrioridadeBadge value={c.prioridade as ClientePrioridade} />
                  {c.proximo_followup && <p className="text-[10px] text-muted-foreground mt-0.5">{formatarDataCurta(c.proximo_followup)}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FunilVendas() {
  const { data: funil, isLoading } = useFunilDashboard();
  const { data: indicadores } = useIndicadores();
  const navigate = useNavigate();
  const dadosFunil = ETAPA_ORDEM.map((etapa) => ({ etapa, nome: ETAPA_FUNIL_LABELS[etapa], total: funil?.find((f) => f.etapa_funil === etapa)?.total ?? 0 }));
  const totalAtivos = dadosFunil.reduce((s, d) => s + (d.etapa !== 'fechado_ganho' && d.etapa !== 'fechado_perdido' ? d.total : 0), 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5"><Zap className="h-4 w-4" /> Funil de vendas</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/kanban">Kanban <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full rounded-md" /> : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dadosFunil} barSize={22}>
                <XAxis dataKey="nome" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.split(' ')[0]} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <RechartsTooltip formatter={(value: number) => [value, 'Clientes']} contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => navigate({ to: '/kanban' })}>
                  {dadosFunil.map((entry) => <Cell key={entry.etapa} fill={ETAPA_CORES[entry.etapa] ?? '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {indicadores && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                <div className="text-center"><p className="text-[10px] text-muted-foreground">Em negociação</p><p className="text-sm font-bold">{totalAtivos}</p></div>
                <div className="text-center"><p className="text-[10px] text-muted-foreground">Potencial</p><p className="text-sm font-bold">{formatarMoeda(indicadores.receita_potencial)}</p></div>
                <div className="text-center"><p className="text-[10px] text-muted-foreground">Score médio</p><p className="text-sm font-bold">{indicadores.score_medio ?? '—'}</p></div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Indicadores() {
  const { data, isLoading } = useIndicadores();
  const { data: atvsHoje } = useAtividadesHoje();
  const itens = [
    { label: 'Clientes inativos (+30d)', valor: data?.clientes_inativos ?? 0, icon: UserCheck, destaque: (data?.clientes_inativos ?? 0) > 5 },
    { label: 'Atividades atrasadas', valor: atvsHoje?.atrasadas ?? 0, icon: AlertCircle, destaque: (atvsHoje?.atrasadas ?? 0) > 0 },
    { label: 'Visitas hoje', valor: atvsHoje?.visitas_hoje ?? 0, icon: MapPin, destaque: false },
    { label: 'Tarefas pendentes', valor: atvsHoje?.tarefas_hoje ?? 0, icon: CheckSquare, destaque: false },
  ];
  if (isLoading) return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {itens.map(({ label, valor, icon: Icon, destaque }) => (
        <div key={label} className={['rounded-lg border p-3 space-y-1', destaque ? 'border-destructive/30 bg-destructive/5' : 'bg-card'].join(' ')}>
          <div className="flex items-center gap-1.5"><Icon className={`h-3.5 w-3.5 ${destaque ? 'text-destructive' : 'text-muted-foreground'}`} /><p className="text-[10px] text-muted-foreground">{label}</p></div>
          <p className={`text-xl font-bold tabular-nums ${destaque ? 'text-destructive' : ''}`}>{valor}</p>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { data: metricas, isLoading: loadingMetricas } = useMetricas();
  const { data: followups, isLoading: loadingFollowups } = useFollowupsPendentes();
  const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <PesquisaGlobal />
        </div>

        <div className="flex-1 p-6 space-y-6 max-w-[1400px] mx-auto w-full">

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {loadingMetricas ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : (
              <>
                <MetricaCard titulo="Clientes ativos" valor={metricas?.clientes_ativos ?? 0} icon={Users} descricao={`${metricas?.total_clientes ?? 0} total`} tooltip="Clientes com status ativo" onClick={() => navigate({ to: '/clientes' })} />
                <MetricaCard titulo="Leads novos" valor={metricas?.novos_este_mes ?? 0} icon={TrendingUp} descricao="este mês" tooltip="Cadastrados no mês atual" onClick={() => navigate({ to: '/clientes' })} />
                <MetricaCard titulo="Follow-ups hoje" valor={metricas?.followups_hoje ?? 0} icon={CalendarClock} descricao={`${metricas?.followups_atrasados ?? 0} atrasados`} tooltip="Follow-ups para hoje" destaque={(metricas?.followups_atrasados ?? 0) > 0} onClick={() => navigate({ to: '/agenda' })} />
                <MetricaCard titulo="Leads quentes" valor={metricas?.leads_quentes ?? 0} icon={Flame} descricao={`${metricas?.leads_mornos ?? 0} mornos`} tooltip="Temperatura quente" />
                <MetricaCard titulo="Vendas no mês" valor={metricas?.clientes_ganhos ?? 0} icon={Trophy} descricao={metricas?.receita_total ? formatarMoeda(metricas.receita_total) : '—'} tooltip="Negócios fechados ganhos" />
                <MetricaCard titulo="Em negociação" valor={(metricas?.clientes_ativos ?? 0) - (metricas?.clientes_ganhos ?? 0)} icon={Building2} descricao="negócios abertos" tooltip="Clientes ativos não fechados" onClick={() => navigate({ to: '/kanban' })} />
              </>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2"><MeuDia /></div>
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Indicadores</p>
              <Indicadores />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <FunilVendas />
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5"><Phone className="h-4 w-4" /> Follow-ups pendentes</CardTitle>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/agenda">Ver agenda <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingFollowups ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                : followups?.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center gap-2">
                    <Clock className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Nenhum follow-up pendente</p>
                  </div>
                ) : (
                  <ScrollArea className="h-56">
                    <div className="divide-y pr-2">
                      {followups?.map((f) => (
                        <Link key={f.id} to="/clientes/$clienteId" params={{ clienteId: f.id }}
                          className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{f.nome}</p>
                            <EtapaFunilBadge value={f.etapa_funil as ClienteEtapaFunil} />
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant={f.situacao === 'atrasado' ? 'destructive' : 'outline'} className="text-[10px] h-5">{f.situacao === 'atrasado' ? 'Atrasado' : 'Hoje'}</Badge>
                            <span className="text-[10px] text-muted-foreground">{formatarData(f.proximo_followup)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <ClientesPrioritarios />

        </div>
      </div>
    </TooltipProvider>
  );
}
