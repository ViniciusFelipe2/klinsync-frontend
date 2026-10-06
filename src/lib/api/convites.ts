import { endpointGet, endpointPost } from "./http";
import type { Convite, Role } from "./types";

export const criarConvite = endpointPost<
  {
    nome: string;
    email: string;
    role: Role;
    tenantId?: string | null | undefined;
    featureId?: string | null | undefined;
  },
  { id: string; token: string }
>("/convites/criar");

export const listarConvites = endpointGet<Convite[]>("/convites");

export const revogarConvite = endpointPost<{ conviteId: string }, { ok: true }>(
  "/convites/revogar",
);

/** Gera um novo token para um convite pendente (o link anterior deixa de valer). */
export const regerarConvite = endpointPost<{ conviteId: string }, { token: string }>(
  "/convites/regerar",
);

/* -------- Rotas públicas do aceite (sem Bearer token) -------- */

export type ConviteValidado =
  | { valido: false; motivo: "indisponivel" }
  | {
      valido: true;
      nome: string;
      email: string;
      role: Role;
      hospital: string | null;
      feature: string | null;
    };

export const validarConvite = endpointPost<{ token: string }, ConviteValidado>(
  "/convites/validar",
  { auth: false },
);

export const aceitarConvite = endpointPost<
  { token: string; nome: string; senha: string },
  { email: string }
>("/convites/aceitar", { auth: false });
