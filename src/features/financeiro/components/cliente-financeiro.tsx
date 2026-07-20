import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COMMISSION_STATUS_LABELS, COMMISSION_STATUS_COLORS } from '../types';
import type { Commission } from '../types';

function useComissoesPorCliente(clientId: string) {
  return useQuery({
    queryKey: ['financeiro', 'cliente', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('commissions').select('*').eq('client_id', clientId).is('deleted_at', null).order('expected_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Commission[];
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

export function ClienteFinanceiro({ clienteId }: { clienteId: string }) {
  const { data: comissoes, isLoading } = useComissoesPorCliente(clienteId);
  const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalPrevisto = (comissoes ?? []).filter(c => c.status === 'prevista').reduce((s, c) => s + Number(c.commission_value), 0);
  const totalRecebido = (comissoes ?? []).filter(c => c.status === 'recebida').reduce((s, c) => s + Number(c.commission_value), 0);

  if (isLoading) return <div className="space-y-2">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Previsto</p>
          <p className="text-lg font-bold mt-0.5">{fmt(totalPrevisto)}</p>
        </div>
        <div className="rounded-lg border p-3 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-lg font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">{fmt(totalRecebido)}</p>
        </div>
      </div>
      {(comissoes ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <DollarSign className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma comissão registrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(comissoes ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{fmt(Number(c.commission_value))}</p>
                  <Badge variant="outline" className={cn('text-[10px] h-4', COMMISSION_STATUS_COLORS[c.status])}>
                    {COMMISSION_STATUS_LABELS[c.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>Venda: {fmt(Number(c.gross_value))}</span>
                  <span>·</span><span>{Number(c.commission_percentage)}%</span>
                  {c.property_code && <><span>·</span><span>Cód: {c.property_code}</span></>}
                  {c.expected_date && <><span>·</span><span>Prev: {new Date(c.expected_date + 'T12:00').toLocaleDateString('pt-BR')}</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
