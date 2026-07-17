import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import { Phone, MessageCircle, GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ETAPA_FUNIL_LABELS } from '../constants';
import { PrioridadeBadge, TemperaturaBadge } from './cliente-badge';
import { useKanban } from '../hooks/use-kanban';
import type { Cliente, ClienteEtapaFunil } from '../types';

// ─── Cores por coluna ────────────────────────────────────────────────────────

const ETAPA_CORES: Record<ClienteEtapaFunil, string> = {
  novo_lead:         'border-t-slate-400',
  contato_iniciado:  'border-t-blue-400',
  qualificacao:      'border-t-violet-400',
  visita_agendada:   'border-t-amber-400',
  proposta:          'border-t-orange-400',
  negociacao:        'border-t-rose-400',
  fechado_ganho:     'border-t-emerald-400',
  fechado_perdido:   'border-t-zinc-400',
};

// ─── Card individual ─────────────────────────────────────────────────────────

function KanbanCard({ cliente, isDragging }: { cliente: Cliente; isDragging?: boolean }) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-3 space-y-2 shadow-sm select-none',
        isDragging && 'opacity-50 rotate-1 shadow-lg scale-[1.02]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to="/clientes/$clienteId"
          params={{ clienteId: cliente.id }}
          className="text-sm font-medium leading-tight hover:text-primary transition-colors line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {cliente.nome}
        </Link>
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
      </div>

      <div className="flex flex-wrap gap-1">
        <PrioridadeBadge value={cliente.prioridade} />
        <TemperaturaBadge value={cliente.temperatura} />
      </div>

      {(cliente.telefone || cliente.whatsapp) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {cliente.telefone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {cliente.telefone}
            </span>
          )}
          {cliente.whatsapp && !cliente.telefone && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {cliente.whatsapp}
            </span>
          )}
        </div>
      )}

      {cliente.proximo_followup && (
        <p className="text-[11px] text-muted-foreground">
          Follow-up:{' '}
          {new Date(cliente.proximo_followup).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  );
}

// ─── Card arrastável ─────────────────────────────────────────────────────────

function DraggableCard({ cliente }: { cliente: Cliente }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cliente.id,
    data: { etapa: cliente.etapa_funil },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <KanbanCard cliente={cliente} isDragging={isDragging} />
    </div>
  );
}

// ─── Coluna droppable ─────────────────────────────────────────────────────────

function KanbanColuna({
  etapa,
  clientes,
  isOver,
}: {
  etapa: ClienteEtapaFunil;
  clientes: Cliente[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: etapa });

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Header da coluna */}
      <div
        className={cn(
          'border border-border rounded-lg border-t-4 bg-muted/30',
          ETAPA_CORES[etapa]
        )}
      >
        <div className="px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {ETAPA_FUNIL_LABELS[etapa]}
          </span>
          <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 border border-border">
            {clientes.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 mt-2 space-y-2 rounded-lg min-h-[120px] p-1 transition-colors',
          isOver && 'bg-primary/5 ring-2 ring-primary/20'
        )}
      >
        {clientes.map((c) => (
          <DraggableCard key={c.id} cliente={c} />
        ))}
        {clientes.length === 0 && (
          <div
            className={cn(
              'h-20 rounded-lg border border-dashed border-border flex items-center justify-center transition-colors',
              isOver && 'border-primary/40 bg-primary/5'
            )}
          >
            <p className="text-xs text-muted-foreground/60">Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Board principal ──────────────────────────────────────────────────────────

interface KanbanBoardProps {
  clientes: Cliente[];
}

export function KanbanBoard({ clientes }: KanbanBoardProps) {
  const { colunas, moverCliente, sincronizar } = useKanban(clientes);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColuna, setOverColuna] = useState<ClienteEtapaFunil | null>(null);
  const prevClientesRef = useRef(clientes);

  // Sincroniza estado local quando React Query traz dados frescos
  useEffect(() => {
    if (clientes !== prevClientesRef.current) {
      prevClientesRef.current = clientes;
      sincronizar(clientes);
    }
  }, [clientes, sincronizar]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // evita drag acidental em clicks
    })
  );

  const clienteAtivo = clientes.find((c) => c.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColuna(null);
    if (!over) return;
    const novaEtapa = String(over.id) as ClienteEtapaFunil;
    moverCliente(String(active.id), novaEtapa);
  }

  function onDragOver(event: { over: { id: string | number } | null }) {
    setOverColuna(event.over ? (String(event.over.id) as ClienteEtapaFunil) : null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="flex gap-4 h-full pb-4">
        {colunas.map(({ etapa, clientes: cols }) => (
          <KanbanColuna
            key={etapa}
            etapa={etapa}
            clientes={cols}
            isOver={overColuna === etapa}
          />
        ))}
      </div>

      {/* Card fantasma que segue o cursor */}
      <DragOverlay>
        {clienteAtivo ? <KanbanCard cliente={clienteAtivo} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
