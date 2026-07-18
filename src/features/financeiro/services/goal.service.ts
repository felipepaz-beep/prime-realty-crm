import { supabase } from '@/integrations/supabase/client';
import type { Goal, GoalInsert } from '../types';

const TABLE = 'goals';

export const GoalService = {
  mesAtual() {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  },

  calcularPercentual(valor: number, meta: number): number {
    if (!meta || meta <= 0) return 0;
    return Math.min(100, Math.round((valor / meta) * 100));
  },

  async buscar(month: number, year: number): Promise<Goal | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    if (error) throw error;
    return (data as Goal) ?? null;
  },

  async salvar(payload: Omit<GoalInsert, 'owner_id'>): Promise<Goal> {
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) throw new Error('Usuário não autenticado.');

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        { ...payload, owner_id: ownerId } as never,
        { onConflict: 'owner_id,month,year' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as Goal;
  },
};
