
-- 1) has_role: SECURITY INVOKER (user_roles RLS já permite ao usuário ler seus papéis)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2) handle_updated_at: SECURITY INVOKER (função de trigger simples)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) client_timeline: UPDATE/DELETE pelo dono
CREATE POLICY "Owners can update own timeline events"
ON public.client_timeline
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own timeline events"
ON public.client_timeline
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- 4) messages: DELETE pelo dono da conversa
CREATE POLICY "messages_delete_own"
ON public.messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.owner_id = auth.uid()
  )
);
