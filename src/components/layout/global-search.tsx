import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  User,
  Kanban,
  Calendar,
  DollarSign,
  MessageCircle,
  BarChart2,
  Sparkles,
  FileText,
  Users,
  Settings,
} from 'lucide-react';

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useClientes } from '@/features/clientes/hooks/use-clientes';
import { ETAPA_FUNIL_LABELS } from '@/features/clientes/constants';

const NAVEGACAO = [
  { label: 'Clientes', to: '/clientes', icon: Users },
  { label: 'Pipeline (Kanban)', to: '/kanban', icon: Kanban },
  { label: 'Agenda', to: '/agenda', icon: Calendar },
  { label: 'Financeiro', to: '/financeiro', icon: DollarSign },
  { label: 'Comunicação', to: '/comunicacao', icon: MessageCircle },
  { label: 'Documentos', to: '/documentos', icon: FileText },
  { label: 'Relatórios', to: '/relatorios', icon: BarChart2 },
  { label: 'Assistente IA', to: '/ia', icon: Sparkles },
  { label: 'Configurações', to: '/configuracoes', icon: Settings },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [debouncedBusca, setDebouncedBusca] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusca(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    if (!open) setBusca('');
  }, [open]);

  const { data } = useClientes(
    debouncedBusca.length >= 2
      ? { busca: debouncedBusca, porPagina: 8 }
      : { porPagina: 5, ordenarPor: 'created_at', ordem: 'desc' },
  );

  const clientes = data?.data ?? [];

  const handleSelectCliente = useCallback(
    (id: string) => {
      onOpenChange(false);
      navigate({ to: '/clientes/$clienteId', params: { clienteId: id } });
    },
    [navigate, onOpenChange],
  );

  const handleSelectNav = useCallback(
    (to: string) => {
      onOpenChange(false);
      navigate({ to });
    },
    [navigate, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar cliente ou ir para..."
        value={busca}
        onValueChange={setBusca}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading={debouncedBusca.length >= 2 ? 'Clientes' : 'Clientes recentes'}>
          {clientes.map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.nome} ${c.telefone ?? ''} ${c.whatsapp ?? ''} ${c.email ?? ''}`}
              onSelect={() => handleSelectCliente(c.id)}
            >
              <User className="shrink-0" />
              <span className="flex-1 truncate">{c.nome}</span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {ETAPA_FUNIL_LABELS[c.etapa_funil as keyof typeof ETAPA_FUNIL_LABELS] ??
                  c.etapa_funil}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegar para">
          {NAVEGACAO.filter(({ label }) =>
            busca.length === 0 ||
            label.toLowerCase().includes(busca.toLowerCase()),
          ).map(({ label, to, icon: Icon }) => (
            <CommandItem key={to} value={label} onSelect={() => handleSelectNav(to)}>
              <Icon className="shrink-0" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
