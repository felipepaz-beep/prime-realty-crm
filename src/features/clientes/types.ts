export type ClienteStatus = 'ativo' | 'inativo' | 'perdido' | 'ganho';

export type ClienteEtapaFunil =
  | 'novo_lead'
  | 'contato_iniciado'
  | 'qualificacao'
  | 'visita_agendada'
  | 'proposta'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido';

export type ClientePrioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export type ClienteTemperatura = 'frio' | 'morno' | 'quente';

export type ClienteFinalidade = 'compra' | 'venda' | 'locacao';

export interface Cliente {
  id: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  cidade: string | null;
  estado: string | null;
  origem_lead: string | null;
  status: ClienteStatus;
  etapa_funil: ClienteEtapaFunil;
  prioridade: ClientePrioridade;
  score: number;
  temperatura: ClienteTemperatura;
  tipo_imovel: string | null;
  finalidade: ClienteFinalidade | null;
  faixa_valor_min: number | null;
  faixa_valor_max: number | null;
  bairros_interesse: string[];
  cidades_interesse: string[];
  ultimo_contato: string | null;
  proximo_followup: string | null;
  ultima_visita: string | null;
  observacoes: string | null;
  codigo_imovel: string | null;
  forma_pagamento: string | null;
  valor_negociado: number | null;
  previsao_fechamento: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
}

export type ClienteInsert = Pick<Cliente, 'nome'> &
  Partial<Omit<Cliente, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'is_active' | 'nome'>>;

export type ClienteUpdate = Partial<ClienteInsert>;

export interface ClienteFiltros {
  busca?: string;
  status?: ClienteStatus[];
  etapa_funil?: ClienteEtapaFunil[];
  prioridade?: ClientePrioridade[];
  temperatura?: ClienteTemperatura[];
  tags?: string[];
  ordenarPor?: keyof Pick<Cliente, 'nome' | 'created_at' | 'proximo_followup' | 'score'>;
  ordem?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
}

export interface ClientesPaginados {
  data: Cliente[];
  total: number;
  pagina: number;
  porPagina: number;
}
