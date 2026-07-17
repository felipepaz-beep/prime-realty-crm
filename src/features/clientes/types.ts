import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Cliente = Tables<"clients">;
export type ClienteInsert = TablesInsert<"clients">;
export type ClienteUpdate = TablesUpdate<"clients">;

export type ClienteStatus = "ativo" | "inativo" | "perdido" | "ganho";
export type ClienteEtapaFunil =
  | "novo_lead"
  | "contato_iniciado"
  | "qualificacao"
  | "visita_agendada"
  | "proposta"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";
export type ClientePrioridade = "baixa" | "media" | "alta" | "urgente";
export type ClienteTemperatura = "frio" | "morno" | "quente";
export type ClienteFinalidade = "compra" | "venda" | "locacao";

export type ClienteOrderBy =
  | "nome"
  | "created_at"
  | "updated_at"
  | "proximo_followup"
  | "score";

export interface ClienteFiltros {
  search?: string;
  status?: ClienteStatus[];
  etapa_funil?: ClienteEtapaFunil[];
  prioridade?: ClientePrioridade[];
  temperatura?: ClienteTemperatura[];
  finalidade?: ClienteFinalidade[];
  cidade?: string;
  estado?: string;
  origem_lead?: string;
  tags?: string[];
  is_active?: boolean;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: ClienteOrderBy;
  orderDir?: "asc" | "desc";
}

export interface ClientesListResult {
  data: Cliente[];
  count: number;
  page: number;
  pageSize: number;
}
