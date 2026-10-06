import { endpointPost } from "./http";
import type { Parcial } from "./types";

export type EventoAuditoria = {
  id: string;
  tipo: "acesso" | "acao" | "feature";
  quando: string;
  titulo: string;
  detalhe: string;
  autor: string | null;
  hospital: string | null;
  sucesso: boolean | null;
  ip: string | null;
  regiao: string | null;
};

export const ROTULO_ACAO: Record<string, string> = {
  criou_hospital: "Cadastrou hospital",
  atualizou_hospital: "Atualizou hospital",
  alterou_feature_flag: "Alterou feature do hospital",
  criou_usuario: "Criou usuário",
  criou_usuario_operacional: "Criou login operacional",
  resetou_senha: "Redefiniu senha",
  ativou_usuario: "Ativou usuário",
  desativou_usuario: "Desativou usuário",
  alterou_config_seguranca: "Alterou política de segurança",
  criou_convite: "Gerou convite",
  regerou_convite: "Gerou novo link de convite",
  revogou_convite: "Revogou convite",
  aceitou_convite: "Aceitou convite",
  bloqueou_ip: "Bloqueou IP",
  desbloqueou_ip: "Liberou IP",
  purgou_logs: "Expurgou logs antigos (LGPD)",
};

export const auditoria = endpointPost<
  Parcial<{ dias: number }>,
  { eventos: EventoAuditoria[]; hospitais: string[] }
>("/auditoria");
