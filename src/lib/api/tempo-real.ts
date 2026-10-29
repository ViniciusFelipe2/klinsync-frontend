import { BASE_URL, garantirSessaoValida, getSessao, renovarSessaoDetalhe } from "./http";

/** "reconectado" é emitido a cada (re)conexão: quem ouve deve rebuscar tudo, pois pode ter perdido avisos. */
export type TipoAviso = "giro" | "reserva" | "checkin" | "salas" | "reconectado";
export type EstadoTempoReal = "conectando" | "ao-vivo" | "reconectando";

type Ouvinte = (tipo: TipoAviso) => void;

const ATRASO_MAX_MS = 15_000;
/** O servidor envia um batimento a cada 20 s: sem nenhum dado por tanto tempo, a conexão morreu (comum em Wi-Fi de tablet). */
const SILENCIO_MAX_MS = 55_000;

const ouvintes = new Set<Ouvinte>();
const observadoresEstado = new Set<() => void>();
let estado: EstadoTempoReal = "conectando";
let encerrar: (() => void) | null = null;
let acordar: (() => void) | null = null;

function definirEstado(novo: EstadoTempoReal) {
  if (estado === novo) return;
  estado = novo;
  observadoresEstado.forEach((fn) => fn());
}

export const estadoTempoReal = () => estado;

export function observarEstadoTempoReal(fn: () => void): () => void {
  observadoresEstado.add(fn);
  return () => observadoresEstado.delete(fn);
}

/** Interpreta o fluxo SSE e chama `aoAviso` para cada evento completo. */
async function lerFluxo(
  corpo: ReadableStream<Uint8Array>,
  aoAviso: (nome: string) => void,
  aoDados: () => void,
) {
  const leitor = corpo.getReader();
  const dec = new TextDecoder();
  let resto = "";
  let nome = "message";
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) return;
      aoDados();
      resto += dec.decode(value, { stream: true });
      let i: number;
      while ((i = resto.indexOf("\n")) >= 0) {
        const linha = resto.slice(0, i).replace(/\r$/, "");
        resto = resto.slice(i + 1);
        if (linha === "") {
          if (nome !== "message") aoAviso(nome);
          nome = "message";
        } else if (linha.startsWith("event:")) {
          nome = linha.slice(6).trim();
        }
      }
    }
  } finally {
    leitor.releaseLock();
  }
}

function iniciar(): () => void {
  let parado = false;
  let tentativa = 0;
  let controle: AbortController | null = null;
  let despertar: (() => void) | null = null;

  const dormir = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, ms);
      despertar = () => {
        window.clearTimeout(t);
        resolve();
      };
    });

  const avisar = (tipo: TipoAviso) => ouvintes.forEach((fn) => fn(tipo));

  async function ciclo() {
    while (!parado) {
      if (!getSessao()) {
        await dormir(5_000);
        continue;
      }
      definirEstado(tentativa === 0 ? "conectando" : "reconectando");
      controle = new AbortController();
      let vigia: number | undefined;
      const armarVigia = () => {
        window.clearTimeout(vigia);
        vigia = window.setTimeout(() => controle?.abort(), SILENCIO_MAX_MS);
      };
      let esperaExtra = 0;
      try {
        await garantirSessaoValida(2 * 60_000);
        const sessao = getSessao();
        if (!sessao) continue;
        armarVigia();
        const res = await fetch(`${BASE_URL}/eventos/stream`, {
          headers: { Authorization: `Bearer ${sessao.accessToken}`, Accept: "text/event-stream" },
          signal: controle.signal,
          cache: "no-store",
        });
        if (res.status === 401) await renovarSessaoDetalhe(); // token vencido: renova e tenta de novo no recuo abaixo
        if (res.status === 429) esperaExtra = 30_000;
        if (res.ok && res.body) {
          await lerFluxo(
            res.body,
            (nome) => {
              if (nome === "pronto") {
                tentativa = 0;
                definirEstado("ao-vivo");
                avisar("reconectado");
              } else if (
                nome === "giro" ||
                nome === "reserva" ||
                nome === "checkin" ||
                nome === "salas"
              ) {
                avisar(nome);
              }
            },
            armarVigia,
          );
        }
      } catch {
        /* rede caiu, servidor reiniciou ou silêncio demais: tenta de novo abaixo */
      } finally {
        window.clearTimeout(vigia);
      }
      if (parado) break;
      definirEstado("reconectando");
      tentativa += 1;
      await dormir(esperaExtra || Math.min(ATRASO_MAX_MS, 1_000 * 2 ** Math.min(tentativa, 4)));
    }
  }

  // Ao voltar o Wi-Fi ou a tela, não espera o tempo de recuo: reconecta já.
  acordar = () => {
    if (document.visibilityState === "visible") despertar?.();
  };
  window.addEventListener("online", acordar);
  window.addEventListener("focus", acordar);
  document.addEventListener("visibilitychange", acordar);
  void ciclo();

  return () => {
    parado = true;
    controle?.abort();
    despertar?.();
    if (acordar) {
      window.removeEventListener("online", acordar);
      window.removeEventListener("focus", acordar);
      document.removeEventListener("visibilitychange", acordar);
    }
  };
}

/**
 * Assina os avisos em tempo real. Há uma única conexão por navegador, compartilhada por quem assina;
 * ela fecha quando o último assinante sai.
 */
export function assinarTempoReal(fn: Ouvinte): () => void {
  ouvintes.add(fn);
  if (!encerrar) encerrar = iniciar();
  return () => {
    ouvintes.delete(fn);
    if (ouvintes.size === 0 && encerrar) {
      encerrar();
      encerrar = null;
      definirEstado("conectando");
    }
  };
}
