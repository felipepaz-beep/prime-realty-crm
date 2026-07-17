
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  nome text NOT NULL,
  telefone text,
  whatsapp text,
  email text,
  cpf text,
  data_nascimento date,

  cidade text,
  estado text,

  origem_lead text,
  status text NOT NULL DEFAULT 'ativo',
  etapa_funil text NOT NULL DEFAULT 'novo_lead',
  prioridade text NOT NULL DEFAULT 'media',
  score smallint NOT NULL DEFAULT 0,
  temperatura text NOT NULL DEFAULT 'morno',

  tipo_imovel text,
  finalidade text,
  faixa_valor_min numeric(14,2),
  faixa_valor_max numeric(14,2),
  bairros_interesse jsonb NOT NULL DEFAULT '[]'::jsonb,
  cidades_interesse jsonb NOT NULL DEFAULT '[]'::jsonb,

  ultimo_contato timestamptz,
  proximo_followup timestamptz,
  ultima_visita timestamptz,
  observacoes text,

  codigo_imovel text,
  forma_pagamento text,
  valor_negociado numeric(14,2),
  previsao_fechamento date,

  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT clients_estado_len CHECK (estado IS NULL OR char_length(estado) = 2),
  CONSTRAINT clients_score_range CHECK (score >= 0 AND score <= 100),
  CONSTRAINT clients_status_chk CHECK (status IN ('ativo','inativo','perdido','ganho')),
  CONSTRAINT clients_etapa_chk CHECK (etapa_funil IN (
    'novo_lead','contato_iniciado','qualificacao','visita_agendada',
    'proposta','negociacao','fechado_ganho','fechado_perdido'
  )),
  CONSTRAINT clients_prioridade_chk CHECK (prioridade IN ('baixa','media','alta','urgente')),
  CONSTRAINT clients_temperatura_chk CHECK (temperatura IN ('frio','morno','quente')),
  CONSTRAINT clients_finalidade_chk CHECK (finalidade IS NULL OR finalidade IN ('compra','venda','locacao'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own clients"
  ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own clients"
  ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX clients_owner_id_idx ON public.clients(owner_id);
CREATE INDEX clients_nome_idx ON public.clients(nome);
CREATE INDEX clients_telefone_idx ON public.clients(telefone);
CREATE INDEX clients_email_idx ON public.clients(email);
CREATE INDEX clients_status_idx ON public.clients(status);
CREATE INDEX clients_etapa_funil_idx ON public.clients(etapa_funil);
CREATE INDEX clients_proximo_followup_idx ON public.clients(proximo_followup);

CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
