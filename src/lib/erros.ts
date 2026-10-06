/**
 * Converte qualquer erro em uma mensagem segura para o usuário:
 * nada de stack trace, SQL, nomes de tabela, URLs internas ou status HTTP.
 */
const GENERICA = "Não foi possível concluir a operação. Tente novamente.";

const VAZAMENTOS = [
  /\bat\s+\w+.*:\d+:\d+/i, // stack trace
  /supabase|postgres|pgrst|rls|row-level|relation "|column "|schema/i,
  /https?:\/\//i,
  /\bfetch\b|networkerror|failed to fetch|typeerror|referenceerror/i,
  /\b(4\d{2}|5\d{2})\b\s*(error|status)?/i,
];

export function mensagemAmigavel(erro: unknown, padrao = GENERICA): string {
  const bruta = erro instanceof Error ? erro.message : typeof erro === "string" ? erro : "";
  const texto = bruta.trim();
  if (!texto || texto.length > 220) return padrao;
  if (VAZAMENTOS.some((re) => re.test(texto))) return padrao;
  return texto;
}
