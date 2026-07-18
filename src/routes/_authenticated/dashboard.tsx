import { createFileRoute, Link } from '@tanstack/react-router';
import { Users, TrendingUp, Trophy, AlertCircle, Flame, Clock, ArrowRight, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useMetricas, useFunilDashboard, useFollowupsPendentes, useClientesRecentes } from '@/features/dashboard/hooks/use-dashboard';
import { ETAPA_FUNIL_LABELS, TEMPERATURA_LABELS } from '@/features/clientes/constants';
import { EtapaFunilBadge, PrioridadeBadge } from '@/features/clientes/components/cliente-badge';
import type { ClienteEtapaFunil, ClientePrioridade } from '@/features/clientes/types';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard — Corretor CRM' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
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

function MetricaCard({ titulo, valor, icon: Icon, descricao, destaque }: {
  titulo: string; valor: number | string;
  icon: React.ComponentType<{ className?: string }>;
  descricao?: string; destaque?: boolean;
}) {
  return (
    <Card className={destaque ? 'border-destructive/40 bg-destructive/5' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{titulo}</p>
            <p className="text-2xl font-bold mt-1">{valor}</p>
            {descricao && <p className="text-xs text-muted-foreground mt-1">{descricao}</p>}
          </div>
          <div className={`rounded-md p-2 ${destaque ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data: metricas, isLoading: loadingMetricas } = useMetricas();
  const { data: funil, isLoading: loadingFunil } = useFunilDashboard();
  const { data: followups, isLoading: loadingFollowups } = useFollowupsPendentes();
  const { data: recentes, isLoading: loadingRecentes } = useClientesRecentes();

  const dadosFunil = ETAPA_ORDEM.map((etapa) => ({
    etapa, nome: ETAPA_FUNIL_LABELS[etapa],
    total: funil?.find((f) => f.etapa_funil === etapa)?.total ?? 0,
  }));

  const formatarMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {loadingMetricas ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /></CardContent></Card>
            ))
          ) : (
            <>
              <MetricaCard titulo="Total de clientes" valor={metricas?.total_clientes ?? 0} icon={Users} descricao={`${metricas?.novos_este_mes ?? 0} novos este mês`} />
              <MetricaCard titulo="Leads quentes" valor={metricas?.leads_quentes ?? 0} icon={Flame} descricao={`${metricas?.leads_mornos ?? 0} mornos`} />
              <MetricaCard titulo="Vendas concluídas" valor={metricas?.clientes_ganhos ?? 0} icon={Trophy} descricao={metricas?.receita_total ? formatarMoeda(metricas.receita_total) : undefined} />
              <MetricaCard
                titulo="Follow-ups pendentes"
                valor={(metricas?.followups_atrasados ?? 0) + (metricas?.followups_hoje ?? 0)}
                icon={AlertCircle}
                descricao={`${metricas?.followups_hoje ?? 0} para hoje`}
                destaque={(metricas?.followups_atrasados ?? 0) > 0}
              />
            </>
          )}
        </div>

        {/* Funil + Follow-ups */}
        <div className="grid gap-6 lg:grid-cols-2">

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pipeline</CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link to="/kanban">Ver kanban <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFunil ? <Skeleton className="h-48 w-full rounded-md" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosFunil} barSize={24}>
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.split(' ')[0]} axisLine={false} tickLine={false} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [value, 'Clientes']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {dadosFunil.map((entry) => (
                        <Cell key={entry.etapa} fill={ETAPA_CORES[entry.etapa] ?? '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" /> Follow-ups pendentes
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link to="/clientes">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="divide-y">
              {loadingFollowups ? (
                <div className="space-y-3 py-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : followups?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Nenhum follow-up pendente</p>
                </div>
              ) : (
                followups?.map((f) => (
                  <Link key={f.id} to="/clientes/$clienteId" params={{ clienteId: f.id }}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <EtapaFunilBadge value={f.etapa_funil as ClienteEtapaFunil} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={f.situacao === 'atrasado' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                        {f.situacao === 'atrasado' ? 'Atrasado' : 'Hoje'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{formatarData(f.proximo_followup)}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Clientes recentes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Cadastros recentes
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link to="/clientes">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRecentes ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : recentes?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente cadastrado ainda.</p>
            ) : (
              <div className="divide-y">
                {recentes?.map((c) => (
                  <Link key={c.id} to="/clientes/$clienteId" params={{ clienteId: c.id }}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.origem_lead ?? '—'} · {formatarData(c.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs">{TEMPERATURA_LABELS[c.temperatura as keyof typeof TEMPERATURA_LABELS]}</span>
                      <PrioridadeBadge value={c.prioridade as ClientePrioridade} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
