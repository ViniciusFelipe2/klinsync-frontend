import { Download, FileSpreadsheet } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportarExcel, exportarPdf, type Coluna } from "@/lib/exportar";

export type { Coluna };

/**
 * Tabela padrão do painel do hospital: filtros, paginação e exportação
 * (Excel e PDF) do conjunto atualmente carregado.
 */
export function TabelaDados<T>({
  titulo,
  colunas,
  linhas,
  total,
  pagina,
  porPagina,
  onPagina,
  carregando,
  filtros,
  nomeArquivo,
}: {
  titulo: string;
  colunas: Coluna<T>[];
  linhas: T[];
  total: number;
  pagina: number;
  porPagina: number;
  onPagina: (p: number) => void;
  carregando?: boolean;
  filtros?: ReactNode;
  nomeArquivo: string;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{titulo}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={linhas.length === 0}
              onClick={() => void exportarExcel(nomeArquivo, colunas, linhas)}
            >
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={linhas.length === 0}
              onClick={() => void exportarPdf(nomeArquivo, titulo, colunas, linhas)}
            >
              <Download className="size-4" /> PDF
            </Button>
          </div>
        </div>
        {filtros ? <div className="flex flex-wrap items-end gap-3">{filtros}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[60vh] overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {colunas.map((c) => (
                  <th key={c.chave} className="whitespace-nowrap px-3 py-2 font-medium">
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={colunas.length}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : linhas.length === 0 ? (
                <tr>
                  <td
                    colSpan={colunas.length}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Nenhum registro para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                linhas.map((l, i) => (
                  <tr key={i} className="border-t border-border/70">
                    {colunas.map((c) => (
                      <td key={c.chave} className="whitespace-nowrap px-3 py-2">
                        {c.render ? c.render(l) : c.valor(l)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {inicio}–{fim} de {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => onPagina(pagina - 1)}
            >
              Anterior
            </Button>
            <span>
              Página {pagina} de {paginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= paginas}
              onClick={() => onPagina(pagina + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
