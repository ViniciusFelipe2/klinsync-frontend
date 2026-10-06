import type { EventoGiro, EventoParada, Sala, TipoEvento } from "@/lib/giro";
import { http } from "./http";

export type ReservaSala = {
  sala_id: string;
  device_id: string;
  ultimo_sinal: string;
};

/* ---------------- Leitura ---------------- */

export const listarSalasAtivas = () => http.get<Sala[]>("/giro/salas");

export const listarEventosAbertos = () =>
  http.get<EventoGiro[]>("/giro/eventos", { query: { abertos: true } });

/** Eventos das últimas `horas`: necessários para saber se a limpeza do ciclo atual já terminou. */
export const listarEventosRecentes = (horas = 48) =>
  http.get<EventoGiro[]>("/giro/eventos", { query: { horas } });

export const listarParadasAbertas = () =>
  http.get<EventoParada[]>("/giro/paradas", { query: { abertas: true } });

export const historicoGiro = (de: string, ate: string) =>
  http.get<{ giro: EventoGiro[]; paradas: EventoParada[] }>("/giro/historico", {
    query: { de, ate },
  });

/* ---------------- Operação das salas ---------------- */

/** O servidor registra o usuário (token) e a cirurgia anterior da sala. */
export const iniciarEtapa = (salaId: string, tipo: TipoEvento) =>
  http.post<{ ok: true }>("/giro/etapas/iniciar", { salaId, tipo });

export const finalizarEtapa = (eventoId: string, cirurgiaProxima?: string) =>
  http.post<{ ok: true }>("/giro/etapas/finalizar", {
    eventoId,
    ...(cirurgiaProxima ? { cirurgiaProxima } : {}),
  });

export const iniciarParada = (salaId: string) =>
  http.post<{ ok: true }>("/giro/paradas/iniciar", { salaId });

export const finalizarParada = (paradaId: string) =>
  http.post<{ ok: true }>("/giro/paradas/finalizar", { paradaId });

/* ---------------- Vínculo sala <-> tablet ---------------- */

export const listarReservas = () => http.get<ReservaSala[]>("/giro/reservas");

export const reservarSala = (salaId: string, deviceId: string) =>
  http.post<{ reservada: boolean }>("/giro/reservas/reservar", { salaId, deviceId });

export const liberarSala = (salaId: string, deviceId: string) =>
  http.post<{ ok: true }>("/giro/reservas/liberar", { salaId, deviceId });

export const heartbeatSala = (salaId: string, deviceId: string) =>
  http.post<{ ok: true }>("/giro/reservas/heartbeat", { salaId, deviceId });
