import { AlertTriangle, Ban, CheckCircle2 } from "lucide-react";

import type { AvaliacaoCodigo } from "@/lib/api/cme";

/** Margem branca obrigatória, em quadradinhos. O servidor calcula o tamanho total com o mesmo valor. */
const ZONA_SILENCIO = 1;

/** Desenha a matriz como um único caminho: cada trecho contínuo de quadradinhos pretos vira um retângulo. */
function caminhoDaMatriz(matriz: boolean[][]): string {
  const partes: string[] = [];
  matriz.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      if (!linha[x]) {
        x += 1;
        continue;
      }
      let fim = x;
      while (fim < linha.length && linha[fim]) fim += 1;
      partes.push(`M${x} ${y}h${fim - x}v1h${x - fim}z`);
      x = fim;
    }
  });
  return partes.join("");
}

function medidas(matriz: boolean[][], tamanhoMm: number) {
  const lado = matriz.length;
  const totalMm = tamanhoMm + (2 * ZONA_SILENCIO * tamanhoMm) / lado;
  return {
    totalMm: `${totalMm.toFixed(4)}mm`,
    viewBox: `${-ZONA_SILENCIO} ${-ZONA_SILENCIO} ${lado + 2 * ZONA_SILENCIO} ${lado + 2 * ZONA_SILENCIO}`,
    fundo: lado + 2 * ZONA_SILENCIO,
  };
}

/** Código no tamanho físico exato (milímetros): preto puro sobre branco puro, sem cantos arredondados nem sombra. */
export function DataMatrixSvg({ matriz, tamanhoMm }: { matriz: boolean[][]; tamanhoMm: number }) {
  const { totalMm, viewBox, fundo } = medidas(matriz, tamanhoMm);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={totalMm}
      height={totalMm}
      viewBox={viewBox}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Código Data Matrix"
      style={{ display: "block", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <rect x={-ZONA_SILENCIO} y={-ZONA_SILENCIO} width={fundo} height={fundo} fill="#ffffff" />
      <path d={caminhoDaMatriz(matriz)} fill="#000000" />
    </svg>
  );
}

/** Baixa o código como arquivo .svg, no mesmo tamanho físico, para a empresa de gravação. */
export function baixarSvg(nomeArquivo: string, matriz: boolean[][], tamanhoMm: number) {
  const { totalMm, viewBox, fundo } = medidas(matriz, tamanhoMm);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalMm}" height="${totalMm}" viewBox="${viewBox}" shape-rendering="crispEdges"><rect x="${-ZONA_SILENCIO}" y="${-ZONA_SILENCIO}" width="${fundo}" height="${fundo}" fill="#ffffff"/><path d="${caminhoDaMatriz(matriz)}" fill="#000000"/></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

const numero = (v: number, casas: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Três casas de propósito: 0,167 mm arredondado viraria "0,17" e pareceria dentro do limite. */
export const textoModulo = (a: AvaliacaoCodigo) =>
  `${numero(a.moduloMm, 3)} mm (${numero(a.moduloMil, 1)} mil)`;

export const textoMatriz = (a: AvaliacaoCodigo) => `${a.modulosPorLado}x${a.modulosPorLado}`;

export function SeloSituacao({ avaliacao }: { avaliacao: AvaliacaoCodigo }) {
  if (avaliacao.situacao === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <CheckCircle2 className="size-4" aria-hidden="true" /> OK
      </span>
    );
  }
  if (avaliacao.situacao === "aviso") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
        <AlertTriangle className="size-4" aria-hidden="true" /> Sem folga
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-700">
      <Ban className="size-4" aria-hidden="true" /> Bloqueado
    </span>
  );
}

/** Aviso em destaque ou bloqueio, com o motivo escrito pelo servidor. */
export function AlertaAvaliacao({ avaliacao }: { avaliacao: AvaliacaoCodigo }) {
  if (avaliacao.situacao === "ok" || !avaliacao.mensagem) return null;
  const bloqueado = avaliacao.situacao === "bloqueado";
  return (
    <div
      role="alert"
      className={`flex gap-2 rounded-lg border-2 p-3 text-sm font-medium ${
        bloqueado
          ? "border-red-600 bg-red-50 text-red-900"
          : "border-amber-500 bg-amber-50 text-amber-900"
      }`}
    >
      {bloqueado ? (
        <Ban className="size-5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      )}
      <p>{avaliacao.mensagem}</p>
    </div>
  );
}

/** As medidas que dizem se a leitura está perto do limite. */
export function MedidasCodigo({ avaliacao }: { avaliacao: AvaliacaoCodigo }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Tamanho do código</dt>
      <dd>{numero(avaliacao.tamanhoMm, 1)} mm</dd>
      <dt className="text-muted-foreground">Com a margem branca</dt>
      <dd>{numero(avaliacao.totalComMargemMm, 2)} mm</dd>
      <dt className="text-muted-foreground">Quadradinhos por lado</dt>
      <dd>{textoMatriz(avaliacao)}</dd>
      <dt className="text-muted-foreground">Cada quadradinho</dt>
      <dd>{textoModulo(avaliacao)}</dd>
    </dl>
  );
}
