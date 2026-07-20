import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, MoreHorizontal, Send, Paperclip, ArrowLeft, Check, CheckCheck, Clock, AlertCircle, MessageCircle, User, ChevronRight, Loader2, Wifi, WifiOff } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useConversas, useConversa, useMensagens, useEnviarMensagem, useEncerrarConversa, useMarcarComoLida, useRealtimeMensagens, useRealtimeConversas } from '@/features/comunicacao/hooks/use-communication';
import { CHANNEL_COLORS, CHANNEL_LABELS, CONVERSATION_CHANNELS, STATUS_LABELS } from '@/features/comunicacao/types';
import { EtapaFunilBadge } from '@/features/clientes/components/cliente-badge';
import type { Conversation, ConversationChannel, ConversationFiltros, Message, MessageStatus } from '@/features/comunicacao/types';
import type { ClienteEtapaFunil } from '@/features/clientes/types';

export const Route = createFileRoute('/_authenticated/whatsapp')({
  head: () => ({ meta: [{ title: 'Comunicação — Corretor CRM' }, { name: 'robots', content: 'noindex' }] }),
  component: WhatsAppPage,
});

function useWhatsAppConectado() {
  return useQuery({
    queryKey: ['comunicacao', 'whatsapp-config'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('integrations').select('status').eq('provider', 'whatsapp').maybeSingle();
      return (data as { status: string } | null)?.status === 'connected';
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

function formatarDataConversa(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM/yy');
}
function formatarHoraMensagem(iso: string): string { return format(new Date(iso), 'HH:mm'); }
function getInitials(nome: string): string { return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase(); }

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'pending')   return <Clock className="h-3 w-3 text-muted-foreground" />;
  if (status === 'sent')      return <Check className="h-3 w-3 text-muted-foreground" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (status === 'read')      return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (status === 'failed')    return <AlertCircle className="h-3 w-3 text-destructive" />;
  return null;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === 'outgoing';
  if (msg.type === 'system') return (
    <div className="flex justify-center my-2">
      <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{msg.content}</span>
    </div>
  );
  return (
    <div className={cn('flex mb-1', isOut ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[72%] rounded-2xl px-3 py-2 shadow-sm', isOut ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border rounded-bl-sm')}>
        {msg.attachment && (
          <div className="mb-1.5">
            {msg.attachment.mime_type.startsWith('image/') ? (
              <img src={msg.attachment.url} alt={msg.attachment.name} className="rounded-lg max-w-[200px] max-h-[200px] object-cover" />
            ) : (
              <a href={msg.attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs underline opacity-80">
                <Paperclip className="h-3 w-3" />{msg.attachment.name}
              </a>
            )}
          </div>
        )}
        {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
        <div className={cn('flex items-center gap-1 mt-0.5', isOut ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] opacity-60">{formatarHoraMensagem(msg.sent_at)}</span>
          {isOut && <MessageStatusIcon status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

function ConversationCard({ conversa, ativa, onClick }: { conversa: Conversation; ativa: boolean; onClick: () => void }) {
  const nome = conversa.client?.nome ?? 'Cliente';
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60', ativa && 'bg-muted')}>
      <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="text-xs font-medium">{getInitials(nome)}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-medium truncate">{nome}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">{formatarDataConversa(conversa.last_message_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">{conversa.last_message ?? 'Nenhuma mensagem ainda'}</p>
          {conversa.unread_count > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center shrink-0">
              {conversa.unread_count > 99 ? '99+' : conversa.unread_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', CHANNEL_COLORS[conversa.channel])}>{CHANNEL_LABELS[conversa.channel]}</span>
          {conversa.status !== 'open' && <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[conversa.status]}</span>}
        </div>
      </div>
    </button>
  );
}

function ConversationSidebar({ conversa }: { conversa: Conversation }) {
  const c = conversa.client;
  if (!c) return null;
  return (
    <div className="w-64 border-l flex flex-col shrink-0">
      <div className="p-4 border-b"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sobre o cliente</p></div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium">{c.nome}</p>
            {c.telefone && <p className="text-xs text-muted-foreground">{c.telefone}</p>}
            {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
          </div>
          <Separator />
          <div className="space-y-2 text-xs">
            <div><p className="text-muted-foreground">Etapa</p><EtapaFunilBadge value={c.etapa_funil as ClienteEtapaFunil} /></div>
            {c.proximo_followup && <div><p className="text-muted-foreground">Próximo follow-up</p><p className="font-medium">{new Date(c.proximo_followup).toLocaleDateString('pt-BR')}</p></div>}
            {c.ultimo_contato && <div><p className="text-muted-foreground">Último contato</p><p>{new Date(c.ultimo_contato).toLocaleDateString('pt-BR')}</p></div>}
            {c.tags && c.tags.length > 0 && (
              <div><p className="text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px] h-4">{t}</Badge>)}</div>
              </div>
            )}
          </div>
          <Separator />
          <Button asChild variant="outline" size="sm" className="w-full text-xs">
            <Link to="/clientes/$clienteId" params={{ clienteId: conversa.client_id }}>Ver cadastro completo <ChevronRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

function ChatWindow({ conversaId, canalConectado, onFechar }: { conversaId: string; canalConectado: boolean; onFechar: () => void }) {
  const [texto, setTexto] = useState('');
  const [mostrarSidebar, setMostrarSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: conversa, isLoading: loadingConversa } = useConversa(conversaId);
  const { data, isLoading: loadingMsgs, fetchNextPage, hasNextPage, isFetchingNextPage } = useMensagens(conversaId);
  const enviar = useEnviarMensagem(conversaId);
  const encerrar = useEncerrarConversa();
  const marcarLida = useMarcarComoLida();
  const mensagens = data?.pages.flatMap((p) => p.messages) ?? [];

  useRealtimeMensagens(conversaId);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [conversaId]);
  useEffect(() => { if (conversa?.unread_count && conversa.unread_count > 0) marcarLida.mutate(conversaId); }, [conversaId, conversa?.unread_count]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEnviar = useCallback(async () => {
    const content = texto.trim();
    if (!content || !conversa) return;
    setTexto('');
    try {
      await enviar.mutateAsync({ conversation_id: conversaId, client_id: conversa.client_id, direction: 'outgoing', type: 'text', content });
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch { toast.error('Erro ao enviar mensagem.'); setTexto(content); }
  }, [texto, conversaId, conversa, enviar]);

  const handleEncerrar = useCallback(async () => {
    if (!confirm('Encerrar esta conversa?')) return;
    await encerrar.mutateAsync(conversaId);
    toast.success('Conversa encerrada.'); onFechar();
  }, [conversaId, encerrar, onFechar]);

  if (loadingConversa) return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!conversa) return null;
  const nome = conversa.client?.nome ?? 'Cliente';
  const isWhatsApp = conversa.channel === 'whatsapp';

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onFechar}><ArrowLeft className="h-4 w-4" /></Button>
          <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{getInitials(nome)}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{nome}</p>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', CHANNEL_COLORS[conversa.channel])}>{CHANNEL_LABELS[conversa.channel]}</span>
              <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[conversa.status]}</span>
              {isWhatsApp && (
                canalConectado
                  ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400"><Wifi className="h-3 w-3" />Conectado</span>
                  : <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400"><WifiOff className="h-3 w-3" />Não conectado</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMostrarSidebar(!mostrarSidebar)}><User className="h-4 w-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setMostrarSidebar(!mostrarSidebar)}>{mostrarSidebar ? 'Ocultar' : 'Exibir'} informações</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEncerrar} className="text-destructive focus:text-destructive">Encerrar conversa</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div ref={sentinelRef} className="flex justify-center h-4">
            {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {loadingMsgs ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                  <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-32')} />
                </div>
              ))}
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
              <div><p className="text-sm font-medium">Nenhuma mensagem ainda</p><p className="text-xs text-muted-foreground mt-1">Envie a primeira mensagem abaixo.</p></div>
            </div>
          ) : mensagens.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          <div ref={bottomRef} />
        </ScrollArea>

        {conversa.status === 'open' ? (
          <div className="border-t px-4 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <Input placeholder="Digite uma mensagem..." className="flex-1 min-h-10"
                value={texto} onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }} />
              <Button size="icon" onClick={handleEnviar} disabled={!texto.trim() || enviar.isPending} className="h-10 w-10 shrink-0">
                {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {isWhatsApp && !canalConectado && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 text-center">
                WhatsApp não conectado — mensagens salvas localmente.{' '}
                <Link to="/configuracoes" search={{}} params={{}} className="underline">Configurar</Link>
              </p>
            )}
          </div>
        ) : (
          <div className="border-t px-4 py-3 text-center"><p className="text-xs text-muted-foreground">Esta conversa está encerrada.</p></div>
        )}
      </div>
      {mostrarSidebar && <ConversationSidebar conversa={conversa} />}
    </div>
  );
}

function WhatsAppPage() {
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [canalFiltro, setCanalFiltro] = useState<ConversationChannel | ''>('');
  const [statusFiltro, setStatusFiltro] = useState<'open' | 'closed' | ''>('open');

  const filtros: ConversationFiltros = { busca: busca || undefined, channel: canalFiltro || undefined, status: statusFiltro || undefined, porPagina: 50 };
  const { data, isLoading } = useConversas(filtros);
  const { data: whatsappConectado = false } = useWhatsAppConectado();
  const conversas = data?.data ?? [];

  useRealtimeConversas();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!whatsappConectado && (
        <div className="flex items-center gap-2 border-b bg-amber-50 dark:bg-amber-900/10 px-4 py-2 shrink-0">
          <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            WhatsApp não configurado — mensagens são salvas localmente apenas.{' '}
            <Link to="/configuracoes" search={{}} params={{}} className="underline font-medium">Configurar Evolution API</Link>
          </p>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={28} minSize={22} maxSize={40}>
            <div className="flex flex-col h-full border-r">
              <div className="px-4 py-3 border-b shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Comunicação</h2>
                  <Button size="icon" variant="ghost" className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar conversa..." className="pl-9 h-8 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                <div className="flex gap-1.5 mt-2">
                  <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="open">Abertas</SelectItem>
                      <SelectItem value="closed">Encerradas</SelectItem>
                      <SelectItem value="waiting">Aguardando</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={canalFiltro} onValueChange={(v) => setCanalFiltro(v as typeof canalFiltro)}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Canal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {CONVERSATION_CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="divide-y">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-48" /></div>
                      </div>
                    ))}
                  </div>
                ) : conversas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{busca ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversas.map((c) => <ConversationCard key={c.id} conversa={c} ativa={conversaAtiva === c.id} onClick={() => setConversaAtiva(c.id)} />)}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t px-4 py-2 shrink-0">
                <p className="text-[10px] text-muted-foreground text-center">{data?.total ?? 0} conversa{(data?.total ?? 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={72}>
            {conversaAtiva ? (
              <ChatWindow conversaId={conversaAtiva} canalConectado={whatsappConectado} onFechar={() => setConversaAtiva(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium">Central de Comunicação</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">Selecione uma conversa para visualizar o histórico, ou inicie uma nova conversa a partir da página do cliente.</p>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
