import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useClientes } from '@/features/clientes/hooks/use-clientes';
import { KanbanBoard } from '@/features/clientes/components/kanban-board';
import type { ClienteFiltros, ClienteStatus } from '@/features/clientes/types';

export const Route = createFileRoute('/_authenticated/kanban')({
  head: () => ({
    meta: [
      { title: 'Kanban — Corretor CRM' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: KanbanPage,
});

const STATUS_OPCOES: { value: ClienteStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'perdido', label: 'Perdido' },
];

function KanbanPage() {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<ClienteStatus[]>(['ativo']);

  const filtros: ClienteFiltros = {
    busca: busca || undefined,
    status: statusFiltro.length > 0 ? statusFiltro : undefined,
    porPagina: 200, // kanban precisa de todos os clientes de uma vez
    ordem: 'asc',
    ordenarPor: 'nome',
  };

  const { data, isLoading, isError } = useClientes(filtros);
  const clientes = data?.data ?? [];

  const toggleStatus = useCallback((status: ClienteStatus) => {
    setStatusFiltro((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  const handleBusca = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Busca */}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 h-8 text-sm"
              value={busca}
              onChange={handleBusca}
            />
          </div>

          {/* Filtro de status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {statusFiltro.length > 0 && statusFiltro.length < 4 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4 flex items-center justify-center">
                    {statusFiltro.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPCOES.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={statusFiltro.includes(value)}
                  onCheckedChange={() => toggleStatus(value)}
                  className="text-sm"
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-6 pt-4">
        {isLoading ? (
          <KanbanSkeleton />
        ) : isError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-destructive">Erro ao carregar clientes. Tente novamente.</p>
          </div>
        ) : (
          <KanbanBoard clientes={clientes} />
        )}
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-64 shrink-0 space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
            <Skeleton key={j} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
