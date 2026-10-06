const BASE_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(
  /\/+$/,
  "",
);

if (!BASE_URL) {
  console.error("[api] VITE_API_URL não configurada. Defina a URL da API no .env.");
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

let renovando: Promise<boolean> | null = null;

/** Troca o refresh token por um novo par de tokens. Chamadas simultâneas compartilham a mesma requisição. */
export function renovarSessao(): Promise<boolean> {
  if (renovando) return renovando;
  const atual = getSessao();
  if (!atual) return Promise.resolve(false);

  renovando = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: atual.refreshToken }),
      });
      if (!res.ok) {
        limparSessao();
        return false;
      }
      salvarSessao((await res.json()) as Sessao);
      return true;
    } catch {
      // Falha de rede: mantém a sessão atual, o aparelho pode estar apenas offline.
      return false;
    } finally {
      renovando = null;
    }
  })();
  return renovando;
}

/** Garante que o access token ainda vale por pelo menos `margemMs`; renova se necessário. */
export async function garantirSessaoValida(margemMs = 60_000): Promise<boolean> {
  const sessao = getSessao();
  if (!sessao) return false;
  if (sessao.expiresAt * 1000 - Date.now() > margemMs) return true;
  return renovarSessao();
}

/* ---------------- Requisições ---------------- */

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Opcoes = {
  /** Envia o Bearer token. Padrão: true. */
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function montarUrl(path: string, query?: Opcoes["query"]): string {
  const url = new URL(`${BASE_URL}${path}`);
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
    if (!jaRenovou && (await renovarSessao())) {
      return request<T>(metodo, path, body, opcoes, true);
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
