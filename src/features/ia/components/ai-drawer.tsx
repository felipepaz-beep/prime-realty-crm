import { useState, useCallback } from 'react';
import { Sparkles, Send, Copy, Check, Loader2, MessageSquare, MessageCircle, Mail, Phone, FileText, AlignLeft, BarChart2, FileCheck, Home, MapPin, Megaphone, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIExecute } from '../hooks/use-ai';
import { AI_ACTION_LABELS, AI_CATEGORIES, AI_CATEGORY_LABELS, PROVIDER_COLORS, PROVIDER_LABELS, QUICK_ACTIONS } from '../types';
import type { AIAction, AICategory, AIResponse } from '../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare, MessageCircle, Mail, Phone, FileText,
  AlignLeft, BarChart2, FileCheck, Home, MapPin, Megaphone, CheckSquare,
};

function ResponseCard({ response, onSalvar }: { response: AIResponse; onSalvar?: (text: string) => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => { navigator.clipboard.writeText(response.content); setCopied(true); toast.success('Copiado!'); setTimeout(() => setCopied(false), 2000); }, [response.content]);
  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', PROVIDER_COLORS[response.provider])}>{PROVIDER_LABELS[response.provider]}</span>
          {response.fromFallback && <Badge variant="outline" className="text-[9px] h-4">Fallback</Badge>}
          {response.fromCache && <Badge variant="outline" className="text-[9px] h-4">Cache</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{response.totalTokens} tokens</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <div className="p-3"><p className="text-sm whitespace-pre-wrap leading-relaxed">{response.content}</p></div>
      {onSalvar && (
        <div className="border-t px-3 py-2 flex justify-end">
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onSalvar(response.content)}>Salvar como nota</Button>
        </div>
      )}
    </div>
  );
}

function QuickActionButton({ action, icon, onClick, disabled }: { action: AIAction; icon: string; onClick: () => void; disabled?: boolean }) {
  const Icon = ICON_MAP[icon] ?? Sparkles;
  return (
    <button onClick={onClick} disabled={disabled} className={cn('flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-colors hover:bg-muted/60 hover:border-primary/30', disabled && 'opacity-50 cursor-not-allowed')}>
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[10px] leading-tight">{AI_ACTION_LABELS[action]}</span>
    </button>
  );
}

interface AIDrawerProps { clientId?: string; clienteNome?: string; children?: React.ReactNode; onSalvar?: (text: string) => void; }

export function AIDrawer({ clientId, clienteNome, children, onSalvar }: AIDrawerProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [categoria, setCategoria] = useState<AICategory>('geral');
  const [historico, setHistorico] = useState<AIResponse[]>([]);
  const executar = useAIExecute();

  const handleExecutar = useCallback(async (action: AIAction, cat: AICategory, userPrompt: string) => {
    if (!userPrompt.trim()) return;
    try {
      const response = await executar.mutateAsync({ action, category: cat, userPrompt, clientId });
      setHistorico((prev) => [response, ...prev].slice(0, 10));
      setPrompt('');
    } catch { toast.error('Erro ao executar IA. Tente novamente.'); }
  }, [executar, clientId]);

  const handleQuickAction = useCallback((action: AIAction, cat: AICategory) => {
    handleExecutar(action, cat, clienteNome ? `Cliente: ${clienteNome}` : 'Contexto geral do CRM');
  }, [clienteNome, handleExecutar]);

  const trigger = children ?? (
    <Button variant="outline" size="sm" className="gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Assistente IA</Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />Assistente IA
            {clienteNome && <Badge variant="secondary" className="text-xs font-normal ml-1">{clienteNome}</Badge>}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Ações rápidas</p>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_ACTIONS.slice(0, 8).map(({ action, category, icon }) => (
                  <QuickActionButton key={action} action={action} icon={icon} disabled={executar.isPending} onClick={() => handleQuickAction(action, category)} />
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Prompt personalizado</p>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as AICategory)}>
                  <SelectTrigger className="h-6 w-32 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{AI_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{AI_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder={`O que você quer criar?${clienteNome ? ` (para ${clienteNome})` : ''}`} className="resize-none text-sm" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleExecutar('custom', categoria, prompt); } }} />
              <Button className="w-full gap-2" size="sm" onClick={() => handleExecutar('custom', categoria, prompt)} disabled={!prompt.trim() || executar.isPending}>
                {executar.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</> : <><Send className="h-4 w-4" />Gerar (Ctrl+Enter)</>}
              </Button>
            </div>
            <Separator />
            {historico.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Respostas recentes ({historico.length})</p>
                {historico.map((r, i) => <ResponseCard key={i} response={r} onSalvar={onSalvar} />)}
              </div>
            ) : !executar.isPending && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Selecione uma ação rápida ou escreva um prompt para começar.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
