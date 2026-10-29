import { http } from "./http";

export type Horas = 1 | 6 | 24 | 72;
export type Severidade = "critico" | "aviso" | "info";

export type Alerta = {
  id: string;
  severidade: Severidade;
  categoria: "servidor" | "aplicacao" | "banco" | "custo" | "observabilidade";
  titulo: string;
  detalhe: string;
  recomendacao: string;
  recurso?: string;
};

/** Quando a AWS não responde, o painel diz o motivo e o que fazer em vez de ficar em branco. */
export type Fonte =
  | { ok: true }
  | { ok: false; motivo: "credenciais" | "permissao" | "erro"; mensagem: string; acao?: string };

export type Resumo = {
  geradoEm: string;
  modo: "aws" | "demo";
  saude: "ok" | "atencao" | "critico";
  alertas: Alerta[];
  kpis: {
    servidores: { total: number; emExecucao: number; comProblema: number };
    api: { requisicoes15m: number; taxaErros5xx: number; latenciaMediaMs: number };
    banco: { latenciaMs: number; conexoes: number; maxConexoes: number } | null;
    custos: {
      mesAtual: number;
      previsaoFimMes: number | null;
      hoje: number;
      orcamento: number | null;
    } | null;
  };
  fontes: { servidores: Fonte; custos: Fonte };
};

export type Ponto = { t: number; v: number };
export type StatusCheck = "ok" | "comprometido" | "inicializando" | "indisponivel" | "desconhecido";

export type Instancia = {
  id: string;
  nome: string;
  tipo: string;
  estado: string;
  az: string | null;
  ipPrivado: string | null;
  ipPublico: string | null;
  iniciadaEm: string | null;
  burstavel: boolean;
  statusInstancia: StatusCheck;
  statusSistema: StatusCheck;
  eventosAgendados: { codigo: string; descricao: string; inicio: string | null }[];
};

export type SerieInstancia = {
  cpu: Ponto[];
  redeEntrada: Ponto[];
  redeSaida: Ponto[];
  creditos: Ponto[];
  memoria: Ponto[];
  disco: Ponto[];
  falhaStatus: Ponto[];
};

export type Servidores = {
  modo: "aws" | "demo";
  horas: Horas;
  fonte: Fonte;
  instancias: Instancia[];
  series: Record<string, SerieInstancia>;
  alarmes: {
    nome: string;
    estado: "OK" | "ALARM" | "INSUFFICIENT_DATA";
    motivo: string;
    atualizadoEm: string | null;
    metrica: string | null;
  }[];
  periodoSegundos: number;
  geradoEm: string;
};

export type LinhaApp = {
  requisicoes: number;
  erros4xx: number;
  erros5xx: number;
  lentas: number;
  latenciaMediaMs: number;
  latenciaMaxMs: number;
};

export type Aplicacao = {
  horas: Horas;
  limiteLentaMs: number;
  serie: (LinhaApp & { t: number })[];
  rotas: (LinhaApp & { metodo: string; rota: string })[];
  recente: {
    requisicoes: number;
    erros4xx: number;
    erros5xx: number;
    lentas: number;
    latenciaMediaMs: number;
  };
  banco:
    | { disponivel: false }
    | {
        disponivel: true;
        latenciaMs: number;
        conexoes: number;
        maxConexoes: number;
        tamanhoBytes: number;
        consultasAtivas: number;
        consultaMaisLongaSeg: number;
        versao: string;
      };
  processo: {
    pid: number;
    node: string;
    ambiente: string;
    uptimeSeg: number;
    rssMb: number;
    heapUsadoMb: number;
    atrasoLoopMs: number;
    atrasoLoopP99Ms: number;
    host: { cpus: number; cargaMedia1m: number; memoriaTotalMb: number; memoriaLivreMb: number };
  };
};

export type Custos = {
  moeda: "USD";
  mesAtual: {
    inicio: string;
    fim: string;
    total: number;
    diasDecorridos: number;
    diasNoMes: number;
  };
  mesAnterior: { total: number; mesmoPeriodo: number };
  previsaoFimMes: number | null;
  hoje: number;
  mediaDiaria7d: number;
  diario: { dia: string; valor: number }[];
  porServico: { servico: string; valor: number; anterior: number }[];
  atualizadoEm: string;
};

export type RespostaCustos = {
  modo: "aws" | "demo";
  fonte: Fonte;
  orcamento: number | null;
  proximaAtualizacaoManualEm: string | null;
  custos: Custos | null;
};

const base = "/master/observabilidade";

export const obterResumo = () => http.get<Resumo>(`${base}/resumo`);
export const obterServidores = (horas: Horas) =>
  http.post<Servidores>(`${base}/servidores`, { horas });
export const obterAplicacao = (horas: Horas) =>
  http.post<Aplicacao>(`${base}/aplicacao`, { horas });
export const obterCustos = (atualizar = false) =>
  http.post<RespostaCustos>(`${base}/custos`, { atualizar });
