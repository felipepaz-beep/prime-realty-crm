import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { UserPlus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useClientes, useCriarCliente, useRemoverCliente } from '@/features/clientes/hooks/use-clientes';
import { ClienteForm } from '@/features/clientes/components/cliente-form';
import { StatusBadge, EtapaFunilBadge, PrioridadeBadge, TemperaturaBadge } from '@/features/clientes/components/cliente-badge';
import type { ClienteFormValues } from '@/features/clientes/schemas';
import type { ClienteFiltros } from '@/features/clientes/types';

export const Route = createFileRoute('/_authenticated/clientes')({
  head: () => ({
    meta: [
      { title: 'Clientes — Corretor CRM' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const [filtros, setFiltros] = useState<ClienteFiltros>({ pagina: 1, porPagina: 20, ordem: 'desc', ordenarPor: 'created_at' });
  const [busca, setBusca] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);

  const { data, isLoading, isError } = useClientes(filtros);
  const criarCliente = useCriarCliente();
  const removerCliente = useRemoverCliente();
  const navigate = useNavigate();

  const handleBusca = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBusca(v);
    setFiltros(f => ({ ...f, busca: v || undefined, pagina: 1 }));
  }, []);

  const handleCriar = useCallback(async (values: ClienteFormValues) => {
    await criarCliente.mutateAsync(values);
    toast.success('Cliente cadastrado com sucesso!');
    setNovoAberto(false);
  }, [criarCliente]);

  const handleRemover = useCallback(async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    await removerCliente.mutateAsync(id);
    toast.success('Cliente removido.');
  }, [removerCliente]);

  const clientes = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : `${total} ${total === 1 ? 'cliente' : 'clientes'}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setNovoAberto(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {/* Busca */}
      <div className="border-b px-6 py-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="pl-9"
            value={busca}
            onChange={handleBusca}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-destructive">Erro ao carregar clientes. Tente novamente.</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Nenhum cliente encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                {busca ? 'Tente outro termo de busca.' : 'Cadastre seu primeiro cliente.'}
              </p>
            </div>
            {!busca && (
              <Button size="sm" variant="outline" onClick={() => setNovoAberto(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Cadastrar cliente
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Temp.</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.whatsapp || c.telefone || c.email || '—'}
                  </TableCell>
                  <TableCell><EtapaFunilBadge value={c.etapa_funil} /></TableCell>
                  <TableCell><StatusBadge value={c.status} /></TableCell>
                  <TableCell><PrioridadeBadge value={c.prioridade} /></TableCell>
                  <TableCell><TemperaturaBadge value={c.temperatura} /></TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                      onClick={() => handleRemover(c.id, c.nome)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Paginação */}
      {!isLoading && total > (filtros.porPagina ?? 20) && (
        <div className="flex items-center justify-between border-t px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Página {filtros.pagina} de {Math.ceil(total / (filtros.porPagina ?? 20))}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              disabled={(filtros.pagina ?? 1) <= 1}
              onClick={() => setFiltros(f => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}
            >
              Anterior
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={(filtros.pagina ?? 1) >= Math.ceil(total / (filtros.porPagina ?? 20))}
              onClick={() => setFiltros(f => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal novo cliente */}
      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            onSubmit={handleCriar}
            onCancel={() => setNovoAberto(false)}
            isLoading={criarCliente.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
