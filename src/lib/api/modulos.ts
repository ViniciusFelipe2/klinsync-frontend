import { endpointGet, endpointPost } from "./http";
import type { Role } from "./types";

export type AcessoModulo = {
  permitido: boolean;
  motivo: "ok" | "sem_acesso" | "feature_nao_contratada" | "hospital_inativo";
  nome: string | null;
  role: Role | null;
  tenantId: string | null;
  tenantNome: string | null;
  featureNome: string | null;
  podeAdministrar: boolean;
};

/**
 * Verifica se o usuário logado pode abrir um módulo (feature) do KlinSync.
 * A regra vive no servidor: feature habilitada para o hospital, operador só abre a
 * feature vinculada e master_admin sempre pode abrir (visão de suporte).
 */
export const getAcessoModulo = endpointPost<{ chave: string }, AcessoModulo>("/modulos/acesso");

/** Nomes da equipe do próprio hospital (id -> nome). */
export const getNomesEquipe = endpointGet<{ id: string; nome: string }[]>("/modulos/equipe-nomes");
