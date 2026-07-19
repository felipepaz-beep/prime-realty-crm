import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Trophy,
  Target,
  Plus,
  CheckCircle,
  Pencil,
  XCircle,
  BarChart3,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  useFinanceiroResumo,
  useFluxoMensal,
  useCommissions,
  useCriarComissao,
  useMarcarRecebida,
  useRemoverComissao,
  useGoalMes,
  useSalvarMeta,
} from '@/features/financeiro/hooks/use-financeiro';
import { CommissionForm } from '@/features/financeiro/components/commission-form';
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  type CommissionFiltros,
  type CommissionStatus,
} from '@/features/financeiro/types';
import { GoalService } from '@/features/financeiro/services/goal.service';
import { goalSchema, type CommissionFormValues, type GoalFormValues } from '@/features/financeiro/schemas';

export const Route = createFileRoute('/_authenticated/financeiro')({
  head: () => ({
    meta: [
      { title: 'Financeiro — Corretor CRM' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: FinanceiroPage,
});

const fmt = (v: number) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d: string | null | undefined) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── Métrica ─────────────────────────────────────────────────────

function MetricCard({
  titulo,
  valor,
  icon: Icon,
  sub,
}: {
  titulo: string;
  valor: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{titulo}</p>
            <p className="mt-1 text-xl font-semibold text-foreground truncate">{valor}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard financeiro ────────────────────────────────────────

function DashboardFinanceiro() {
  const { data: resumo, isLoading } = useFinanceiroResumo();
  const { data: fluxo } = useFluxoMensal();
  const { month, year } = GoalService.mesAtual();
  const { data: meta } = useGoalMes(month, year);

  const percentualMeta = GoalService.calcularPercentual(
    Number(resumo?.recebido_mes_atual ?? 0),
    Number(meta?.goal_commission ?? 0),
  );

  const fluxoChart = (fluxo ?? [])
    .slice(0, 6)
    .reverse()
    .map((f) => ({
      mes: MESES[parseInt(f.mes.split('-')[1], 10) - 1],
      realizado: Number(f.realizado ?? 0),
      previsto: Number(f.previsto ?? 0),
    }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          titulo="Recebido no mês"
          valor={fmt(Number(resumo?.recebido_mes_atual ?? 0))}
          icon={Wallet}
        />
        <MetricCard
          titulo="Previsto no mês"
          valor={fmt(Number(resumo?.previsto_mes_atual ?? 0))}
          icon={TrendingUp}
        />
        <MetricCard
          titulo="Recebido total"
          valor={fmt(Number(resumo?.recebido_total ?? 0))}
          icon={Trophy}
          sub={`${resumo?.qtd_recebidas ?? 0} comissões`}
        />
        <MetricCard
          titulo="Previsto total"
          valor={fmt(Number(resumo?.previsto_total ?? 0))}
          icon={DollarSign}
          sub={`${resumo?.qtd_previstas ?? 0} comissões`}
        />
        <MetricCard
          titulo="Atrasado"
          valor={fmt(Number(resumo?.atrasado_total ?? 0))}
          icon={Clock}
        />
      </div>

      {meta && Number(meta.goal_commission) > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Meta de comissão — {MESES[month - 1]}/{year}
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground">{percentualMeta}%</span>
            </div>
            <Progress value={percentualMeta} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmt(Number(resumo?.recebido_mes_atual ?? 0))} recebido</span>
              <span>Meta: {fmt(Number(meta.goal_commission))}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {fluxoChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Fluxo dos últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fluxoChart}>
                  <XAxis dataKey="mes" fontSize={11} stroke="currentColor" opacity={0.6} />
                  <YAxis fontSize={11} stroke="currentColor" opacity={0.6} />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{ fontSize: 11, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Lista de comissões ───────────────────────────────────────────

function Comissoes() {
  const [filtros, setFiltros] = useState<CommissionFiltros>({});
  const [criando, setCriando] = useState(false);
  const { data, isLoading } = useCommissions(filtros);
  const criar = useCriarComissao();
  const marcar = useMarcarRecebida();
  const remover = useRemoverComissao();

  const handleCriar = async (values: CommissionFormValues) => {
    await criar.mutateAsync(values);
    setCriando(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <Select
          value={filtros.status ?? 'todos'}
          onValueChange={(v) =>
            setFiltros((f) => ({
              ...f,
              status: v === 'todos' ? undefined : (v as CommissionStatus),
            }))
          }
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(COMMISSION_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar por código ou observação..."
          className="md:max-w-sm"
          value={filtros.busca ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({ ...f, busca: e.target.value || undefined }))
          }
        />

        <div className="md:ml-auto">
          <Button onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova comissão
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma comissão encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre sua primeira comissão clicando no botão acima.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.data.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-foreground">
                      {fmt(Number(c.commission_value))}
                    </span>
                    <Badge variant="outline" className={COMMISSION_STATUS_COLORS[c.status]}>
                      {COMMISSION_STATUS_LABELS[c.status]}
                    </Badge>
                    {c.property_code && (
                      <Badge variant="secondary" className="text-xs">
                        {c.property_code}
                      </Badge>
                    )}
                    {c.client?.nome && (
                      <span className="text-xs text-muted-foreground">
                        · {c.client.nome}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {Number(c.commission_percentage)}% de {fmt(Number(c.gross_value))}
                    </span>
                    <span>Previsão: {fmtData(c.expected_date)}</span>
                    {c.received_date && <span>Recebido: {fmtData(c.received_date)}</span>}
                    {c.payment_method && <span>{PAYMENT_METHOD_LABELS[c.payment_method]}</span>}
                  </div>
                </div>

                <div className="flex gap-2 md:justify-end">
                  {c.status !== 'recebida' && c.status !== 'cancelada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcar.mutate({ id: c.id, clientId: c.client_id })}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Receber
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Remover esta comissão?')) remover.mutate(c.id);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova comissão</DialogTitle>
          </DialogHeader>
          <CommissionForm
            onSubmit={handleCriar}
            onCancel={() => setCriando(false)}
            isLoading={criar.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Metas ───────────────────────────────────────────────────────

function Metas() {
  const { month, year } = GoalService.mesAtual();
  const [mes, setMes] = useState(month);
  const [ano, setAno] = useState(year);
  const { data: meta, isLoading } = useGoalMes(mes, ano);
  const salvar = useSalvarMeta();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    values: {
      month: mes,
      year: ano,
      goal_value: Number(meta?.goal_value ?? 0),
      goal_sales: Number(meta?.goal_sales ?? 0),
      goal_commission: Number(meta?.goal_commission ?? 0),
    },
  });

  const handleSalvar = async (values: GoalFormValues) => {
    await salvar.mutateAsync(values);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Meta de {MESES[mes - 1]}/{ano}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSalvar)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="goal_commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de comissão (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goal_sales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de vendas (quantidade)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goal_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de VGV (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={salvar.isPending}>
                    {salvar.isPending ? 'Salvando...' : 'Salvar meta'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────

function FinanceiroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Comissões, metas e recebimentos</p>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="resumo">
            <DashboardFinanceiro />
          </TabsContent>
          <TabsContent value="comissoes">
            <Comissoes />
          </TabsContent>
          <TabsContent value="metas">
            <Metas />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
