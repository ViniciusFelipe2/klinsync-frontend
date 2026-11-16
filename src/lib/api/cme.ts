import { http } from "./http";

export type SituacaoCodigo = "ok" | "aviso" | "bloqueado";
export type TipoCodigo = "item" | "caixa";
export type TipoPeca = "papel" | "inox_liso" | "inox_curvo" | "peca_pequena" | "peca_gasta";
export type OrigemLeitura = "leitor" | "manual" | "nao_leu";

export type AvaliacaoCodigo = {
  tamanhoMm: number;
  modulosPorLado: number;
  moduloMm: number;
  moduloMil: number;
  totalComMargemMm: number;
  situacao: SituacaoCodigo;
  mensagem: string | null;
};

export type ConfigCme = {
  tamanhoPadraoMm: number;
  moduloMinimoMm: number;
  moduloAvisoMm: number;
  matrizMaxima5mm: number;
  tamanhoCrachaMm: number;
  /** Modo de teste: aceita o número do crachá digitado no computador da sala. */
  permitirCrachaDigitado: boolean;
};

export type AcessoCme = {
  tipo: "chefe" | "colaborador" | "estacao_sala" | "estacao_cme" | "painel_setor" | null;
  podeEditar: boolean;
  podeTestar: boolean;
  /** Só para o computador de sala. */
  sala: { id: string; nome: string } | null;
  config: ConfigCme;
};

export type CodigoCme = {
  id: string;
  tipo: TipoCodigo;
  rotulo: string;
  codigo: string;
  origem: "gerado" | "existente";
  matriz_lado: number;
  ativo: boolean;
  created_at: string;
  avaliacao: AvaliacaoCodigo;
};

export type LinhaImpressao = {
  id: string;
  rotulo: string;
  codigo: string;
  avaliacao: AvaliacaoCodigo;
  matriz: boolean[][];
};

export type LinhaExportacao = LinhaImpressao & { tipo: TipoCodigo };

export type FolhaTeste = {
  id: string;
  rotulo: string;
  codigo: string;
  tamanhos: { avaliacao: AvaliacaoCodigo; matriz: boolean[][] | null }[];
};

export type ResultadoTeste = {
  resultado: "sucesso" | "falha";
  reconhecido: boolean;
  normalizado: string;
  codigo: { id: string; rotulo: string; tipo: TipoCodigo; ativo: boolean } | null;
};

export type ResumoTeste = {
  tipo_peca: TipoPeca;
  total: number;
  sucessos: number;
  de_primeira: number;
  media_tentativas: number;
  media_ms: number | null;
};

export type ItemComFalha = {
  id: string;
  rotulo: string;
  codigo: string;
  tipo: TipoCodigo;
  ativo: boolean;
  leituras: number;
  manuais: number;
  nao_leu: number;
  falhas: number;
  ultima_falha: string;
};

export type RelatorioFalhas = {
  itens: ItemComFalha[];
  desconhecidos: { texto: string; vezes: number; ultima: string }[];
  manuais: {
    id: string;
    created_at: string;
    motivo: string;
    texto: string;
    rotulo: string | null;
    quem: string | null;
  }[];
};

export const ROTULO_PECA: Record<TipoPeca, string> = {
  papel: "Papel",
  inox_liso: "Inox liso",
  inox_curvo: "Inox curvo",
  peca_pequena: "Peça pequena",
  peca_gasta: "Peça gasta",
};

export const acessoCme = () => http.get<AcessoCme>("/cme/acesso");

export const salvarConfigCme = (data: ConfigCme) => http.post<{ ok: true }>("/cme/config", data);

export const listarCodigos = (f: {
  busca?: string;
  tamanhoMm?: number;
  pagina?: number;
  inativos?: boolean;
}) =>
  http.get<{ tamanhoMm: number; total: number; porPagina: number; linhas: CodigoCme[] }>(
    "/cme/codigos",
    { query: f },
  );

export const gerarCodigo = (data: { tipo: TipoCodigo; rotulo: string }) =>
  http.post<CodigoCme>("/cme/codigos/gerar", data);

export const registrarCodigoExistente = (data: {
  tipo: TipoCodigo;
  rotulo: string;
  codigo: string;
}) => http.post<CodigoCme>("/cme/codigos/existente", data);

export const alterarSituacaoCodigo = (data: { id: string; ativo: boolean }) =>
  http.post<{ ok: true }>("/cme/codigos/situacao", data);

export const previaCodigo = (data: { conteudo: string; tamanhoMm: number }) =>
  http.post<{ avaliacao: AvaliacaoCodigo; matriz: boolean[][] | null }>(
    "/cme/codigos/previa",
    data,
  );

export const dadosImpressao = (data: { ids: string[]; tamanhoMm: number }) =>
  http.post<{ linhas: LinhaImpressao[] }>("/cme/impressao", data);

export const dadosFolhaTeste = (id: string) => http.post<FolhaTeste>("/cme/folha-teste", { id });

export const exportarCodigos = (data: { ids: string[]; tamanhoMm: number }) =>
  http.post<{ linhas: LinhaExportacao[] }>("/cme/exportar", data);

export const registrarTeste = (data: {
  origem: OrigemLeitura;
  texto?: string;
  textoVisivel?: string;
  duracaoMs?: number;
  motivo?: string;
  codigoId?: string;
  tipoPeca: TipoPeca;
  tentativas: number;
  tamanhoMm?: number;
  observacao?: string;
}) => http.post<ResultadoTeste>("/cme/testes", data);

export const resumoTestes = () => http.get<ResumoTeste[]>("/cme/testes/resumo");

export const relatorioFalhas = (f: { de?: string; ate?: string } = {}) =>
  http.get<RelatorioFalhas>("/cme/relatorio-falhas", { query: f });

export const listarContasCme = () =>
  http.get<
    {
      usuario_id: string;
      tenant_id: string;
      tipo: string;
      sala_id: string | null;
      sala_nome: string | null;
    }[]
  >("/master/cme/contas");

export const definirFuncaoCme = (data: {
  usuarioId: string;
  funcao: "chefe" | "estacao_sala" | "estacao_cme" | null;
  salaId?: string;
}) => http.post<{ ok: true }>("/master/cme/funcao", data);

/* ---------------- Caixas e itens ---------------- */

export type TipoCaixa = "casa" | "consignada" | "medica";

export const ROTULO_TIPO_CAIXA: Record<TipoCaixa, string> = {
  casa: "Da casa",
  consignada: "Consignada",
  medica: "Médica",
};

export type CaixaCme = CodigoCme & {
  tipo_caixa: TipoCaixa;
  descricao: string | null;
  /** Só na caixa médica: dono da caixa e total de itens que ela deve ter. */
  medico_nome: string | null;
  total_itens: number | null;
  itens: CodigoCme[];
};

export const listarCaixas = (f: { busca?: string; tamanhoMm?: number; inativos?: boolean }) =>
  http.get<{ tamanhoMm: number; caixas: CaixaCme[]; semCaixa: CodigoCme[] }>("/cme/caixas", {
    query: f,
  });

export const criarCaixa = (data: {
  rotulo: string;
  tipoCaixa: TipoCaixa;
  descricao?: string;
  codigoGravado?: string;
  medicoNome?: string;
  totalItens?: number;
}) => http.post<CodigoCme>("/cme/caixas/criar", data);

export const editarCaixa = (data: {
  id: string;
  rotulo: string;
  tipoCaixa: TipoCaixa;
  descricao?: string;
  medicoNome?: string;
  totalItens?: number;
}) => http.post<{ ok: true }>("/cme/caixas/editar", data);

export const criarItem = (data: { caixaId: string; rotulo: string; codigoGravado?: string }) =>
  http.post<CodigoCme>("/cme/itens/criar", data);

export const editarItem = (data: { id: string; rotulo: string }) =>
  http.post<{ ok: true }>("/cme/itens/editar", data);

export const moverItem = (data: { id: string; caixaId: string }) =>
  http.post<{ ok: true }>("/cme/itens/mover", data);

/* ---------------- Colaboradores e crachás ---------------- */

export type PerfilColaborador = "cme" | "sala";

export const ROTULO_PERFIL: Record<PerfilColaborador, string> = {
  cme: "Equipe do CME",
  sala: "Equipe da sala",
};

export type Colaborador = {
  id: string;
  nome: string;
  numero_cracha: string;
  perfil: PerfilColaborador;
  ativo: boolean;
  created_at: string;
  avaliacao: AvaliacaoCodigo;
};

export const listarColaboradores = (f: { busca?: string; inativos?: boolean }) =>
  http.get<{ tamanhoMm: number; linhas: Colaborador[] }>("/cme/colaboradores", { query: f });

export const salvarColaborador = (data: {
  id?: string;
  nome: string;
  numeroCracha: string;
  perfil: PerfilColaborador;
}) => http.post<Omit<Colaborador, "avaliacao">>("/cme/colaboradores/salvar", data);

export const alterarSituacaoColaborador = (data: { id: string; ativo: boolean }) =>
  http.post<{ ok: true }>("/cme/colaboradores/situacao", data);

export type CrachaImpressao = Omit<Colaborador, "avaliacao"> & {
  avaliacao: AvaliacaoCodigo;
  matriz: boolean[][];
};

export const dadosCrachas = (data: { ids: string[] }) =>
  http.post<{ tamanhoMm: number; linhas: CrachaImpressao[] }>("/cme/crachas/impressao", data);

/* ---------------- Computador da sala ---------------- */

export type SessaoCracha = {
  colaborador: { id: string; nome: string; numeroCracha: string; perfil: PerfilColaborador };
  inatividadeMin: number;
};

type LeituraSala = { duracaoMs?: number; teclas?: number; digitado: boolean };

export const entrarComCracha = (data: { cracha: string } & LeituraSala) =>
  http.post<SessaoCracha & { token: string }>("/cme/sala/entrar", data);

export const renovarSessaoCracha = (token: string) =>
  http.post<SessaoCracha>("/cme/sala/sessao", { token });

export const sairDaSala = (token: string, motivo: "manual" | "inatividade" = "manual") =>
  http.post<{ ok: true }>("/cme/sala/sair", { token, motivo });

/** O gabarito não traz o código da peça de propósito: quem o visse poderia digitá-lo e burlar a conferência. */
export type ItemDoGabarito = { id: string; rotulo: string; conferido: boolean };

/** Onde a conferência item a item acontece. No computador da sala é sempre "sala". */
export type SetorConferencia = "sala" | "expurgo" | "preparo";

export type CaixaNaSala = {
  conferenciaId: string;
  setor: SetorConferencia;
  caixa: { id: string; rotulo: string; tipoCaixa: TipoCaixa; medicoNome: string | null };
  itens: ItemDoGabarito[];
};

type LeituraDeCodigo = { token: string; texto: string; textoVisivel?: string; motivo?: string };

/** Bipou a caixa: abre (ou retoma) a conferência e devolve o gabarito. */
export const abrirCaixaNaSala = (
  data: LeituraDeCodigo & LeituraSala & { setor?: "expurgo" | "preparo" },
) => http.post<CaixaNaSala>("/cme/sala/caixa", data);

export const conferirItem = (data: LeituraDeCodigo & LeituraSala & { conferenciaId: string }) =>
  http.post<{ item: { id: string; rotulo: string }; itens: ItemDoGabarito[] }>(
    "/cme/sala/item",
    data,
  );

export const finalizarConferencia = (data: { token: string; conferenciaId: string }) =>
  http.post<{ ok: true; itens: number; duracaoSegundos: number }>("/cme/sala/finalizar", data);

/* ---------------- Máquinas, esterilização e painel ---------------- */

export type CicloMaquina = { id: string; nome: string; duracaoMin: number };

export type CargaResumo = {
  id: string;
  /** "aguardando_retirada": o ciclo terminou e falta confirmar que as caixas foram para o arsenal. */
  status: "montando" | "em_ciclo" | "aguardando_retirada" | "concluida";
  cicloId: string;
  cicloNome: string;
  duracaoMin: number;
  iniciadaEm: string | null;
  terminaEm: string | null;
  caixas: number;
};

export type MaquinaCme = {
  id: string;
  nome: string;
  ativo: boolean;
  ciclos: CicloMaquina[];
  /** Carga em montagem, em ciclo ou esperando ir para o arsenal. */
  carga: CargaResumo | null;
  /** Com a máquina livre: o último ciclo que terminou. */
  ultimoCiclo: CargaResumo | null;
};

export type CargaDetalhe = Omit<CargaResumo, "caixas"> & {
  maquina: { id: string; nome: string };
  caixas: {
    id: string;
    rotulo: string;
    tipoCaixa: TipoCaixa;
    medicoNome: string | null;
    adicionadaEm: string;
  }[];
  /** Relógio do servidor no momento da resposta: a contagem regressiva parte dele. */
  agora: string;
};

export const listarMaquinas = () =>
  http.get<{ maquinas: MaquinaCme[]; agora: string }>("/cme/maquinas");

export const salvarMaquina = (data: {
  id?: string;
  nome: string;
  ativo: boolean;
  ciclos: { id?: string; nome: string; duracaoMin: number }[];
}) => http.post<{ id: string }>("/cme/maquinas/salvar", data);

/** Do computador do CME: lista as máquinas e o tempo restante de cada ciclo. */
export const maquinasDaEsterilizacao = () =>
  http.get<{ maquinas: MaquinaCme[]; agora: string }>("/cme/esterilizacao/maquinas");

export const abrirCarga = (data: { token: string; maquinaId: string; cicloId?: string }) =>
  http.post<CargaDetalhe>("/cme/esterilizacao/carga/abrir", data);

export const biparCaixaNaCarga = (data: LeituraDeCodigo & LeituraSala & { cargaId: string }) =>
  http.post<{ caixa: { id: string; rotulo: string }; carga: CargaDetalhe }>(
    "/cme/esterilizacao/carga/caixa",
    data,
  );

export const retirarCaixaDaCarga = (data: { token: string; cargaId: string; caixaId: string }) =>
  http.post<CargaDetalhe>("/cme/esterilizacao/carga/remover", data);

export const iniciarCiclo = (data: { token: string; cargaId: string }) =>
  http.post<CargaDetalhe>("/cme/esterilizacao/carga/iniciar", data);

/** Ciclo terminado: confirma que as caixas saíram da máquina e foram para o arsenal. */
export const confirmarArsenal = (data: { token: string; cargaId: string }) =>
  http.post<{ ok: true; caixas: number }>("/cme/esterilizacao/carga/arsenal", data);

/** Só para teste (exige o modo de teste ligado): apaga a carga e libera a máquina. */
export const cancelarCarga = (data: { token: string; cargaId: string }) =>
  http.post<{ ok: true }>("/cme/esterilizacao/carga/cancelar", data);

export type StatusCaixa =
  "sala" | "expurgo" | "preparo" | "esterilizacao" | "arsenal" | "sem_movimento";

export const ROTULO_STATUS_CAIXA: Record<StatusCaixa, string> = {
  // Bipada na sala cirúrgica: já foi usada e está contaminada.
  sala: "Contaminada",
  expurgo: "No expurgo",
  preparo: "Em preparo",
  esterilizacao: "Na esterilização",
  arsenal: "No arsenal",
  sem_movimento: "Sem movimentação",
};

export type CaixaNoPainel = {
  id: string;
  rotulo: string;
  tipoCaixa: TipoCaixa;
  medicoNome: string | null;
  status: StatusCaixa;
  /** Desde quando está neste status; vazio para caixa que nunca foi bipada. */
  desde: string | null;
  salaNome: string | null;
  maquinaNome: string | null;
  cicloNome: string | null;
  terminaEm: string | null;
  itens: number;
};

export type PainelCme = {
  agora: string;
  resumo: Record<StatusCaixa, number>;
  ultimas24h: { ciclos: number; caixasEsterilizadas: number };
  maquinas: MaquinaCme[];
  caixas: CaixaNoPainel[];
};

export const painelCme = () => http.get<PainelCme>("/cme/painel");
