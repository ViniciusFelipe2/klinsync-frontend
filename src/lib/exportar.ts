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

function matriz<T>(colunas: Coluna<T>[], linhas: T[]) {
  return linhas.map((l) => {
    const obj: Record<string, string | number> = {};
    for (const c of colunas) obj[c.titulo] = c.valor(l);
    return obj;
  });
}

export async function exportarExcel<T>(nomeArquivo: string, colunas: Coluna<T>[], linhas: T[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(matriz(colunas, linhas));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
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
