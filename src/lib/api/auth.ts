import {
  ApiError,
  getSessao,
  http,
  limparSessao,
  salvarSessao,
  type Sessao,
  type Usuario,
} from "./http";

export type ResultadoLogin =
  { status: "ok" } | { status: "mfa"; mfaToken: string; factorId: string };

type RespostaLogin =
  ({ mfaRequired?: false } & Sessao) | { mfaRequired: true; mfaToken: string; factorId: string };

/**
 * O backend valida bloqueio por IP/tentativas e o captcha, registra a tentativa
 * (sucesso ou falha) e responde 423 com `{ bloqueado, minutosRestantes }` quando bloqueado.
 */
export async function entrar(
  email: string,
  senha: string,
  captchaToken: string | null,
): Promise<ResultadoLogin> {
  const r = await http.post<RespostaLogin>(
    "/auth/login",
    { email, senha, captchaToken },
    { auth: false },
  );
  if (r.mfaRequired) return { status: "mfa", mfaToken: r.mfaToken, factorId: r.factorId };
  salvarSessao(r);
  return { status: "ok" };
}

export async function verificarMfaLogin(params: {
  mfaToken: string;
  factorId: string;
  code: string;
}): Promise<void> {
  const sessao = await http.post<Sessao>("/auth/mfa/verify", params, { auth: false });
  salvarSessao(sessao);
}

export async function sair(): Promise<void> {
  const sessao = getSessao();
  try {
    if (sessao) await http.post("/auth/logout", { refreshToken: sessao.refreshToken });
  } catch {
    /* sai localmente mesmo que o servidor esteja indisponível */
  } finally {
    limparSessao();
  }
}

/** Retorna o usuário autenticado, validando o token no servidor. `null` se não houver sessão válida. */
export async function usuarioAtual(): Promise<Usuario | null> {
  if (!getSessao()) return null;
  try {
    return await http.get<Usuario>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) throw err;
    return null;
  }
}

/** Id do usuário da sessão local (sem chamada de rede). */
export function idDoUsuarioLocal(): string {
  return getSessao()?.user.id ?? "";
}

/* ---------------- MFA (TOTP) ---------------- */

export type FatorMfa = { id: string; status: string; friendly_name?: string | null };

export const listarFatoresMfa = () => http.get<FatorMfa[]>("/auth/mfa/factors");

export const iniciarCadastroMfa = (friendlyName: string) =>
  http.post<{ id: string; qr: string; secret: string }>("/auth/mfa/enroll", { friendlyName });

export const confirmarCadastroMfa = (factorId: string, code: string) =>
  http.post<{ ok: true }>("/auth/mfa/enroll/confirm", { factorId, code });

export const removerFatorMfa = (factorId: string) =>
  http.delete<{ ok: true }>(`/auth/mfa/factors/${encodeURIComponent(factorId)}`);
