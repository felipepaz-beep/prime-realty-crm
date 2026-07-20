import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Target, Calendar, FileText, MessageCircle, Sparkles, Download, Printer, ArrowUp, ArrowDown, LayoutDashboard, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAnalyticsKPIs, useFunilConversao, useOrigemLeads, useAtividadesAnalytics, useDocumentosAnalytics, useConversasAnalytics, useFinanceiroRelatorio } from '@/features/relatorios/hooks/use-analytics';
import { ReportsService, MetricsService } from '@/features/relatorios/services/analytics.service';
import { ETAPA_FUNIL_LABELS } from '@/features/clientes/constants';
import type { ClienteEtapaFunil } from '@/features/clientes/types';
import { COMMISSION_STATUS_COLORS, COMMISSION_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/features/financeiro/types';

export const Route = createFileRoute('/_authenticated/relatorios')({
  head: () => ({ meta: [{ title: 'Relatórios — Corretor CRM' }, { name: 'robots', content: 'noindex' }] }),
  component: RelatoriosPage,
});

const CHART_COLORS = ['#34d399','#60a5fa','#a78bfa','#fbbf24','#fb923c','#f87171','#94a3b8','#4ade80'];

const ETAPA_CORES: Record<string, string> = {
  novo_lead: '#94a3b8', contato_iniciado: '#60a5fa', qualificacao: '#a78bfa',
  visita_agendada: '#fbbf24', proposta: '#fb923c', negociacao: '#f87171',
  fechado_ganho: '#34d399', fechado_perdido: '#71717a',
};

function KpiCard({ titulo, valor, icon: Icon, sub, destaque }: { titulo: string; valor: string | number; icon: React.ComponentType<{ className?: string }>; sub?: string; destaque?: boolean }) {
  return (
    <Card className={destaque ? 'border-destructive/30 bg-destructive/5' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{titulo}</p>
            <p className="text-xl font-bold tabular-nums mt-1">{valor}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn('rounded-md p-2 shrink-0', destaque ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return <Card><CardContent className="pt-4 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-16" /></CardContent></Card>;
}

function ExportButton({ data, filename }: { data: Record<string, unknown>[]; filename: string }) {
  const handleExport = useCallback(() => {
    const csv = ReportsService.toCSV(data);
    ReportsService.downloadCSV(csv, filename);
    toast.success('Relatório exportado como CSV!');
  }, [data, filename]);
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExport}>
      <Download className="h-3.5 w-3.5" /> Exportar CSV
    </Button>
  );
}

function RelatorioExecutivo() {
  const { data: kpis, isLoading } = useAnalyticsKPIs();
  const cards = [
    { titulo: 'Total de clientes', valor: kpis?.total_clientes ?? 0, icon: Users },
    { titulo: 'Clientes ativos', valor: kpis?.clientes_ativos ?? 0, icon: Users },
    { titulo: 'Novos este mês', valor: kpis?.novos_este_mes ?? 0, icon: TrendingUp },
    { titulo: 'Vendas concluídas', valor: kpis?.vendas_concluidas ?? 0, icon: Target },
    { titulo: 'Em negociação', valor: kpis?.em_negociacao ?? 0, icon: BarChart3 },
    { titulo: 'Leads perdidos', valor: kpis?.leads_perdidos ?? 0, icon: ArrowDown, destaque: true },
    { titulo: 'Follow-ups atrasados', valor: kpis?.followups_atrasados ?? 0, icon: Calendar, destaque: (kpis?.followups_atrasados ?? 0) > 0 },
    { titulo: 'Taxa de conversão', valor: MetricsService.formatarPct(kpis?.taxa_conversao_geral ?? 0), icon: TrendingUp },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Visão geral do CRM</p>
        <div className="flex items-center gap-1.5">
          {kpis && <ExportButton data={[kpis] as unknown as Record<string, unknown>[]} filename="executivo" />}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => ReportsService.print()}>
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />) :
          cards.map(({ titulo, valor, icon, destaque }) => <KpiCard key={titulo} titulo={titulo} valor={valor} icon={icon} destaque={destaque} />)}
      </div>
      {kpis && (
        <Card><CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <div><p className="text-xs text-muted-foreground">Score médio</p><p className="text-xl font-bold">{kpis.score_medio ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Visitas agendadas</p><p className="text-xl font-bold">{kpis.visitas_agendadas}</p></div>
            <div><p className="text-xs text-muted-foreground">Propostas enviadas</p><p className="text-xl font-bold">{kpis.propostas_enviadas}</p></div>
            <div><p className="text-xs text-muted-foreground">Conversão geral</p><p className="text-xl font-bold text-emerald-600">{MetricsService.formatarPct(kpis.taxa_conversao_geral)}</p></div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

function RelatorioFunil() {
  const { data: funil, isLoading } = useFunilConversao();
  const ORDEM: ClienteEtapaFunil[] = ['novo_lead','contato_iniciado','qualificacao','visita_agendada','proposta','negociacao','fechado_ganho','fechado_perdido'];
  const dadosOrdenados = ORDEM.map((etapa) => {
    const item = funil?.find((f) => f.etapa_funil === etapa);
    return { etapa, nome: ETAPA_FUNIL_LABELS[etapa], total: item?.total ?? 0, pct: item?.pct_total ?? 0 };
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Distribuição do pipeline</p>
        {funil && <ExportButton data={funil as unknown as Record<string, unknown>[]} filename="funil_vendas" />}
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Clientes por etapa</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosOrdenados} barSize={24} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [v, 'Clientes']} />
                  <Bar dataKey="total" radius={[0,4,4,0]}>
                    {dadosOrdenados.map((entry) => <Cell key={entry.etapa} fill={ETAPA_CORES[entry.etapa] ?? '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">% de participação</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {dadosOrdenados.filter((d) => d.total > 0).map((d) => (
                <div key={d.etapa}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground truncate max-w-[160px]">{d.nome}</span>
                    <span className="font-medium tabular-nums">{d.total} ({d.pct}%)</span>
                  </div>
                  <Progress value={d.pct} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function RelatorioClientes() {
  const { data: origem, isLoading } = useOrigemLeads();
  const chartData = (origem ?? []).slice(0, 8).map((o) => ({
    name: o.origem.length > 14 ? o.origem.substring(0, 14) + '…' : o.origem,
    total: o.total, convertidos: o.convertidos,
  }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Origem dos leads e taxa de conversão</p>
        {origem && <ExportButton data={origem as unknown as Record<string, unknown>[]} filename="origem_leads" />}
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Leads por origem</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={20}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" name="Total" fill="#60a5fa" radius={[4,4,0,0]} />
                  <Bar dataKey="convertidos" name="Convertidos" fill="#34d399" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Taxa de conversão por origem</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-52 overflow-auto">
              {(origem ?? []).map((o) => (
                <div key={o.origem}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground truncate max-w-[160px]">{o.origem}</span>
                    <span className="font-medium tabular-nums">{o.total} leads · {o.taxa_conversao ?? 0}%</span>
                  </div>
                  <Progress value={o.taxa_conversao ?? 0} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function RelatorioAtividades() {
  const { data: atividades, isLoading } = useAtividadesAnalytics();
  const TYPE_LABELS: Record<string, string> = { TASK: 'Tarefa', FOLLOWUP: 'Follow-up', VISIT: 'Visita', CALL: 'Ligação', MEETING: 'Reunião', EMAIL: 'E-mail', PERSONAL: 'Pessoal' };
  const porTipo = (atividades ?? []).reduce<Record<string, { total: number; atrasadas: number }>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = { total: 0, atrasadas: 0 };
    acc[a.type].total += a.total; acc[a.type].atrasadas += a.atrasadas;
    return acc;
  }, {});
  const chartData = Object.entries(porTipo).map(([type, vals]) => ({ name: TYPE_LABELS[type] ?? type, total: vals.total, atrasadas: vals.atrasadas }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Atividades por tipo e status</p>
        {atividades && <ExportButton data={atividades as unknown as Record<string, unknown>[]} filename="atividades" />}
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total vs Atrasadas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Total" fill="#60a5fa" radius={[4,4,0,0]} />
                <Bar dataKey="atrasadas" name="Atrasadas" fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RelatorioFinanceiro() {
  const { data, isLoading } = useFinanceiroRelatorio();
  const resumo = data?.resumo;
  const comissoes = data?.comissoes ?? [];
  const cards = [
    { titulo: 'Total previsto', valor: MetricsService.formatarMoeda(resumo?.previsto_total ?? 0), icon: DollarSign },
    { titulo: 'Total recebido', valor: MetricsService.formatarMoeda(resumo?.recebido_total ?? 0), icon: DollarSign },
    { titulo: 'Atrasado', valor: MetricsService.formatarMoeda(resumo?.atrasado_total ?? 0), icon: DollarSign, destaque: (resumo?.atrasado_total ?? 0) > 0 },
    { titulo: 'Recebido este mês', valor: MetricsService.formatarMoeda(resumo?.recebido_mes_atual ?? 0), icon: DollarSign },
  ];
  const handleExport = () => {
    const csv = ReportsService.toCSV(
      comissoes.map((c) => ({
        cliente: c.client?.nome ?? '—',
        valor: c.commission_value,
        status: COMMISSION_STATUS_LABELS[c.status],
        previsao: c.expected_date ?? '',
        recebimento: c.received_date ?? '',
        forma_pagamento: c.payment_method ? PAYMENT_METHOD_LABELS[c.payment_method] : '',
      })),
      { cliente: 'Cliente', valor: 'Valor', status: 'Status', previsao: 'Previsão', recebimento: 'Recebimento', forma_pagamento: 'Forma de pagamento' },
    );
    ReportsService.downloadCSV(csv, 'financeiro');
    toast.success('Relatório exportado como CSV!');
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Comissões e recebimentos</p>
        {comissoes.length > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) :
          cards.map(({ titulo, valor, icon, destaque }) => <KpiCard key={titulo} titulo={titulo} valor={valor} icon={icon} destaque={destaque} />)}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Comissões recentes</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48 w-full" /> : comissoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma comissão registrada ainda.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Previsão</TableHead>
                    <TableHead>Recebimento</TableHead>
                    <TableHead>Forma de pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.client?.nome ?? '—'}</TableCell>
                      <TableCell className="tabular-nums">{MetricsService.formatarMoeda(c.commission_value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs font-normal', COMMISSION_STATUS_COLORS[c.status])}>
                          {COMMISSION_STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.expected_date ? new Date(c.expected_date).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.received_date ? new Date(c.received_date).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.payment_method ? PAYMENT_METHOD_LABELS[c.payment_method] : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RelatorioDocumentos() {
  const { data: documentos, isLoading } = useDocumentosAnalytics();
  const DOC_LABELS: Record<string, string> = { rg: 'RG', cpf: 'CPF', cnh: 'CNH', contrato: 'Contrato', proposta: 'Proposta', matricula: 'Matrícula', escritura: 'Escritura', financiamento: 'Financiamento', fotos: 'Fotos', comprovante_renda: 'Comp. Renda', comprovante_residencia: 'Comp. Residência', documento_pessoal: 'Doc. Pessoal', outros: 'Outros' };
  const chartData = (documentos ?? []).map((d) => ({ name: DOC_LABELS[d.category] ?? d.category, total: d.total }));
  const totalBytes = (documentos ?? []).reduce((s, d) => s + d.total_bytes, 0);
  const totalDocs = (documentos ?? []).reduce((s, d) => s + d.total, 0);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Documentos por categoria</p>
        {documentos && <ExportButton data={documentos as unknown as Record<string, unknown>[]} filename="documentos" />}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard titulo="Total de documentos" valor={totalDocs} icon={FileText} />
        <KpiCard titulo="Armazenamento usado" valor={MetricsService.formatarBytes(totalBytes)} icon={FileText} />
        <KpiCard titulo="Categorias ativas" valor={(documentos ?? []).length} icon={FileText} />
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Documentos por categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" radius={[4,4,0,0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RelatorioComunicacao() {
  const { data: conversas, isLoading } = useConversasAnalytics();
  const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger', telegram: 'Telegram', email: 'E-mail', sms: 'SMS', internal: 'Interno' };
  const porCanal = (conversas ?? []).reduce<Record<string, number>>((acc, c) => { acc[c.channel] = (acc[c.channel] ?? 0) + c.total; return acc; }, {});
  const chartData = Object.entries(porCanal).map(([channel, total]) => ({ name: CHANNEL_LABELS[channel] ?? channel, value: total }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Conversas por canal</p>
        {conversas && <ExportButton data={conversas as unknown as Record<string, unknown>[]} filename="comunicacao" />}
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : chartData.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">Nenhuma conversa registrada ainda.</p></CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por canal</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <PieChart width={300} height={200}>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RelatoriosPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Relatórios e Analytics</h1>
          <p className="text-sm text-muted-foreground">Indicadores consolidados do CRM</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1"><Sparkles className="h-3 w-3" />IA: insights em breve</Badge>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="executivo">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="executivo"   className="gap-1.5 text-xs"><LayoutDashboard className="h-3.5 w-3.5" />Executivo</TabsTrigger>
            <TabsTrigger value="funil"       className="gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" />Funil</TabsTrigger>
            <TabsTrigger value="clientes"    className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Clientes</TabsTrigger>
            <TabsTrigger value="atividades"  className="gap-1.5 text-xs"><Calendar className="h-3.5 w-3.5" />Atividades</TabsTrigger>
            <TabsTrigger value="financeiro"  className="gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" />Financeiro</TabsTrigger>
            <TabsTrigger value="documentos"  className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Documentos</TabsTrigger>
            <TabsTrigger value="comunicacao" className="gap-1.5 text-xs"><MessageCircle className="h-3.5 w-3.5" />Comunicação</TabsTrigger>
          </TabsList>
          <TabsContent value="executivo"><RelatorioExecutivo /></TabsContent>
          <TabsContent value="funil"><RelatorioFunil /></TabsContent>
          <TabsContent value="clientes"><RelatorioClientes /></TabsContent>
          <TabsContent value="atividades"><RelatorioAtividades /></TabsContent>
          <TabsContent value="financeiro"><RelatorioFinanceiro /></TabsContent>
          <TabsContent value="documentos"><RelatorioDocumentos /></TabsContent>
          <TabsContent value="comunicacao"><RelatorioComunicacao /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
