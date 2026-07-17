import { z } from "zod";

export const clienteStatusEnum = z.enum(["ativo", "inativo", "perdido", "ganho"]);
export const clienteEtapaFunilEnum = z.enum([
  "novo_lead",
  "contato_iniciado",
  "qualificacao",
  "visita_agendada",
  "proposta",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
]);
export const clientePrioridadeEnum = z.enum(["baixa", "media", "alta", "urgente"]);
export const clienteTemperaturaEnum = z.enum(["frio", "morno", "quente"]);
export const clienteFinalidadeEnum = z.enum(["compra", "venda", "locacao"]);

const optionalString = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v));

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const clienteFormSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do cliente").max(160),
    telefone: optionalString(30),
    whatsapp: optionalString(30),
    email: z
      .string()
      .trim()
      .max(160)
      .email("E-mail inválido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" || v === undefined ? null : v)),
    cpf: optionalString(20),
    data_nascimento: optionalDate,

    cidade: optionalString(80),
    estado: z
      .string()
      .trim()
      .length(2, "UF deve ter 2 letras")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" || v === undefined ? null : v?.toUpperCase() ?? null)),

    origem_lead: optionalString(80),
    status: clienteStatusEnum.default("ativo"),
    etapa_funil: clienteEtapaFunilEnum.default("novo_lead"),
    prioridade: clientePrioridadeEnum.default("media"),
    score: z.coerce.number().int().min(0).max(100).default(0),
    temperatura: clienteTemperaturaEnum.default("morno"),

    tipo_imovel: optionalString(80),
    finalidade: clienteFinalidadeEnum.optional().nullable(),
    faixa_valor_min: optionalNumber,
    faixa_valor_max: optionalNumber,
    bairros_interesse: z.array(z.string().trim().min(1)).default([]),
    cidades_interesse: z.array(z.string().trim().min(1)).default([]),

    ultimo_contato: optionalDate,
    proximo_followup: optionalDate,
    ultima_visita: optionalDate,
    observacoes: optionalString(4000),

    codigo_imovel: optionalString(80),
    forma_pagamento: optionalString(80),
    valor_negociado: optionalNumber,
    previsao_fechamento: optionalDate,

    tags: z.array(z.string().trim().min(1)).default([]),
    custom_fields: z.record(z.string(), z.unknown()).default({}),
    is_active: z.boolean().default(true),
  })
  .refine(
    (d) =>
      d.faixa_valor_min == null ||
      d.faixa_valor_max == null ||
      d.faixa_valor_max >= d.faixa_valor_min,
    { message: "Faixa máxima deve ser maior ou igual à mínima", path: ["faixa_valor_max"] },
  );

export type ClienteFormValues = z.input<typeof clienteFormSchema>;
export type ClienteFormParsed = z.output<typeof clienteFormSchema>;

export const clienteFiltrosSchema = z.object({
  search: z.string().trim().optional(),
  status: z.array(clienteStatusEnum).optional(),
  etapa_funil: z.array(clienteEtapaFunilEnum).optional(),
  prioridade: z.array(clientePrioridadeEnum).optional(),
  temperatura: z.array(clienteTemperaturaEnum).optional(),
  finalidade: z.array(clienteFinalidadeEnum).optional(),
  cidade: z.string().trim().optional(),
  estado: z.string().trim().length(2).optional(),
  origem_lead: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  includeDeleted: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  orderBy: z
    .enum(["nome", "created_at", "updated_at", "proximo_followup", "score"])
    .default("created_at"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ClienteFiltrosValues = z.infer<typeof clienteFiltrosSchema>;
