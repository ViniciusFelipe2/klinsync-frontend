export type SalaStatus = "livre" | "desmontagem" | "limpeza" | "remontagem";
export type TipoEvento = "desmontagem" | "limpeza" | "remontagem";

export interface Sala {
  id: string;
  nome: string;
  ativa: boolean;
  status_atual: SalaStatus;
  updated_at: string;
  cirurgia_atual: string | null;
}

export interface EventoGiro {
  id: string;
  sala_id: string;
  tipo_evento: TipoEvento;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
  usuario_inicio_id: string;
  usuario_fim_id: string | null;
  cirurgia_anterior: string | null;
  cirurgia_proxima: string | null;
}

export interface EventoParada {
  id: string;
  sala_id: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
  usuario_inicio_id: string;
  usuario_fim_id: string | null;
}

export const ETAPA_LABEL: Record<TipoEvento, string> = {
  desmontagem: "Enfermagem",
  limpeza: "Limpeza",
  remontagem: "Remontagem",
};

export function statusLabel(status: SalaStatus, parada: boolean): string {
  if (parada) return "Parada";
  if (status === "livre") return "Livre";
  return `Em ${ETAPA_LABEL[status]}`;
}

export function statusTone(status: SalaStatus, parada: boolean): "livre" | "processo" | "parada" {
  if (parada) return "parada";
  return status === "livre" ? "livre" : "processo";
}

export function formatDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Duração para gestores, sempre com unidade: "45 s", "18 min", "2 h 05 min". */
export function formatDuracaoLegivel(segundos: number | null | undefined): string {
  if (segundos == null) return "—";
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")} min`;
}

export function segundosDesde(iso: string, agora: number): number {
  return (agora - new Date(iso).getTime()) / 1000;
}

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export function mediaSegundos(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}
