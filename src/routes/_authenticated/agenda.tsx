import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { Plus, Search, Filter, CalendarDays, List, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useActivities, useCriarActivity, useConcluirActivity, useCancelarActivity, useDuplicarActivity, useRemoverActivity, useAtualizarActivity } from '@/features/agenda/hooks/use-activities';
import { ActivityCard } from '@/features/agenda/components/activity-card';
import { ActivityForm } from '@/features/agenda/components/activity-form';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPES } from '@/features/agenda/constants';
import type { Activity, ActivityFiltros, ActivityType } from '@/features/agenda/types';
import type { ActivityFormValues } from '@/features/agenda/schemas';

export const Route = createFileRoute('/_authenticated/agenda')({
  head: () => ({ meta: [{ title: 'Agenda — Corretor CRM' }, { name: 'robots', content: 'noindex' }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const [view, setView] = useState<'dia' | 'semana' | 'lista' | 'tarefas' | 'followups'>('dia');
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [busca, setBusca] = useState('');
  const [tiposFiltro, setTiposFiltro] = useState<ActivityType[]>([]);
  const [novaAberta, setNovaAberta] = useState(false);
  const [editando, setEditando] = useState<Activity | null>(null);

  const filtrosBase: ActivityFiltros = { busca: busca || undefined, type: tiposFiltro.length > 0 ? tiposFiltro : undefined, ordenarPor: 'scheduled_at', ordem: 'asc', porPagina: 50 };

  const filtrosAtivos: ActivityFiltros =
    view === 'semana' ? { ...filtrosBase, dateStart: startOfWeek(dataSelecionada, { locale: ptBR }).toISOString(), dateEnd: endOfWeek(dataSelecionada, { locale: ptBR }).toISOString() }
    : view === 'tarefas'   ? { ...filtrosBase, type: ['TASK'],    status: ['PENDING','IN_PROGRESS'] }
    : view === 'followups' ? { ...filtrosBase, type: ['FOLLOWUP'], status: ['PENDING','IN_PROGRESS'] }
    : view === 'lista'     ? filtrosBase
    : { ...filtrosBase, dateStart: startOfDay(dataSelecionada).toISOString(), dateEnd: endOfDay(dataSelecionada).toISOString() };

  const { data, isLoading } = useActivities(filtrosAtivos);
  const criarActivity   = useCriarActivity();
  const concluir        = useConcluirActivity();
  const cancelar        = useCancelarActivity();
  const duplicar        = useDuplicarActivity();
  const remover         = useRemoverActivity();

  const activities = data?.data ?? [];

  const handleCriar = useCallback(async (values: ActivityFormValues) => {
    await criarActivity.mutateAsync(values);
    toast.success('Atividade criada!');
    setNovaAberta(false);
  }, [criarActivity]);

  const handleEditar = useCallback(async (values: ActivityFormValues) => {
    if (!editando) return;
    const atualizar = useAtualizarActivity(editando.id);
    await atualizar.mutateAsync(values);
    toast.success('Atividade atualizada!');
    setEditando(null);
  }, [editando]);

  const handleConcluir = useCallback(async (id: string) => { await concluir.mutateAsync(id); toast.success('Concluída!'); }, [concluir]);
  const handleCancelar = useCallback(async (id: string) => { await cancelar.mutateAsync(id); toast.success('Cancelada.'); }, [cancelar]);
  const handleDuplicar = useCallback(async (id: string) => { await duplicar.mutateAsync(id); toast.success('Duplicada!'); }, [duplicar]);
  const handleRemover  = useCallback(async (id: string) => { if (!confirm('Remover?')) return; await remover.mutateAsync(id); toast.success('Removida.'); }, [remover]);

  const toggleTipo = (tipo: ActivityType) =>
    setTiposFiltro((prev) => prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]);

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(dataSelecionada, { locale: ptBR }), i));

  const VIEWS = [
    { key: 'dia', label: 'Dia' }, { key: 'semana', label: 'Semana' },
    { key: 'lista', label: 'Lista' }, { key: 'tarefas', label: 'Tarefas' }, { key: 'followups', label: 'Follow-ups' },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">{format(dataSelecionada, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <Button size="sm" onClick={() => setNovaAberta(true)}><Plus className="mr-2 h-4 w-4" /> Nova atividade</Button>
      </div>

      <div className="flex items-center gap-2 border-b px-6 py-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar atividade..." className="pl-9 h-8 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Tipo
              {tiposFiltro.length > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{tiposFiltro.length}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Tipo de atividade</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ACTIVITY_TYPES.map((tipo) => (
              <DropdownMenuCheckboxItem key={tipo} checked={tiposFiltro.includes(tipo)} onCheckedChange={() => toggleTipo(tipo)} className="text-sm">
                {ACTIVITY_TYPE_LABELS[tipo]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-1 ml-auto">
          {VIEWS.map(({ key, label }) => (
            <Button key={key} size="sm" variant={view === key ? 'default' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setView(key)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex flex-col border-r p-4 w-64 shrink-0">
          <Calendar mode="single" selected={dataSelecionada} onSelect={(d) => d && setDataSelecionada(d)} locale={ptBR} className="rounded-md" />
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : view === 'semana' ? (
            <div className="grid grid-cols-7 gap-3">
              {diasSemana.map((dia) => {
                const atividadesDia = activities.filter((a) => isSameDay(new Date(a.scheduled_at ?? a.due_at ?? ''), dia));
                return (
                  <div key={dia.toISOString()} className="min-w-0">
                    <div className={`text-center mb-2 ${isSameDay(dia, new Date()) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                      <p className="text-[10px] uppercase">{format(dia, 'EEE', { locale: ptBR })}</p>
                      <p className="text-sm">{format(dia, 'd')}</p>
                    </div>
                    <div className="space-y-1.5">
                      {atividadesDia.map((a) => (
                        <ActivityCard key={a.id} activity={a} compact onConcluir={handleConcluir} onCancelar={handleCancelar} onEditar={setEditando} onDuplicar={handleDuplicar} onRemover={handleRemover} />
                      ))}
                      {atividadesDia.length === 0 && (
                        <div className="h-10 rounded border border-dashed border-border flex items-center justify-center">
                          <p className="text-[10px] text-muted-foreground/50">—</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium">Nenhuma atividade encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">{busca ? 'Tente outro termo.' : 'Crie sua primeira atividade.'}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setNovaAberta(true)}><Plus className="mr-2 h-4 w-4" /> Nova atividade</Button>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {activities.map((a) => (
                <ActivityCard key={a.id} activity={a} onConcluir={handleConcluir} onCancelar={handleCancelar} onEditar={setEditando} onDuplicar={handleDuplicar} onRemover={handleRemover} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={novaAberta} onOpenChange={setNovaAberta}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Nova atividade</DialogTitle></DialogHeader>
          <ActivityForm onSubmit={handleCriar} onCancel={() => setNovaAberta(false)} isLoading={criarActivity.isPending} />
        </DialogContent>
      </Dialog>

      {editando && (
        <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>Editar atividade</DialogTitle></DialogHeader>
            <ActivityForm defaultValues={editando} onSubmit={handleEditar} onCancel={() => setEditando(null)} isLoading={false} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
