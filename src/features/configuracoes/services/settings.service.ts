import { supabase } from '@/integrations/supabase/client';
import type { Integration, IntegrationProvider, IntegrationStatus, SettingsCategory } from '../types';

export const SettingsService = {
  async getCategory(category: SettingsCategory): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('user_settings').select('key, value').eq('category', category);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));
  },
  async get<T>(category: SettingsCategory, key: string, defaultValue: T): Promise<T> {
    const { data } = await supabase.from('user_settings').select('value').eq('category', category).eq('key', key).maybeSingle();
    return data?.value !== undefined && data?.value !== null ? (data.value as T) : defaultValue;
  },
  async set(category: SettingsCategory, key: string, value: unknown): Promise<void> {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const { error } = await supabase.from('user_settings').upsert({ owner_id: ownerId, category, key, value: value as never }, { onConflict: 'owner_id,category,key' });
    if (error) throw error;
  },
  async setMany(category: SettingsCategory, values: Record<string, unknown>): Promise<void> {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const rows = Object.entries(values).map(([key, value]) => ({ owner_id: ownerId, category, key, value: value as never }));
    const { error } = await supabase.from('user_settings').upsert(rows, { onConflict: 'owner_id,category,key' });
    if (error) throw error;
  },
  async remove(category: SettingsCategory, key: string): Promise<void> {
    const { error } = await supabase.from('user_settings').delete().eq('category', category).eq('key', key);
    if (error) throw error;
  },
};

export const IntegrationService = {
  async listar(): Promise<Integration[]> {
    const { data, error } = await supabase.from('integrations').select('*').order('provider');
    if (error) throw error; return (data ?? []) as Integration[];
  },
  async buscarProvider(provider: IntegrationProvider): Promise<Integration | null> {
    const { data } = await supabase.from('integrations').select('*').eq('provider', provider).maybeSingle();
    return data as Integration | null;
  },
  async salvar(provider: IntegrationProvider, status: IntegrationStatus, configuration: Record<string, unknown> = {}): Promise<Integration> {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const { data, error } = await supabase.from('integrations').upsert({ owner_id: ownerId, provider, status, configuration } as never, { onConflict: 'owner_id,provider' }).select('*').single();
    if (error) throw error; return data as Integration;
  },
  async desconectar(provider: IntegrationProvider): Promise<void> { await this.salvar(provider, 'disconnected', {}); },
  async atualizarStatus(provider: IntegrationProvider, status: IntegrationStatus): Promise<void> {
    const { error } = await supabase.from('integrations').update({ status, last_sync: new Date().toISOString() } as never).eq('provider', provider);
    if (error) throw error;
  },
};
