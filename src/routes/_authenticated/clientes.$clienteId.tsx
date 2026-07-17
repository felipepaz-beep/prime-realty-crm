import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useClienteDetalhe, useAtualizarCliente, useRemoverCliente } from '@/features/clientes/hooks/use-clientes';
import { ClienteForm } from '@/features/clientes/components/cliente-form';
import { StatusBadge, EtapaFunilBadge, PrioridadeBadge, TemperaturaBadge } from '@/features/clientes/components/cliente-badge';
import type { ClienteFormValues } from '@/features/clientes/schemas';

export const Route = createFileRoute('/_authenticated/clientes/$clienteId')({
  head: () => ({
    meta: [
      { title: 'Cliente — Corretor CRM' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ClienteDetalhePage,
  errorComponent: ({ error, reset }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm text-destructive">Erro ao carregar cliente.</p>
      <p className="text-xs text-muted-foreground max-w-md">{error.message}</p>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/clientes">Voltar</Link>
        </Button>
        <Button size="sm" onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm font-medium">Cliente não encontrado</p>
      <Button asChild size="sm" variant="outline">
        <Link to="/clientes">Voltar para clientes</Link>
      </Button>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

function ClienteDetalhePage() {
  const { clienteId } = Route.useParams();
  const navigate = useNavigate();
  const { data: cliente } = useClienteDetalhe(clienteId);
  const atualizar = useAtualizarCliente(clienteId);
  const remover = useRemoverCliente();
  const [editando, setEditando] = useState(false);

  const handleAtualizar = async (values: ClienteFormValues) => {
    await atualizar.mutateAsync(values);
    toast.success('Cliente atualizado com sucesso!');
    setEditando(false);
  };

  const handleRemover = async () => {
    if (!confirm(`Remover "${cliente.nome}"?`)) return;
    await remover.mutateAsync(clienteId);
    toast.success('Cliente removido.');
    navigate({ to: '/clientes' });
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link to="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{cliente.nome}</h1>
            <p className="text-xs text-muted-foreground">
              Cadastrado em {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemover}>
            <Trash2 className="mr-2 h-4 w-4" /> Remover
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={cliente.telefone} />
            <InfoRow icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" value={cliente.whatsapp} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={cliente.email} />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Localização"
              value={[cliente.cidade, cliente.estado].filter(Boolean).join(' / ') || null}
            />
            {cliente.origem_lead && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Origem do lead</p>
                  <p>{cliente.origem_lead}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BadgeRow label="Etapa"><EtapaFunilBadge value={cliente.etapa_funil} /></BadgeRow>
            <BadgeRow label="Status"><StatusBadge value={cliente.status} /></BadgeRow>
            <BadgeRow label="Prioridade"><PrioridadeBadge value={cliente.prioridade} /></BadgeRow>
            <BadgeRow label="Temperatura"><TemperaturaBadge value={cliente.temperatura} /></BadgeRow>
            <Separator />
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="font-medium">{cliente.score} / 100</p>
            </div>
          </CardContent>
        </Card>

        {cliente.observacoes && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{cliente.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            defaultValues={cliente}
            onSubmit={handleAtualizar}
            onCancel={() => setEditando(false)}
            isLoading={atualizar.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{value || <span className="text-muted-foreground">—</span>}</p>
      </div>
    </div>
  );
}

function BadgeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
