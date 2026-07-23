import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientes } from '@/features/clientes/hooks/use-clientes';
import {
  useMensagensCliente,
  useAnalisarConversa,
  useChatCopiloto,
} from '../hooks/use-copiloto';
import type { MensagemCopiloto } from '../hooks/use-copiloto';
import type { AnaliseConversa } from '../services/copiloto.service';

function ScoreRing({ score }: { score: number }) {
  const cor =
    score >= 70
      ? 'text-emerald-500'
      : score >= 40
        ? 'text-amber-500'
        : 'text-rose-500';
  const label = score >= 70 ? 'Quente' : score >= 40 ? 'Morno' : 'Frio';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('text-5xl font-bold tabular-nums', cor)}>{score}</div>
      <div className="text-xs text-muted-foreground">/ 100</div>
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] mt-1',
          score >= 70
            ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
            : score >= 40
              ? 'border-amber-500/40 text-amber-600 bg-amber-500/5'
              : 'border-rose-500/40 text-rose-600 bg-rose-500/5',
        )}
      >
        {label}
      </Badge>
    </div>
  );
}

function ClienteSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string, nome: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [nomeAtual, setNomeAtual] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: paginados, isLoading } = useClientes({ status: ['ativo'] });

  const filtrados = (paginados?.data ?? []).filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer text-sm hover:border-primary/60 transition-colors"
        onClick={() => setAberto(!aberto)}
      >
        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {nomeAtual || 'Selecionar cliente…'}
        </span>
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform', aberto && 'rotate-90')} />
      </div>
      {aberto && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-7 pl-8 text-xs"
                placeholder="Buscar cliente…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="max-h-52">
            {isLoading ? (
              <div className="p-3 space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : filtrados.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">Nenhum cliente.</p>
            ) : (
              <div className="p-1">
                {filtrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded text-sm hover:bg-muted transition-colors flex items-center gap-2',
                      value === cliente.id && 'bg-muted font-medium',
                    )}
                    onClick={() => {
                      onChange(cliente.id, cliente.nome);
                      setNomeAtual(cliente.nome);
                      setAberto(false);
                      setBusca('');
                    }}
                  >
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    {cliente.nome}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function PainelAnalise({ analise }: { analise: AnaliseConversa }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 p-4 rounded-lg border bg-muted/30">
        <ScoreRing score={analise.score} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Etapa detectada
          </p>
          <Badge variant="secondary" className="text-xs">
            {analise.etapa_detectada}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{analise.resumo}</p>
        </div>
      </div>

      {analise.pontos_positivos.length > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-500">
              O que funcionou
            </span>
          </div>
          <ul className="space-y-1">
            {analise.pontos_positivos.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                <span className="text-emerald-500 shrink-0">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analise.pontos_negativos.length > 0 && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
            <span className="text-xs font-medium text-rose-700 dark:text-rose-500">
              O que pode melhorar
            </span>
          </div>
          <ul className="space-y-1">
            {analise.pontos_negativos.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                <span className="text-rose-500 shrink-0">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analise.proximos_passos.length > 0 && (
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Próximos passos</span>
          </div>
          <ol className="space-y-1">
            {analise.proximos_passos.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ChatCopiloto({
  clienteId,
  clienteNome,
}: {
  clienteId: string;
  clienteNome: string;
}) {
  const { data: mensagens } = useMensagensCliente(clienteId);
  const chat = useChatCopiloto();
  const [historico, setHistorico] = useState<MensagemCopiloto[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historico]);

  async function enviar() {
    const pergunta = input.trim();
    if (!pergunta || chat.isPending) return;
    setInput('');
    const novoHistorico: MensagemCopiloto[] = [...historico, { role: 'user', content: pergunta }];
    setHistorico(novoHistorico);
    const resposta = await chat.mutateAsync({
      clienteNome,
      mensagens: mensagens ?? [],
      historico,
      pergunta,
    });
    setHistorico([...novoHistorico, { role: 'assistant', content: resposta }]);
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-1">
        <div className="space-y-3 py-2">
          {historico.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                Pergunte qualquer coisa sobre {clienteNome}.<br />
                O copiloto usa o histórico real de conversa.
              </p>
            </div>
          )}
          {historico.map((m, i) => (
            <div
              key={i}
              className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chat.isPending && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      <div className="flex gap-2 pt-3 border-t mt-2">
        <Input
          className="text-xs h-8"
          placeholder="Perguntar sobre este cliente…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          disabled={chat.isPending}
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={enviar} disabled={chat.isPending || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function PreviewConversa({
  clienteNome,
  clienteId,
}: {
  clienteNome: string;
  clienteId: string;
}) {
  const { data: msgs, isLoading } = useMensagensCliente(clienteId);

  if (isLoading)
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );

  if (!msgs?.length)
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
        <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-xs text-center">Nenhuma mensagem capturada ainda.</p>
      </div>
    );

  return (
    <div className="space-y-1.5 py-1">
      {msgs.map((m) => (
        <div
          key={m.id}
          className={cn(
            'flex gap-2 text-xs',
            m.direction === 'outgoing' ? 'justify-end' : 'justify-start',
          )}
        >
          <div
            className={cn(
              'max-w-[85%] rounded-xl px-3 py-1.5 leading-relaxed',
              m.direction === 'outgoing'
                ? 'bg-primary/10 text-foreground'
                : 'bg-muted text-foreground',
            )}
          >
            {m.content}
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(m.sent_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CopilotoConversa() {
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [analise, setAnalise] = useState<AnaliseConversa | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'analise' | 'chat'>('analise');

  const { data: mensagens } = useMensagensCliente(clienteId);
  const analisar = useAnalisarConversa();

  async function handleAnalisar() {
    if (!clienteId) return;
    setAnalise(null);
    const resultado = await analisar.mutateAsync({
      clienteNome,
      mensagens: mensagens ?? [],
    });
    setAnalise(resultado);
    setAbaAtiva('analise');
  }

  function handleClienteChange(id: string, nome: string) {
    setClienteId(id);
    setClienteNome(nome);
    setAnalise(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-12rem)]">
      {/* Painel esquerdo — histórico */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Histórico de conversa
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <ClienteSelector value={clienteId} onChange={handleClienteChange} />
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleAnalisar}
              disabled={!clienteId || analisar.isPending}
            >
              {analisar.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Analisar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 px-4 pb-4">
          {!clienteId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <User className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">Selecione um cliente para ver a conversa</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-1">
              <PreviewConversa clienteId={clienteId} clienteNome={clienteNome} />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Painel direito — análise e copiloto */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex items-center gap-2 border-b pb-3">
            <button
              onClick={() => setAbaAtiva('analise')}
              className={cn(
                'flex items-center gap-1.5 text-sm px-2 py-1 rounded transition-colors',
                abaAtiva === 'analise'
                  ? 'text-foreground font-medium bg-muted'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Análise
            </button>
            <button
              onClick={() => setAbaAtiva('chat')}
              className={cn(
                'flex items-center gap-1.5 text-sm px-2 py-1 rounded transition-colors',
                abaAtiva === 'chat'
                  ? 'text-foreground font-medium bg-muted'
                  : 'text-muted-foreground hover:text-foreground',
                !clienteId && 'opacity-40 cursor-not-allowed',
              )}
              disabled={!clienteId}
            >
              <Bot className="h-3.5 w-3.5" />
              Copiloto
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-4 pt-0">
          {abaAtiva === 'analise' ? (
            <ScrollArea className="h-full pr-1">
              {!clienteId ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                  <Sparkles className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm text-center">
                    Selecione um cliente e clique em{' '}
                    <span className="font-medium text-foreground">Analisar</span> para ver a análise
                    da conversa.
                  </p>
                </div>
              ) : analisar.isPending ? (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analisando conversa…</span>
                  </div>
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : analise ? (
                <div className="py-2">
                  <PainelAnalise analise={analise} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                  <TrendingUp className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm text-center">
                    Clique em <span className="font-medium text-foreground">Analisar</span> para
                    gerar a análise com IA.
                  </p>
                </div>
              )}
            </ScrollArea>
          ) : (
            clienteId && (
              <ChatCopiloto clienteId={clienteId} clienteNome={clienteNome} />
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
