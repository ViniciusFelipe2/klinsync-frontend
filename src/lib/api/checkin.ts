import { endpointPost, endpointPostVazio } from "./http";
import type { Parcial } from "./types";

export type CheckIn = { id: string; doctor_name: string; checked_in_at: string };

export const createCheckIn = endpointPost<{ doctorName: string; photoBase64: string }, CheckIn>(
  "/checkins",
);

export const getCheckInPhotoUrl = endpointPost<{ id: string }, { url: string }>(
  "/checkins/foto-url",
);

export const getCheckInPhotoUrls = endpointPost<
  { ids: string[] },
  { urls: Record<string, string> }
>("/checkins/fotos-urls");

export const deleteCheckIn = endpointPost<{ id: string }, { ok: true }>("/checkins/excluir");

export const getUsageStats = endpointPostVazio<{
  usedBytes: number;
  totalBytes: number;
  isEstimate: boolean;
  checkInCount: number;
}>("/checkins/uso");

type FiltroCheckins = Parcial<{ busca: string; de: string; ate: string }>;

/** Painel de check-ins do módulo (escopo do hospital do usuário logado). */
export const listarCheckIns = endpointPost<
  FiltroCheckins & { pagina: number; porPagina: number },
  { linhas: CheckIn[]; total: number; hoje: number }
>("/checkins/listar");

/** Exportação (até 5000 registros) com os mesmos filtros do painel. */
export const exportarCheckIns = endpointPost<FiltroCheckins, { linhas: CheckIn[] }>(
  "/checkins/exportar",
);
