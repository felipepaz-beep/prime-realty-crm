import type { AuthError } from "@supabase/supabase-js";

/** Traduz erros do Supabase Auth para mensagens amigáveis em pt-BR. */
export function translateAuthError(error: AuthError | Error | null): string {
  if (!error) return "Erro desconhecido. Tente novamente.";
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("user already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("password should be at least")) return "A senha é muito curta.";
  if (msg.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes.";
  if (msg.includes("network")) return "Falha de conexão. Verifique sua internet.";

  return error.message;
}
