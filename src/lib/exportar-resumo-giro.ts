/**
 * Exportação do "resumão" do Giro de Sala para Excel, no formato que o gestor do hospital já usa:
 * abas Resumo (KPIs + tabela por sala com TOTAL + tempo por etapa), Por dia (médias por etapa),
 * Eventos (base detalhada com autofiltro) e Como ler (nota metodológica).
 *
 * Tempos vão como valores de tempo do Excel (fração de dia) com formato "[h]:mm:ss" (não volta a zero
 * depois de 24 h) e também em horas decimais, para o cliente somar e montar gráficos.
 * Textos entram sempre como texto simples (nunca como fórmula).
 */

import type { Workbook, Worksheet } from "exceljs";

import type {
  AgregadoGiro,
  BlocoTempo,
  LinhaGiro,
  RegistrosDoDia,
  SalaNoPeriodo,
} from "@/lib/api/hospital";
import { baixarXlsx } from "@/lib/exportar";
import { ETAPA_LABEL } from "@/lib/giro";
import { dataDe } from "@/lib/periodo";

type ResumoGiro = {
  indicadores: {
    registros: number;
    concluidos: number;
    emAndamento: number;
    aRevisar: number;
    salasMonitoradas: number;
    limiteRevisaoSegundos: number;
  };
  salas: SalaNoPeriodo[];
  total: AgregadoGiro;
  porDia: RegistrosDoDia[];
};

export type DadosExportacaoGiro = {
  hospital: string;
  /** Ex.: "01 a 31 de outubro de 2026". */
  periodoTexto: string;
  periodo: { de: string; ate: string };
  salaTexto: string;
  resumo: ResumoGiro;
  eventos: LinhaGiro[];
};

const AZUL = "FF172A45";
const AZUL_CLARO = "FFDCE6F2";
const BORDA = { style: "thin" as const, color: { argb: "FFB7C3D0" } };
const FMT_TEMPO = "[h]:mm:ss";
const FMT_HORAS = "0.0";

const diaExcel = (seg: number) => seg / 86400;
const horas = (seg: number) => Math.round((seg / 3600) * 10) / 10;

/** Data "civil" sem deslocamento de fuso (o Excel não tem fuso). */
const dataCivil = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
const horaDoDia = (d: Date) => (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;

function estiloCabecalho(ws: Worksheet, linha: number, de: number, ate: number) {
  const row = ws.getRow(linha);
  for (let c = de; c <= ate; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: c === de ? "left" : "center",
      wrapText: true,
    };
    cell.border = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA };
  }
}

function bordas(ws: Worksheet, linha: number, de: number, ate: number) {
  const row = ws.getRow(linha);
  for (let c = de; c <= ate; c++)
    row.getCell(c).border = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA };
}

/** Escreve uma linha a partir da coluna 1; números com formato próprio ficam à direita. */
function escrever(
  ws: Worksheet,
  linha: number,
  valores: (string | number | Date | null | { v: number; fmt: string })[],
) {
  const row = ws.getRow(linha);
  valores.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    if (v != null && typeof v === "object" && !(v instanceof Date)) {
      cell.value = v.v;
      cell.numFmt = v.fmt;
      cell.alignment = { horizontal: "right" };
    } else {
      cell.value = v;
      if (typeof v === "number") cell.alignment = { horizontal: "right" };
    }
  });
  return row;
}

const t = (seg: number | null) => (seg == null ? null : { v: diaExcel(seg), fmt: FMT_TEMPO });
const h = (seg: number | null) => (seg == null ? null : { v: horas(seg), fmt: FMT_HORAS });

const celulasBloco = (b: BlocoTempo) => [b.quantidade, t(b.total), h(b.total), t(b.media)];

/* ------------------------------ Aba Resumo ------------------------------ */

function abaResumo(wb: Workbook, d: DadosExportacaoGiro) {
  const ws = wb.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
  ws.getCell("A1").value = "Dashboard Gerencial — Giro de Sala";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: AZUL } };
  ws.getCell("A2").value = d.hospital;
  ws.getCell("A2").font = { bold: true, size: 12 };
  ws.getCell("A3").value = `Período de referência: ${d.periodoTexto} · ${d.salaTexto}`;
  ws.getCell("A4").value = `Gerado em ${new Date().toLocaleString("pt-BR")} pelo KlinSync`;
  ws.getCell("A4").font = { italic: true, size: 9, color: { argb: "FF667085" } };

  // KPIs
  const k = d.resumo.indicadores;
  escrever(ws, 6, [
    "Registros na base",
    "Salas monitoradas",
    "Em andamento",
    "Registros concluídos",
    `Durações a revisar (< ${k.limiteRevisaoSegundos} s)`,
  ]);
  estiloCabecalho(ws, 6, 1, 5);
  ws.getRow(6).getCell(1).alignment = { horizontal: "center", wrapText: true };
  const kpi = escrever(ws, 7, [
    k.registros,
    k.salasMonitoradas,
    k.emAndamento,
    k.concluidos,
    k.aRevisar,
  ]);
  kpi.font = { bold: true, size: 14 };
  kpi.eachCell((c) => (c.alignment = { horizontal: "center" }));
  bordas(ws, 7, 1, 5);

  // Tabela por sala
  ws.getCell("A9").value = "Tempo total por sala (enfermagem + limpeza) e paradas";
  ws.getCell("A9").font = { bold: true, size: 12, color: { argb: AZUL } };
  const g = 10;
  escrever(ws, g, [
    "Sala",
    "Enfermagem",
    "",
    "",
    "",
    "Limpeza",
    "",
    "",
    "",
    "Total por sala",
    "",
    "Paradas",
    "",
    "",
  ]);
  ws.mergeCells(g, 1, g + 1, 1);
  ws.mergeCells(g, 2, g, 5);
  ws.mergeCells(g, 6, g, 9);
  ws.mergeCells(g, 10, g, 11);
  ws.mergeCells(g, 12, g, 14);
  const sub = ["Qtd", "Tempo total", "Horas", "Média"];
  escrever(ws, g + 1, ["", ...sub, ...sub, "Tempo total", "Horas", "Qtd", "Tempo total", "Horas"]);
  estiloCabecalho(ws, g, 1, 14);
  estiloCabecalho(ws, g + 1, 1, 14);

  const linha = (nome: string, a: AgregadoGiro) => {
    const totalSala = a.enfermagem.total + a.limpeza.total;
    return [
      nome,
      ...celulasBloco(a.enfermagem),
      ...celulasBloco(a.limpeza),
      t(totalSala),
      h(totalSala),
      a.paradas.quantidade,
      t(a.paradas.total),
      h(a.paradas.total),
    ];
  };
  let r = g + 2;
  for (const s of d.resumo.salas) {
    escrever(ws, r, linha(s.nome, s));
    bordas(ws, r, 1, 14);
    r++;
  }
  const tot = escrever(ws, r, linha("TOTAL", d.resumo.total));
  tot.font = { bold: true };
  for (let c = 1; c <= 14; c++) {
    tot.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_CLARO } };
  }
  bordas(ws, r, 1, 14);
  tot.getCell(1).border = {
    top: { style: "medium", color: { argb: AZUL } },
    bottom: BORDA,
    left: BORDA,
    right: BORDA,
  };

  // Tempo total por etapa
  r += 2;
  ws.getCell(r, 1).value = "Tempo total registrado por etapa";
  ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: AZUL } };
  r++;
  escrever(ws, r, ["Etapa", "Qtd", "Tempo total", "Horas", "Participação"]);
  estiloCabecalho(ws, r, 1, 5);
  const T = d.resumo.total;
  const soma = T.enfermagem.total + T.limpeza.total;
  const part = (seg: number) => ({ v: soma === 0 ? 0 : seg / soma, fmt: "0.0%" });
  for (const [nome, b, p] of [
    ["Enfermagem", T.enfermagem, part(T.enfermagem.total)],
    ["Limpeza", T.limpeza, part(T.limpeza.total)],
    ["Sala parada", T.paradas, null],
  ] as const) {
    r++;
    escrever(ws, r, [nome, b.quantidade, t(b.total), h(b.total), p]);
    bordas(ws, r, 1, 5);
  }

  for (let c = 1; c <= 14; c++) ws.getColumn(c).width = c === 1 ? 26 : 12;
  ws.getRow(g).height = 20;
  ws.getRow(g + 1).height = 20;
  ws.getRow(6).height = 32;
}

/* ------------------------------ Aba Por dia ------------------------------ */

function abaPorDia(wb: Workbook, d: DadosExportacaoGiro) {
  const ws = wb.addWorksheet("Por dia", { views: [{ state: "frozen", ySplit: 1 }] });
  escrever(ws, 1, [
    "Data",
    "Enfermagem - qtd",
    "Enfermagem - média",
    "Limpeza - qtd",
    "Limpeza - média",
    "Registros (inclui em andamento)",
  ]);
  estiloCabecalho(ws, 1, 1, 6);
  const mapa = new Map(d.resumo.porDia.map((x) => [x.dia, x]));
  const hoje = new Date();
  let r = 2;
  for (let dia = dataDe(d.periodo.de); dia <= dataDe(d.periodo.ate) && dia <= hoje;) {
    const chave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
    const v = mapa.get(chave);
    const row = escrever(ws, r, [
      dataCivil(dia),
      v?.enfermagemConcluidos ?? 0,
      t(v?.mediaEnfermagem ?? null),
      v?.limpezaConcluidos ?? 0,
      t(v?.mediaLimpeza ?? null),
      v?.total ?? 0,
    ]);
    row.getCell(1).numFmt = "dd/mm/yyyy";
    bordas(ws, r, 1, 6);
    r++;
    dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  }
  const T = d.resumo.total;
  const tot = escrever(ws, r, [
    "TOTAL / média do período",
    T.enfermagem.quantidade,
    t(T.enfermagem.media),
    T.limpeza.quantidade,
    t(T.limpeza.media),
    d.resumo.porDia.reduce((a, x) => a + x.total, 0),
  ]);
  tot.font = { bold: true };
  for (let c = 1; c <= 6; c++)
    tot.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_CLARO } };
  bordas(ws, r, 1, 6);
  ws.columns = [24, 16, 18, 14, 16, 18].map((width) => ({ width }));
}

/* ------------------------------ Aba Eventos ------------------------------ */

function abaEventos(wb: Workbook, d: DadosExportacaoGiro) {
  const limite = d.resumo.indicadores.limiteRevisaoSegundos;
  const ws = wb.addWorksheet("Eventos", { views: [{ state: "frozen", ySplit: 1 }] });
  const cab = [
    "Data",
    "Início",
    "Fim",
    "Sala",
    "Etapa",
    "Duração",
    "Duração (min)",
    "Status",
    "Revisar",
    "Iniciado por",
    "Finalizado por",
    "Cirurgia anterior",
    "Próxima cirurgia",
  ];
  escrever(ws, 1, cab);
  estiloCabecalho(ws, 1, 1, cab.length);
  const ordenados = [...d.eventos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  ordenados.forEach((e, i) => {
    const ini = new Date(e.inicio);
    const fim = e.fim ? new Date(e.fim) : null;
    const dur = e.fim ? e.duracao_segundos : null;
    const row = escrever(ws, i + 2, [
      dataCivil(ini),
      { v: horaDoDia(ini), fmt: "hh:mm:ss" },
      fim
        ? { v: horaDoDia(fim) + (dataCivil(fim) > dataCivil(ini) ? 1 : 0), fmt: "hh:mm:ss" }
        : null,
      e.sala,
      ETAPA_LABEL[e.tipo_evento as keyof typeof ETAPA_LABEL] ?? e.tipo_evento,
      t(dur),
      dur == null ? null : { v: Math.round((dur / 60) * 10) / 10, fmt: FMT_HORAS },
      fim ? "Concluído" : "Em andamento",
      dur != null && dur < limite ? "Revisar" : "",
      e.usuario_inicio ?? "",
      e.usuario_fim ?? "",
      e.cirurgia_anterior ?? "",
      e.cirurgia_proxima ?? "",
    ]);
    row.getCell(1).numFmt = "dd/mm/yyyy";
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cab.length } };
  ws.columns = [12, 10, 10, 14, 13, 11, 13, 14, 9, 22, 22, 28, 28].map((width) => ({ width }));
}

/* ------------------------------ Aba Como ler ------------------------------ */

export const NOTA_METODOLOGICA = (limite: number) => [
  "Período: entram os registros que COMEÇARAM dentro do período escolhido (datas no fuso do hospital).",
  "Atividades em andamento ainda não têm duração final: são contadas em “Em andamento”, mas não somam nos tempos totais nem nas médias.",
  "Enfermagem = desmontagem + montagem da sala, SEM o tempo da limpeza que acontece dentro dela (tempo líquido).",
  "Limpeza = soma das limpezas finalizadas. Total por sala = enfermagem + limpeza (o ciclo inteiro, sem contar duas vezes).",
  `Durações abaixo de ${limite} segundos são sinalizadas apenas para conferência (podem ser falha de apontamento no tablet). Elas não são erro e continuam nos totais.`,
  "O tempo total de enfermagem/limpeza é o acumulado por etapa no período; não é o tempo de giro entre duas cirurgias.",
  "Paradas: somente paradas já encerradas entram na quantidade e no tempo total; salas paradas agora aparecem destacadas no painel.",
  "Colunas “Horas” trazem o mesmo tempo em horas decimais (ex.: 518,0), prontas para somar e fazer gráficos.",
];

function abaComoLer(wb: Workbook, d: DadosExportacaoGiro) {
  const ws = wb.addWorksheet("Como ler");
  ws.getCell("A1").value = "Como ler este relatório";
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: AZUL } };
  NOTA_METODOLOGICA(d.resumo.indicadores.limiteRevisaoSegundos).forEach((txt, i) => {
    const c = ws.getCell(i + 3, 1);
    c.value = `• ${txt}`;
    c.alignment = { wrapText: true, vertical: "top" };
  });
  ws.getColumn(1).width = 110;
}

/* ------------------------------ Entrada ------------------------------ */

export async function baixarResumoGiro(nomeArquivo: string, dados: DadosExportacaoGiro) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "KlinSync";
  wb.created = new Date();
  abaResumo(wb, dados);
  abaPorDia(wb, dados);
  abaEventos(wb, dados);
  abaComoLer(wb, dados);
  baixarXlsx(nomeArquivo, await wb.xlsx.writeBuffer());
}
