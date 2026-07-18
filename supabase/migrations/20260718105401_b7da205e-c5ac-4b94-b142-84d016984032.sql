CREATE TABLE public.conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id        UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel          TEXT        NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','instagram','messenger','telegram','email','sms','internal')),
  status           TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','waiting','archived')),
  subject          TEXT,
  last_message_at  TIMESTAMPTZ,
  last_message     TEXT,
  unread_count     INT         NOT NULL DEFAULT 0,
  metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "conversations_insert_own" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "conversations_update_own" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "conversations_delete_own" ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX conversations_owner_idx    ON public.conversations(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX conversations_client_idx   ON public.conversations(client_id) WHERE deleted_at IS NULL;
CREATE INDEX conversations_last_msg_idx ON public.conversations(owner_id, last_message_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX conversations_status_idx   ON public.conversations(status) WHERE deleted_at IS NULL;
CREATE INDEX conversations_channel_idx  ON public.conversations(channel) WHERE deleted_at IS NULL;
CREATE INDEX conversations_metadata_gin ON public.conversations USING GIN (metadata);

CREATE TABLE public.messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction        TEXT        NOT NULL CHECK (direction IN ('incoming','outgoing')),
  sender           TEXT,
  type             TEXT        NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','pdf','audio','video','location','contact','sticker','system')),
  content          TEXT,
  attachment       JSONB,
  status           TEXT        NOT NULL DEFAULT 'sent' CHECK (status IN ('pending','sent','delivered','read','failed')),
  metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.owner_id = auth.uid()));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.owner_id = auth.uid()));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.owner_id = auth.uid()));

CREATE TRIGGER messages_set_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, sent_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX messages_direction_idx    ON public.messages(direction) WHERE deleted_at IS NULL;
CREATE INDEX messages_status_idx       ON public.messages(status) WHERE deleted_at IS NULL;
CREATE INDEX messages_type_idx         ON public.messages(type) WHERE deleted_at IS NULL;
CREATE INDEX messages_metadata_gin     ON public.messages USING GIN (metadata);
CREATE INDEX messages_content_search   ON public.messages USING GIN (to_tsvector('portuguese', coalesce(content, '')));

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message = LEFT(NEW.content, 100),
    last_message_at = NEW.sent_at,
    unread_count = CASE WHEN NEW.direction = 'incoming' THEN unread_count + 1 ELSE unread_count END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();