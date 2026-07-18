import { supabase } from '@/integrations/supabase/client';
import type { Integration, IntegrationProvider, IntegrationStatus, SettingsCategory } from '../types';

export const SettingsService = {
  async getCategory(category: SettingsCategory): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('user_settings' as any).select('*').eq('category' as any, category);
    if (error) throw error;
    return Object.fromEntries(((data as any[]) ?? []).map((s) => [s.key, s.value]));
  },
  async get<T>(category: SettingsCategory, key: string, defaultValue: T): Promise<T> {
    const { data } = await supabase.from('user_settings' as any).select('value').eq('category' as any, category).eq('key' as any, key).maybeSingle();
    return (data as any)?.value !== undefined && (data as any)?.value !== null ? (data as any).value as T : defaultValue;
  },
  async set(category: SettingsCategory, key: string, value: unknown): Promise<void> {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const { error } = await supabase.from('user_settings' as any).upsert({ owner_id: ownerId, category, key, value } as any, { onConflict: 'owner_id,category,key' });
    if (error) throw error;
  },
  async setMany(category: SettingsCategory, values: Record<string, unknown>): Promise<void> {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const rows = Object.entries(values).map(([key, value]) => ({ owner_id: ownerId, category, key, value }));
    const { error } = await supabase.from('user_settings' as any).upsert(rows as any, { onConflict: 'owner_id,category,key' });
    if (error) throw error;
  },
  async remove(category: SettingsCategory, key: string): Promise<void> {
    const { error } = await supabase.from('user_settings' as any).delete().eq('category' as any, category).eq('key' as any, key);
    if (error) throw error;
  },
};

export const IntegrationService = {
  async listar(): Promise<Integration[]> {
    const { data, error } = await supabase.from('integrations' as any).select('*').order('provider' as any);
    if (error) throw error; return (data as Integration[]) ?? [];
  },
  async buscarProvider(provider: IntegrationProvider): Promise<Integration | null> {
    const { data } = await supabase.from('integrations' as any).select('*').eq('provider' as any, provider).maybeSingle();
    return data as Integration | null;
  },
  async salvar(provider: IntegrationProvider, status: IntegrationStatus, configuration: Record<string, unknown> = {}): Promise<Integration> {
    const { data: s } = await supabase.auth.getUser(); const ownerId = s.user?.id; if (!ownerId) throw new Error('Não autenticado.');
    const { data, error } = await supabase.from('integrations' as any).upsert({ owner_id: ownerId, provider, status, configuration } as any, { onConflict: 'owner_id,provider' }).select('*').single();
    if (error) throw error; return data as Integration;
  },
  async desconectar(provider: IntegrationProvider): Promise<void> { await this.salvar(provider, 'disconnected', {}); },
  async atualizarStatus(provider: IntegrationProvider, status: IntegrationStatus): Promise<void> {
    const { error } = await supabase.from('integrations' as any).update({ status, last_sync: new Date().toISOString() } as any).eq('provider' as any, provider);
    if (error) throw error;
  },
};
