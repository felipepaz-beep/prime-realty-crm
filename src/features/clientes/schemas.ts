import { z } from 'zod';

export const clienteStatusSchema = z.enum(['ativo', 'inativo', 'perdido', 'ganho']);
export const clienteEtapaFunilSchema = z.enum(['novo_lead', 'contato_iniciado', 'qualificacao', 'visita_agendada', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido']);
export const clientePrioridadeSchema = z.enum(['baixa', 'media', 'alta', 'urgente']);
export const clienteTemperaturaSchema = z.enum(['frio', 'morno', 'quente']);
export const clienteFinalidadeSchema = z.enum(['compra', 'venda', 'locacao']);

export const clienteFormSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo'),
  telefone: z.string().trim().optional().or(z.literal('')),
  whatsapp: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  cpf: z.string().trim().optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  cidade: z.string().trim().optional().or(z.literal('')),
  estado: z.string().trim().length(2, 'Use a sigla (ex: SP)').optional().or(z.literal('')),
  origem_lead: z.string().trim().optional().or(z.literal('')),
  status: clienteStatusSchema.default('ativo'),
  etapa_funil: clienteEtapaFunilSchema.default('novo_lead'),
  prioridade: clientePrioridadeSchema.default('media'),
  score: z.number().int().min(0).max(100).default(0),
  temperatura: clienteTemperaturaSchema.default('morno'),
  tipo_imovel: z.string().trim().optional().or(z.literal('')),
  finalidade: clienteFinalidadeSchema.optional(),
  faixa_valor_min: z.number().nonnegative().optional(),
  faixa_valor_max: z.number().nonnegative().optional(),
  bairros_interesse: z.array(z.string()).default([]),
  cidades_interesse: z.array(z.string()).default([]),
  ultimo_contato: z.string().optional(),
  proximo_followup: z.string().optional(),
  ultima_visita: z.string().optional(),
  observacoes: z.string().trim().optional().or(z.literal('')),
  codigo_imovel: z.string().trim().optional().or(z.literal('')),
  forma_pagamento: z.string().trim().optional().or(z.literal('')),
  valor_negociado: z.number().nonnegative().optional(),
  previsao_fechamento: z.string().optional(),
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
}).refine(
  (d) => !d.faixa_valor_min || !d.faixa_valor_max || d.faixa_valor_min <= d.faixa_valor_max,
  { message: 'Valor mínimo não pode ser maior que o máximo', path: ['faixa_valor_max'] }
);

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;

export const clienteFiltrosSchema = z.object({
  busca: z.string().trim().optional(),
  status: z.array(clienteStatusSchema).optional(),
  etapa_funil: z.array(clienteEtapaFunilSchema).optional(),
  prioridade: z.array(clientePrioridadeSchema).optional(),
  temperatura: z.array(clienteTemperaturaSchema).optional(),
  tags: z.array(z.string()).optional(),
  ordenarPor: z.enum(['nome', 'created_at', 'proximo_followup', 'score']).default('created_at'),
  ordem: z.enum(['asc', 'desc']).default('desc'),
  pagina: z.number().int().min(1).default(1),
  porPagina: z.number().int().min(1).max(100).default(20),
});

export type ClienteFiltrosValues = z.infer<typeof clienteFiltrosSchema>;
