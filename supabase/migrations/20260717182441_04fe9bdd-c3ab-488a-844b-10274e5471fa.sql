
-- Revoga execute do público em funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- Policy explícita "no access" para user_integrations (satisfaz linter; acesso real via service_role)
CREATE POLICY "No client access to integrations"
  ON public.user_integrations FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
