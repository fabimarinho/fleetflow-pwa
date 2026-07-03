// Traduz mensagens do Supabase Auth para PT-BR
export function traduzErroAuth(msg: string | undefined): string {
  if (!msg) return "Ocorreu um erro. Tente novamente.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered")) return "Este e-mail já está cadastrado.";
  if (m.includes("password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
  if (m.includes("unable to validate email")) return "E-mail inválido.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes.";
  if (m.includes("network")) return "Falha de conexão. Verifique sua internet.";
  if (m.includes("token has expired") || m.includes("invalid token")) return "Link expirado. Solicite um novo.";
  if (m.includes("same password")) return "A nova senha deve ser diferente da anterior.";
  return msg;
}