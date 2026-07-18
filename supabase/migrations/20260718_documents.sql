CREATE TABLE public.client_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,
  original_name TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL UNIQUE,
  mime_type     TEXT        NOT NULL,
  extension     TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL CHECK (file_size > 0),
  category      TEXT        NOT NULL DEFAULT 'outros' CHECK (category IN (
                  'documento_pessoal','rg','cpf','cnh','comprovante_renda',
                  'comprovante_residencia','matricula','contrato','proposta',
                  'financiamento','escritura','fotos','outros'
                )),
  description   TEXT,
  tags          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  favorite      BOOLEAN     NOT NULL DEFAULT false,
  metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON public.client_documents
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "documents_insert_own" ON public.client_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "documents_update_own" ON public.client_documents
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "documents_delete_own" ON public.client_documents
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX documents_owner_id_idx   ON public.client_documents(owner_id)   WHERE deleted_at IS NULL;
CREATE INDEX documents_client_id_idx  ON public.client_documents(client_id)  WHERE deleted_at IS NULL;
CREATE INDEX documents_category_idx   ON public.client_documents(category)   WHERE deleted_at IS NULL;
CREATE INDEX documents_created_at_idx ON public.client_documents(created_at) WHERE deleted_at IS NULL;
CREATE INDEX documents_favorite_idx   ON public.client_documents(owner_id, favorite) WHERE deleted_at IS NULL;
CREATE INDEX documents_metadata_gin   ON public.client_documents USING GIN (metadata);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-documents', 'client-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
