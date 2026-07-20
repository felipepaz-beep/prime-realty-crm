import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Sparkles, BarChart2, BookOpen, Settings, Zap, AlertCircle, Star, StarOff, Plus, Search, Trash2, Pencil, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAISummary, useAIRecentLogs, usePrompts, useCriarPrompt, useAtualizarPrompt, useToggleFavoritoPrompt, useRemoverPrompt } from '@/features/ia/hooks/use-ai';
import { AIDrawer } from '@/features/ia/components/ai-drawer';
import { AI_ACTION_LABELS, AI_CATEGORIES, AI_CATEGORY_LABELS, PROVIDER_COLORS, PROVIDER_LABELS } from '@/features/ia/types';
import type { AICategory, AIPrompt } from '@/features/ia/types';

export const Route = createFileRoute('/_authenticated/ia')({
  head: () => ({ meta: [{ title: 'Inteligência Artificial — Corretor CRM' }, { name: 'robots', content: 'noindex' }] }),
  component: IAPage,
});

function formatarMs(ms: number): string { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }

function MetricaCard({ titulo, valor, icon: Icon, sub, destaque }: { titulo: string; valor: string | number; icon: React.ComponentType<{ className?: string }>; sub?: string; destaque?: boolean }) {
  return (
    <Card className={destaque ? 'border-destructive/40 bg-destructive/5' : ''}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div><p className="text-xs text-muted-foreground">{titulo}</p><p className="text-2xl font-bold mt-1 tabular-nums">{valor}</p>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
          <div className={`rounded-md p-2 ${destaque ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}><Icon className="h-4 w-4" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardIA() {
  const [days, setDays] = useState(30);
  const { data: summary, isLoading } = useAISummary(days);
  const { data: logs, isLoading: loadingLogs } = useAIRecentLogs();
  const providerData = summary ? Object.entries(summary.by_provider).map(([name, count]) => ({ name: PROVIDER_LABELS[name as keyof typeof PROVIDER_LABELS] ?? name, count })) : [];
  const COLORS = ['#34d399','#60a5fa','#fb923c','#94a3b8'];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Período:</p>
        {[7,30,90].map((d) => <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setDays(d)}>{d}d</Button>)}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="pt-5 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-12" /></CardContent></Card>) : (
          <>
            <MetricaCard titulo="Total de execuções" valor={summary?.total_requests ?? 0} icon={Zap} sub={`${summary?.success_count ?? 0} com sucesso`} />
            <MetricaCard titulo="Tokens utilizados" valor={(summary?.total_tokens ?? 0).toLocaleString('pt-BR')} icon={BarChart2} />
            <MetricaCard titulo="Custo estimado" valor={summary?.total_cost_usd === 0 ? 'Grátis' : `$${summary?.total_cost_usd?.toFixed(4)}`} icon={Zap} sub="APIs não configuradas" />
            <MetricaCard titulo="Erros / Fallbacks" valor={`${summary?.error_count ?? 0} / ${summary?.fallback_count ?? 0}`} icon={AlertCircle} destaque={(summary?.error_count ?? 0) > 0} />
          </>
        )}
      </div>
      {providerData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Execuções por modelo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={providerData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [v, 'Execuções']} />
                <Bar dataKey="count" radius={[4,4,0,0]}>{providerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Últimas execuções</CardTitle></CardHeader>
        <CardContent>
          {loadingLogs ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          : (logs ?? []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma execução registrada ainda.</p>
          : (
            <div className="divide-y">
              {(logs ?? []).map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{AI_ACTION_LABELS[log.action] ?? log.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', PROVIDER_COLORS[log.provider])}>{PROVIDER_LABELS[log.provider] ?? log.provider}</span>
                      <span className="text-[10px] text-muted-foreground">{AI_CATEGORY_LABELS[log.category] ?? log.category}</span>
                      {log.duration_ms && <span className="text-[10px] text-muted-foreground">{formatarMs(log.duration_ms)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={log.status === 'success' ? 'outline' : log.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px] h-4">{log.status}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BibliotecaPrompts() {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<AICategory | ''>('');
  const [editando, setEditando] = useState<Partial<AIPrompt> | null>(null);
  const { data: prompts, isLoading } = usePrompts(categoriaFiltro || undefined);
  const criar = useCriarPrompt(); const atualizar = useAtualizarPrompt();
  const toggleFav = useToggleFavoritoPrompt(); const remover = useRemoverPrompt();
  const filtrados = (prompts ?? []).filter((p) => !busca || p.name.toLowerCase().includes(busca.toLowerCase()) || p.content.toLowerCase().includes(busca.toLowerCase()));
  const handleSalvar = async () => {
    if (!editando?.name || !editando?.content) return;
    if (editando.id) { await atualizar.mutateAsync({ id: editando.id, payload: editando }); toast.success('Prompt atualizado!'); }
    else { await criar.mutateAsync({ ...editando, category: editando.category ?? 'geral' }); toast.success('Prompt criado!'); }
    setEditando(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar prompt..." className="pl-9 h-8 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={categoriaFiltro || 'all'} onValueChange={(v) => setCategoriaFiltro(v === 'all' ? '' : v as AICategory)}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem>{AI_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AI_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="h-8 ml-auto gap-1.5" onClick={() => setEditando({ category: 'geral' })}><Plus className="h-4 w-4" />Novo prompt</Button>
      </div>
      {isLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          <div><p className="text-sm font-medium">Nenhum prompt encontrado</p><p className="text-xs text-muted-foreground mt-1">{busca ? 'Tente outro termo.' : 'Crie seu primeiro prompt personalizado.'}</p></div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((prompt) => (
            <div key={prompt.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{prompt.name}</p>
                  {prompt.is_system && <Badge variant="secondary" className="text-[10px] h-4">Sistema</Badge>}
                  <Badge variant="outline" className="text-[10px] h-4">{AI_CATEGORY_LABELS[prompt.category as AICategory]}</Badge>
                </div>
                {prompt.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{prompt.description}</p>}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono bg-muted/50 rounded px-1.5 py-1">{prompt.content}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFav.mutate({ id: prompt.id, favorite: !prompt.favorite })}>
                  {prompt.favorite ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="h-3.5 w-3.5" />}
                </Button>
                {!prompt.is_system && (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(prompt as unknown as AIPrompt)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Remover prompt?')) remover.mutate(prompt.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando?.id ? 'Editar prompt' : 'Novo prompt'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Nome *</label><Input className="mt-1" value={editando?.name ?? ''} onChange={(e) => setEditando((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Descrição</label><Input className="mt-1" value={editando?.description ?? ''} onChange={(e) => setEditando((p) => ({ ...p, description: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Categoria</label>
              <Select value={editando?.category ?? 'geral'} onValueChange={(v) => setEditando((p) => ({ ...p, category: v as AICategory }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{AI_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AI_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Prompt *</label><Textarea className="mt-1 font-mono text-sm" rows={5} value={editando?.content ?? ''} onChange={(e) => setEditando((p) => ({ ...p, content: e.target.value }))} placeholder="Use {{nome_cliente}}, {{etapa_funil}} para variáveis..." /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={!editando?.name || !editando?.content || criar.isPending || atualizar.isPending}>
              {(criar.isPending || atualizar.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfiguracoesIA() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" />Provedores de IA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(['openai','gemini','claude'] as const).map((provider) => (
            <div key={provider} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded', PROVIDER_COLORS[provider])}>{PROVIDER_LABELS[provider]}</span>
                  <Badge variant="outline" className="text-[10px] h-4">Não configurado</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Configure a chave de API em Perfil → Integrações</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" disabled>Configurar</Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2">⚠️ As chaves de API serão armazenadas de forma segura e criptografada na tabela <code>user_integrations</code>.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Comportamento do AIRouter</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[{ label: 'WhatsApp / E-mail / Marketing', provider: 'OpenAI (GPT-4o)' },{ label: 'Análise / Resumo / Planejamento', provider: 'Claude 3.5 Sonnet' },{ label: 'Documentos / PDF / OCR / Imagens', provider: 'Gemini 1.5 Pro' }].map(({ label, provider }) => (
            <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <span className="text-muted-foreground text-xs">{label}</span>
              <Badge variant="secondary" className="text-[10px]">{provider}</Badge>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">Fallback automático: OpenAI → Claude → Gemini → Stub</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Preparação futura</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-1.5">
            {['RAG / Embeddings','Busca semântica','OCR automático','Speech to Text','Function Calling','Agentes','Workflows','Vision API'].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />{item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IAPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Central de IA</h1>
          <p className="text-sm text-muted-foreground">Inteligência artificial integrada ao CRM</p>
        </div>
        <AIDrawer><Button size="sm" className="gap-1.5"><Sparkles className="h-4 w-4" />Abrir assistente</Button></AIDrawer>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-1.5"><BarChart2 className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="prompts" className="gap-1.5"><BookOpen className="h-4 w-4" />Biblioteca</TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5"><Settings className="h-4 w-4" />Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><DashboardIA /></TabsContent>
          <TabsContent value="prompts"><BibliotecaPrompts /></TabsContent>
          <TabsContent value="config"><ConfiguracoesIA /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
