import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { User, Calendar, Wallet, Sparkles, MessageCircle, Bell, Settings, ChevronRight, Shield, Download, Upload, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings, useSalvarSettings, useIntegrations, useDesconectarIntegration } from '@/features/configuracoes/hooks/use-settings';
import { DEFAULT_AGENDA_SETTINGS, DEFAULT_FINANCEIRO_SETTINGS, DEFAULT_IA_SETTINGS, DEFAULT_NOTIFICACOES_SETTINGS, INTEGRATION_DESCRIPTIONS, INTEGRATION_LABELS, INTEGRATION_STATUS_CLASSES, INTEGRATION_STATUS_LABELS } from '@/features/configuracoes/types';
import type { AgendaSettings, FinanceiroSettings, IASettings, IntegrationProvider, IntegrationStatus, NotificacoesSettings } from '@/features/configuracoes/types';

export const Route = createFileRoute('/_authenticated/configuracoes')({
  head: () => ({ meta: [{ title: 'Configurações — Corretor CRM' }, { name: 'robots', content: 'noindex' }] }),
  component: ConfiguracoesPage,
});

function IntegrationCard({ provider, status, onDesconectar }: { provider: IntegrationProvider; status: IntegrationStatus; onDesconectar: () => void }) {
  const isConnected = status === 'connected';
  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{INTEGRATION_LABELS[provider]}</p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', INTEGRATION_STATUS_CLASSES[status])}>{INTEGRATION_STATUS_LABELS[status]}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{INTEGRATION_DESCRIPTIONS[provider]}</p>
      </div>
      <div className="shrink-0">
        {isConnected ? (
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDesconectar}>Desconectar</Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Conectar <ChevronRight className="ml-1 h-3 w-3" /></Button>
        )}
      </div>
    </div>
  );
}

function AgendaConfig() {
  const { data: raw, isLoading } = useSettings('agenda');
  const salvar = useSalvarSettings('agenda');
  const [local, setLocal] = useState<AgendaSettings>(DEFAULT_AGENDA_SETTINGS);
  useEffect(() => { setLocal({ ...DEFAULT_AGENDA_SETTINGS, ...(raw as Partial<AgendaSettings>) }); }, [raw]);
  const DIAS = [{ v: 1, l: 'Seg' },{ v: 2, l: 'Ter' },{ v: 3, l: 'Qua' },{ v: 4, l: 'Qui' },{ v: 5, l: 'Sex' },{ v: 6, l: 'Sáb' },{ v: 0, l: 'Dom' }];
  const toggleDia = (dia: number) => setLocal((p) => ({ ...p, dias_uteis: p.dias_uteis.includes(dia) ? p.dias_uteis.filter((d) => d !== dia) : [...p.dias_uteis, dia].sort() }));
  const handleSalvar = async () => { await salvar.mutateAsync(local as unknown as Record<string, unknown>); toast.success('Configurações de agenda salvas!'); };
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Horário comercial</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Início</Label><Input type="time" className="mt-1" value={local.horario_inicio} onChange={(e) => setLocal((p) => ({ ...p, horario_inicio: e.target.value }))} /></div>
          <div><Label className="text-xs">Fim</Label><Input type="time" className="mt-1" value={local.horario_fim} onChange={(e) => setLocal((p) => ({ ...p, horario_fim: e.target.value }))} /></div>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Dias de trabalho</p>
        <div className="flex gap-1.5">
          {DIAS.map(({ v, l }) => (
            <button key={v} onClick={() => toggleDia(v)} className={cn('h-8 w-10 rounded-md text-xs font-medium transition-colors', local.dias_uteis.includes(v) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>{l}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2"><Label className="text-xs">Duração padrão da visita</Label><span className="text-sm font-medium">{local.duracao_visita} min</span></div>
          <Slider min={15} max={180} step={15} value={[local.duracao_visita]} onValueChange={([v]) => setLocal((p) => ({ ...p, duracao_visita: v }))} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><Label className="text-xs">Duração padrão do follow-up</Label><span className="text-sm font-medium">{local.duracao_followup} min</span></div>
          <Slider min={5} max={120} step={5} value={[local.duracao_followup]} onValueChange={([v]) => setLocal((p) => ({ ...p, duracao_followup: v }))} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><Label className="text-xs">Lembrete antecipado</Label><span className="text-sm font-medium">{local.lembrete_minutos} min antes</span></div>
          <Slider min={5} max={120} step={5} value={[local.lembrete_minutos]} onValueChange={([v]) => setLocal((p) => ({ ...p, lembrete_minutos: v }))} />
        </div>
      </div>
      <Button onClick={handleSalvar} disabled={salvar.isPending} className="w-full">{salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar configurações de agenda</Button>
    </div>
  );
}

function FinanceiroConfig() {
  const { data: raw, isLoading } = useSettings('financeiro');
  const salvar = useSalvarSettings('financeiro');
  const [local, setLocal] = useState<FinanceiroSettings>(DEFAULT_FINANCEIRO_SETTINGS);
  useEffect(() => { setLocal({ ...DEFAULT_FINANCEIRO_SETTINGS, ...(raw as Partial<FinanceiroSettings>) }); }, [raw]);
  const handleSalvar = async () => { await salvar.mutateAsync(local as unknown as Record<string, unknown>); toast.success('Configurações financeiras salvas!'); };
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <div className="flex items-center justify-between mb-2"><Label className="text-xs">Percentual padrão de comissão</Label><span className="text-sm font-medium">{local.comissao_padrao}%</span></div>
        <Slider min={0.5} max={20} step={0.5} value={[local.comissao_padrao]} onValueChange={([v]) => setLocal((p) => ({ ...p, comissao_padrao: v }))} />
        <p className="text-xs text-muted-foreground mt-1">Valor pré-preenchido ao criar uma nova comissão.</p>
      </div>
      <div>
        <Label className="text-xs">Meta mensal padrão (R$)</Label>
        <Input type="number" min="0" className="mt-1" placeholder="Ex: 15000" value={local.meta_mensal || ''} onChange={(e) => setLocal((p) => ({ ...p, meta_mensal: parseFloat(e.target.value) || 0 }))} />
      </div>
      <Button onClick={handleSalvar} disabled={salvar.isPending} className="w-full">{salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar configurações financeiras</Button>
    </div>
  );
}

function IAConfig() {
  const { data: raw, isLoading } = useSettings('ia');
  const salvar = useSalvarSettings('ia');
  const [local, setLocal] = useState<IASettings>(DEFAULT_IA_SETTINGS);
  useEffect(() => { setLocal({ ...DEFAULT_IA_SETTINGS, ...(raw as Partial<IASettings>) }); }, [raw]);
  const handleSalvar = async () => { await salvar.mutateAsync(local as unknown as Record<string, unknown>); toast.success('Configurações de IA salvas!'); };
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Label className="text-xs">Modelo padrão</Label>
        <Select value={local.provider_padrao} onValueChange={(v) => setLocal((p) => ({ ...p, provider_padrao: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI (GPT-4o) — Recomendado</SelectItem>
            <SelectItem value="claude">Anthropic Claude 3.5</SelectItem>
            <SelectItem value="gemini">Google Gemini 1.5 Pro</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Configure as chaves de API na aba Integrações.</p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div><Label className="text-xs">Temperatura</Label><p className="text-xs text-muted-foreground">0 = mais focado · 1 = mais criativo</p></div>
          <span className="text-sm font-medium">{local.temperatura.toFixed(1)}</span>
        </div>
        <Slider min={0} max={1} step={0.1} value={[local.temperatura]} onValueChange={([v]) => setLocal((p) => ({ ...p, temperatura: v }))} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><Label className="text-xs">Máximo de tokens por resposta</Label><span className="text-sm font-medium">{local.max_tokens}</span></div>
        <Slider min={200} max={4000} step={100} value={[local.max_tokens]} onValueChange={([v]) => setLocal((p) => ({ ...p, max_tokens: v }))} />
      </div>
      <div className="flex items-center justify-between">
        <div><Label className="text-xs">Manter histórico de respostas</Label><p className="text-xs text-muted-foreground">Salva as últimas respostas no AI Hub</p></div>
        <Switch checked={local.historico_ativo} onCheckedChange={(v) => setLocal((p) => ({ ...p, historico_ativo: v }))} />
      </div>
      <Button onClick={handleSalvar} disabled={salvar.isPending} className="w-full">{salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar configurações de IA</Button>
    </div>
  );
}

function NotificacoesConfig() {
  const { data: raw, isLoading } = useSettings('notificacoes');
  const salvar = useSalvarSettings('notificacoes');
  const [local, setLocal] = useState<NotificacoesSettings>(DEFAULT_NOTIFICACOES_SETTINGS);
  useEffect(() => { setLocal({ ...DEFAULT_NOTIFICACOES_SETTINGS, ...(raw as Partial<NotificacoesSettings>) }); }, [raw]);
  const itens = [
    { key: 'followup_lembrete', label: 'Lembrete de follow-ups', desc: 'Notifica antes do horário agendado' },
    { key: 'tarefa_lembrete',   label: 'Lembrete de tarefas',    desc: 'Alerta de tarefas próximas do prazo' },
    { key: 'meta_alerta',       label: 'Alertas de meta',        desc: 'Quando atingir 75% e 100% da meta mensal' },
    { key: 'email_resumo',      label: 'Resumo por e-mail',      desc: 'Receba um resumo semanal do CRM' },
  ];
  const handleSalvar = async () => { await salvar.mutateAsync(local as unknown as Record<string, unknown>); toast.success('Notificações configuradas!'); };
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-3">
        {itens.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-2">
            <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
            <Switch checked={local[key as keyof NotificacoesSettings] as boolean} onCheckedChange={(v) => setLocal((p) => ({ ...p, [key]: v }))} />
          </div>
        ))}
      </div>
      <Button onClick={handleSalvar} disabled={salvar.isPending} className="w-full">{salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar notificações</Button>
    </div>
  );
}

function IntegracoesConfig() {
  const { data: integrations, isLoading } = useIntegrations();
  const desconectar = useDesconectarIntegration();
  const AI_PROVIDERS: IntegrationProvider[] = ['openai','gemini','claude'];
  const COMUNICACAO: IntegrationProvider[] = ['whatsapp','instagram','telegram','messenger'];
  const PRODUTIVIDADE: IntegrationProvider[] = ['google_calendar','google_drive'];
  const getStatus = (p: IntegrationProvider): IntegrationStatus => integrations?.find((i) => i.provider === p)?.status ?? 'disconnected';
  const handleDesconectar = async (p: IntegrationProvider) => { if (!confirm(`Desconectar ${INTEGRATION_LABELS[p]}?`)) return; await desconectar.mutateAsync(p); toast.success('Integração desconectada.'); };
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" />Inteligência Artificial</CardTitle><CardDescription className="text-xs">Configure as chaves de API para ativar o AI Hub</CardDescription></CardHeader>
        <CardContent>
          {AI_PROVIDERS.map((p) => <IntegrationCard key={p} provider={p} status={getStatus(p)} onDesconectar={() => handleDesconectar(p)} />)}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">🔒 As chaves de API são armazenadas criptografadas e nunca expostas no frontend.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4" />Comunicação</CardTitle><CardDescription className="text-xs">Conecte canais de mensagem para a Central de Comunicação</CardDescription></CardHeader>
        <CardContent>{COMUNICACAO.map((p) => <IntegrationCard key={p} provider={p} status={getStatus(p)} onDesconectar={() => handleDesconectar(p)} />)}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Produtividade</CardTitle><CardDescription className="text-xs">Sincronize com ferramentas do Google</CardDescription></CardHeader>
        <CardContent>{PRODUTIVIDADE.map((p) => <IntegrationCard key={p} provider={p} status={getStatus(p)} onDesconectar={() => handleDesconectar(p)} />)}</CardContent>
      </Card>
    </div>
  );
}

function SistemaConfig() {
  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between"><div><p className="text-sm">Autenticação de dois fatores</p><p className="text-xs text-muted-foreground">Proteja sua conta com 2FA</p></div><Button size="sm" variant="outline" className="h-7 text-xs" disabled>Em breve</Button></div>
          <Separator />
          <div className="flex items-center justify-between"><div><p className="text-sm">Log de acessos</p><p className="text-xs text-muted-foreground">Histórico de logins e ações</p></div><Button size="sm" variant="outline" className="h-7 text-xs" disabled>Em breve</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" />Backup e Dados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between"><div><p className="text-sm">Exportar dados</p><p className="text-xs text-muted-foreground">Baixe todos os seus dados em CSV</p></div><Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" disabled><Download className="h-3.5 w-3.5" />Exportar</Button></div>
          <Separator />
          <div className="flex items-center justify-between"><div><p className="text-sm">Importar dados</p><p className="text-xs text-muted-foreground">Importe clientes via CSV</p></div><Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" disabled><Upload className="h-3.5 w-3.5" />Importar</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Sobre o CRM</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between"><span>Versão</span><Badge variant="secondary" className="text-xs">1.0.0</Badge></div>
          <div className="flex justify-between"><span>Stack</span><span className="text-xs">TanStack + Supabase + React 19</span></div>
          <div className="flex justify-between"><span>Módulos ativos</span><span className="text-xs">12 de 13</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfiguracoesPage() {
  const ABAS = [
    { id: 'perfil',       label: 'Perfil',       icon: User },
    { id: 'agenda',       label: 'Agenda',       icon: Calendar },
    { id: 'financeiro',   label: 'Financeiro',   icon: Wallet },
    { id: 'ia',           label: 'IA',           icon: Sparkles },
    { id: 'integracoes',  label: 'Integrações',  icon: Zap },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'sistema',      label: 'Sistema',      icon: Settings },
  ] as const;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div><h1 className="text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" />Configurações</h1><p className="text-sm text-muted-foreground">Personalize o CRM conforme sua necessidade</p></div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="perfil">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {ABAS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1.5 text-xs"><Icon className="h-3.5 w-3.5" />{label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="perfil">
            <div className="space-y-4 max-w-lg">
              <p className="text-sm text-muted-foreground">Suas informações de perfil são gerenciadas na página de Perfil.</p>
              <Button asChild variant="outline" className="gap-2"><Link to="/perfil"><User className="h-4 w-4" />Ir para Perfil<ChevronRight className="h-4 w-4" /></Link></Button>
            </div>
          </TabsContent>
          <TabsContent value="agenda"><AgendaConfig /></TabsContent>
          <TabsContent value="financeiro"><FinanceiroConfig /></TabsContent>
          <TabsContent value="ia"><IAConfig /></TabsContent>
          <TabsContent value="integracoes"><IntegracoesConfig /></TabsContent>
          <TabsContent value="notificacoes"><NotificacoesConfig /></TabsContent>
          <TabsContent value="sistema"><SistemaConfig /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
