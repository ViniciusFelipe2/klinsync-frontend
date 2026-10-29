export const BASE_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(
  /\/+$/,
  "",
);

if (!BASE_URL) {
  console.warn(
    "[api] VITE_API_URL não configurada: as chamadas à API vão para a mesma origem do site.",
  );
}

const SESSION_KEY = "klinsync.session";

export type Usuario = { id: string; email: string };

export type Sessao = {
  accessToken: string;
  refreshToken: string;
  /** Expiração do access token, em segundos desde a época (epoch). */
  expiresAt: number;
  user: Usuario;
};

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/* ---------------- Sessão (localStorage) ---------------- */

export function getSessao(): Sessao | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Sessao) : null;
  } catch {
    return null;
  }
}

export function salvarSessao(sessao: Sessao): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
  } catch {
    /* armazenamento indisponível (modo privado): a sessão vale só até recarregar */
  }
}

export function limparSessao(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorado */
  }
}

/* ---------------- Renovação do token ---------------- */

export type ResultadoRenovacao = "ok" | "invalida" | "rede";

let renovando: Promise<ResultadoRenovacao> | null = null;

/** Executa `fn` com exclusividade entre abas/janelas do mesmo navegador (Web Locks), quando disponível. */
function comTrava<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request("klinsync-renovar-sessao", fn) as Promise<T>) : fn();
}

/**
 * Troca o refresh token por um novo par de tokens. Chamadas simultâneas compartilham a mesma requisição.
 * Só devolve "invalida" (e apaga a sessão) quando o servidor REJEITA o token. Falha de rede, servidor
 * indisponível ou limite de requisições devolvem "rede": a sessão é mantida e a renovação é tentada de novo.
 * Era aqui que o tablet "deslogava" depois de acordar com o Wi-Fi ainda reconectando.
 */
export function renovarSessaoDetalhe(): Promise<ResultadoRenovacao> {
  if (renovando) return renovando;
  const inicial = getSessao();
  if (!inicial) return Promise.resolve("invalida");

  renovando = comTrava(async (): Promise<ResultadoRenovacao> => {
    const atual = getSessao();
    if (!atual) return "invalida";
    // Outra aba pode ter renovado enquanto esperávamos a vez: o token guardado mudou, então já está feito.
    if (atual.refreshToken !== inicial.refreshToken) return "ok";
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: atual.refreshToken }),
      });
      if (res.ok) {
        salvarSessao((await res.json()) as Sessao);
        return "ok";
      }
      if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 422) {
        limparSessao();
        return "invalida";
      }
      return "rede";
    } catch {
      return "rede";
    }
  }).finally(() => {
    renovando = null;
  });
  return renovando;
}

/** Compatibilidade: `true` se a sessão foi renovada. */
export async function renovarSessao(): Promise<boolean> {
  return (await renovarSessaoDetalhe()) === "ok";
}

/** Garante que o access token ainda vale por pelo menos `margemMs`; renova se necessário. */
export async function garantirSessaoValida(margemMs = 60_000): Promise<boolean> {
  const sessao = getSessao();
  if (!sessao) return false;
  if (sessao.expiresAt * 1000 - Date.now() > margemMs) return true;
  return (await renovarSessaoDetalhe()) === "ok";
}

/* ---------------- Requisições ---------------- */

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Opcoes = {
  /** Envia o Bearer token. Padrão: true. */
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function montarUrl(path: string, query?: Opcoes["query"]): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function lerErro(res: Response): Promise<ApiError> {
  let corpo: unknown = null;
  try {
    corpo = await res.json();
  } catch {
    /* corpo vazio ou não-JSON */
  }
  const mensagem =
    corpo && typeof corpo === "object" && "message" in corpo && typeof corpo.message === "string"
      ? corpo.message
      : "Não foi possível concluir a operação. Tente novamente.";
  return new ApiError(mensagem, res.status, corpo);
}

function irParaLogin() {
  if (window.location.pathname !== "/entrar") window.location.assign("/entrar");
}

async function request<T>(
  metodo: Metodo,
  path: string,
  body: unknown,
  opcoes: Opcoes = {},
  jaRenovou = false,
): Promise<T> {
  const comAuth = opcoes.auth !== false;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (comAuth) {
    const sessao = getSessao();
    if (sessao) headers["Authorization"] = `Bearer ${sessao.accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(montarUrl(path, opcoes.query), {
      method: metodo,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.", 0);
  }

  if (res.status === 401 && comAuth) {
    if (!jaRenovou) {
      const r = await renovarSessaoDetalhe();
      if (r === "ok") return request<T>(metodo, path, body, opcoes, true);
      // Sem conexão estável não é motivo para sair: mantém a sessão e deixa a tela tentar de novo.
      if (r === "rede")
        throw new ApiError("Sem conexão estável com o servidor. Tentando novamente...", 0);
    }
    limparSessao();
    irParaLogin();
    throw await lerErro(res);
  }

  if (!res.ok) throw await lerErro(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string, opcoes?: Opcoes) => request<T>("GET", path, undefined, opcoes),
  post: <T>(path: string, body?: unknown, opcoes?: Opcoes) =>
    request<T>("POST", path, body ?? {}, opcoes),
  put: <T>(path: string, body?: unknown, opcoes?: Opcoes) =>
    request<T>("PUT", path, body ?? {}, opcoes),
  patch: <T>(path: string, body?: unknown, opcoes?: Opcoes) =>
    request<T>("PATCH", path, body ?? {}, opcoes),
  delete: <T>(path: string, opcoes?: Opcoes) => request<T>("DELETE", path, undefined, opcoes),
};

/* ---------------- Helpers para os módulos de endpoints ---------------- */

/** Endpoint POST com corpo tipado. Mantém a chamada `fn({ data })` usada pelas telas. */
export function endpointPost<TIn, TOut>(path: string, opcoes?: Opcoes) {
  return ({ data }: { data: TIn }) => http.post<TOut>(path, data, opcoes);
}

/** Endpoint POST sem corpo (ou com corpo opcional ignorado). */
export function endpointPostVazio<TOut>(path: string) {
  return (_arg?: unknown) => http.post<TOut>(path);
}

/** Endpoint GET sem parâmetros. */
export function endpointGet<TOut>(path: string) {
  return (_arg?: unknown) => http.get<TOut>(path);
}
