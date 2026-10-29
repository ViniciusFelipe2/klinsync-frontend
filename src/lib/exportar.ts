/**
 * Exportação de tabelas do painel do hospital para Excel e PDF.
 * As bibliotecas pesadas são carregadas sob demanda (import dinâmico).
 */

import type { ReactNode } from "react";

export type Coluna<T> = {
  chave: string;
  titulo: string;
  valor: (linha: T) => string | number;
  /** Conteúdo customizado na tela (a exportação continua usando `valor`). */
  render?: (linha: T) => ReactNode;
};

/**
 * Gera e baixa uma planilha .xlsx (exceljs). Textos entram sempre como texto, nunca como fórmula:
 * um nome começando com "=" não vira fórmula na planilha.
 */
export async function baixarPlanilha(nomeArquivo: string, aba: string, linhas: (string | number)[][]) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(aba.slice(0, 31));
  for (const l of linhas) ws.addRow(l);
  ws.getRow(1).font = { bold: true };
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportarExcel<T>(nomeArquivo: string, colunas: Coluna<T>[], linhas: T[]) {
  await baixarPlanilha(nomeArquivo, "Dados", [
    colunas.map((c) => c.titulo),
    ...linhas.map((l) => colunas.map((c) => c.valor(l))),
  ]);
}

export async function exportarPdf<T>(
  nomeArquivo: string,
  titulo: string,
  colunas: Coluna<T>[],
  linhas: T[],
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new JsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  autoTable(doc, {
    startY: 26,
    head: [colunas.map((c) => c.titulo)],
    body: linhas.map((l) => colunas.map((c) => String(c.valor(l)))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [23, 42, 69] },
  });
  doc.save(`${nomeArquivo}.pdf`);
}
