import { endpointGet, endpointPost } from "./http";
import type { FiltroPagina, Pagina, Parcial, SalaResumo, Tenant } from "./types";

export const resumoHospital = endpointGet<{
  tenant: Tenant | null;
  features: {
    habilitada: boolean;
    habilitadaEm: string;
    id: string;
    chave: string;
    nome_exibicao: string;
    descricao: string | null;
  }[];
  usuarios: { total: number; ativos: number; operadores: number };
  salas: { total: number; ativas: number; emProcesso: number; limite: number | null };
  checkins: { hoje: number; ultimos30: number };
  giro: {
    eventos30: number;
    mediaDesmontagem: number | null;
    mediaLimpeza: number | null;
  };
  acessos: {
    id: string;
    email_tentado: string | null;
    sucesso: boolean;
    ip: string | null;
    pais_regiao: string | null;
    created_at: string;
  }[];
}>("/hospital/resumo");

export type LinhaCheckin = {
  id: string;
  doctor_name: string;
  checked_in_at: string;
  created_at: string;
};

export const checkinsDoHospital = endpointPost<
  Parcial<{ busca: string }> & FiltroPagina,
  Pagina<LinhaCheckin>
>("/hospital/checkins");

export type LinhaGiro = {
  id: string;
  tipo_evento: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
  cirurgia_anterior: string | null;
  cirurgia_proxima: string | null;
  sala: string;
};

export const giroDoHospital = endpointPost<
  Parcial<{ salaId: string; etapa: "todas" | "desmontagem" | "limpeza" | "remontagem" }> &
    FiltroPagina,
  Pagina<LinhaGiro>
>("/hospital/giro");

export const salasDoHospital = endpointGet<SalaResumo[]>("/hospital/salas");

export const salvarSalaDoHospital = endpointPost<
  { id?: string | undefined; nome: string; ativa?: boolean | undefined },
  { ok: true }
>("/hospital/salas/salvar");

export type LinhaAcesso = {
  id: string;
  email_tentado: string | null;
  sucesso: boolean;
  ip: string | null;
  pais_regiao: string | null;
  created_at: string;
};

export const acessosDoHospital = endpointPost<
  Parcial<{ busca: string }> & FiltroPagina,
  Pagina<LinhaAcesso>
>("/hospital/acessos");

export const estatisticasGiroHospital = endpointPost<
  Parcial<{ de: string; ate: string }>,
  {
    periodo: { de: string; ate: string };
    ciclos: number;
    mediaEnfermagem: number | null;
    mediaLimpeza: number | null;
    mediaGeral: number | null;
    mediaParada: number | null;
    paradas: number;
    porDia: { dia: string; enfermagem: number; limpeza: number; geral: number }[];
    porCiclo: {
      rotulo: string;
      indice: number;
      enfermagem: number;
      limpeza: number;
      geral: number;
    }[];
  }
>("/hospital/giro/estatisticas");

export type LinhaParada = {
  id: string;
  sala: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
};

export const paradasDoHospital = endpointPost<
  Parcial<{ salaId: string }> & FiltroPagina,
  Pagina<LinhaParada>
>("/hospital/paradas");

export const estatisticasParadaHospital = endpointPost<
  Parcial<{ salaId: string; de: string; ate: string }>,
  {
    janelas: number[];
    periodo: { de: string; ate: string };
    salas: {
      id: string;
      sala: string;
      total: number;
      ocorrencias: number;
      medias: Record<number, number | null>;
    }[];
    totalPeriodo: number;
    ocorrenciasPeriodo: number;
  }
>("/hospital/paradas/estatisticas");
