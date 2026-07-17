import { supabase } from "@/integrations/supabase/client";
import type {
  Cliente,
  ClienteFiltros,
  ClienteInsert,
  ClienteUpdate,
  ClientesListResult,
} from "../types";

const TABLE = "clients" as const;

async function getOwnerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

export async function listarClientes(
  filtros: ClienteFiltros = {},
): Promise<ClientesListResult> {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const orderBy = filtros.orderBy ?? "created_at";
  const orderDir = filtros.orderDir ?? "desc";

  let q = supabase.from(TABLE).select("*", { count: "exact" });

  if (!filtros.includeDeleted) q = q.is("deleted_at", null);
  if (typeof filtros.is_active === "boolean") q = q.eq("is_active", filtros.is_active);
  if (filtros.status?.length) q = q.in("status", filtros.status);
  if (filtros.etapa_funil?.length) q = q.in("etapa_funil", filtros.etapa_funil);
  if (filtros.prioridade?.length) q = q.in("prioridade", filtros.prioridade);
  if (filtros.temperatura?.length) q = q.in("temperatura", filtros.temperatura);
  if (filtros.finalidade?.length) q = q.in("finalidade", filtros.finalidade);
  if (filtros.cidade) q = q.ilike("cidade", `%${filtros.cidade}%`);
  if (filtros.estado) q = q.eq("estado", filtros.estado.toUpperCase());
  if (filtros.origem_lead) q = q.eq("origem_lead", filtros.origem_lead);
  if (filtros.tags?.length) q = q.contains("tags", filtros.tags);

  if (filtros.search) {
    const s = filtros.search.replace(/[%,]/g, " ").trim();
    if (s) {
      q = q.or(
        [
          `nome.ilike.%${s}%`,
          `email.ilike.%${s}%`,
          `telefone.ilike.%${s}%`,
          `whatsapp.ilike.%${s}%`,
          `cpf.ilike.%${s}%`,
          `codigo_imovel.ilike.%${s}%`,
        ].join(","),
      );
    }
  }

  const { data, error, count } = await q
    .order(orderBy, { ascending: orderDir === "asc", nullsFirst: false })
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as Cliente[], count: count ?? 0, page, pageSize };
}

export async function buscarClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Cliente | null) ?? null;
}

export async function criarCliente(
  input: Omit<ClienteInsert, "owner_id">,
): Promise<Cliente> {
  const owner_id = await getOwnerId();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, owner_id })
    .select("*")
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function atualizarCliente(
  id: string,
  patch: ClienteUpdate,
): Promise<Cliente> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function removerCliente(id: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function restaurarCliente(id: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: null, is_active: true })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Cliente;
}
