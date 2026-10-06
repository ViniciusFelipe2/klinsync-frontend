import { endpointPost } from "./http";
import type { Parcial } from "./types";

export type IpBloqueado = {
  id: string;
  ip: string;
  motivo: string;
  permanente: boolean;
  bloqueado_ate: string | null;
  created_at: string;
  ativo: boolean;
};

export type IpSuspeito = {
  ip: string;
  falhas: number;
  sucessos: number;
  ultimaTentativa: string;
  regiao: string | null;
  emails: string[];
  bloqueado: boolean;
};

/** Visão consolidada de segurança: indicadores, IPs suspeitos e bloqueios ativos. */
export const painelIps = endpointPost<
  Parcial<{ dias: number }>,
  {
    dias: number;
    indicadores: {
      tentativas: number;
      sucessos: number;
      falhas: number;
      taxaFalha: number;
      ipsUnicos: number;
      ipsSuspeitos: number;
      bloqueiosAtivos: number;
      usuariosAtivos: number;
      usuariosInativos: number;
      masters: number;
    };
    politica: { max_tentativas: number; janela_minutos: number; bloqueio_minutos: number };
    ips: IpSuspeito[];
    bloqueios: IpBloqueado[];
  }
>("/master/seguranca/ips");

export const bloquearIp = endpointPost<
  {
    ip: string;
    motivo?: string | undefined;
    minutos?: number | null | undefined;
    permanente?: boolean | undefined;
  },
  { ok: true }
>("/master/seguranca/ips/bloquear");

export const desbloquearIp = endpointPost<{ ip: string }, { ok: true }>(
  "/master/seguranca/ips/desbloquear",
);

/** Retenção mínima de dados pessoais (LGPD): expurga logs antigos. */
export const purgarLogsAntigos = endpointPost<{ dias: number }, Record<string, number>>(
  "/master/seguranca/purgar-logs",
);

export type ChecagemPostura = {
  id: string;
  titulo: string;
  descricao: string;
  status: "ok" | "atencao" | "critico";
  detalhe: string;
  itens: string[];
  categoria: "banco" | "arquivos" | "contas" | "politica";
};

export type UsuarioObservado = {
  id: string;
  nome: string;
  email: string | null;
  role: string;
  hospital: string | null;
  ativo: boolean;
  confirmado: boolean;
  mfa: boolean;
  criadoEm: string | null;
  ultimoLogin: string | null;
  diasSemAcesso: number | null;
  acessos: number;
  falhas: number;
  risco: "ok" | "atencao" | "critico";
  alertas: string[];
};

/** Postura de segurança (checagens do banco/arquivos/contas) + observabilidade de usuários. */
export const posturaSeguranca = endpointPost<
  Parcial<{ dias: number }>,
  {
    geradoEm: string;
    pontuacao: number;
    checagens: ChecagemPostura[];
    resumoTabelas: { total: number; comRls: number; comAnon: number };
    usuarios: UsuarioObservado[];
    convites: { pendentes: number; expirados: number; revogados: number };
  }
>("/master/seguranca/postura");
