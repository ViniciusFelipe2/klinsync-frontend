import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  AlertaAvaliacao,
  DataMatrixSvg,
  textoMatriz,
  textoModulo,
} from "@/components/cme/data-matrix";
import { Button } from "@/components/ui/button";
import {
  ROTULO_PERFIL,
  dadosCrachas,
  dadosFolhaTeste,
  dadosImpressao,
  type CrachaImpressao,
} from "@/lib/api/cme";

type Busca = { ids: string; tamanho: number; folhaTeste?: boolean; crachas?: boolean };

export const Route = createFileRoute("/_authenticated/cme/impressao")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    ids: typeof s["ids"] === "string" ? s["ids"] : "",
    tamanho: Number(s["tamanho"]) || 5,
    ...(s["folhaTeste"] === true ? { folhaTeste: true } : {}),
    ...(s["crachas"] === true ? { crachas: true } : {}),
  }),
  component: Impressao,
});

/** Crachá no tamanho de cartão (85,6 x 54 mm). A linha tracejada é a linha de corte. */
function Cracha({ c, tamanhoMm }: { c: CrachaImpressao; tamanhoMm: number }) {
  return (
    <div
      className="flex break-inside-avoid items-center justify-between gap-3 border border-dashed border-black bg-white text-black"
      style={{ width: "85.6mm", height: "54mm", padding: "4mm", boxSizing: "border-box" }}
    >
      <div className="min-w-0">
        <p className="text-[8pt] tracking-wide uppercase">{ROTULO_PERFIL[c.perfil]}</p>
        <p className="mt-1 text-[13pt] leading-tight font-bold">{c.nome}</p>
        <p className="mt-2 text-[9pt]">Crachá nº</p>
        <p className="font-mono text-[12pt] font-semibold">{c.numero_cracha}</p>
      </div>
      <DataMatrixSvg matriz={c.matriz} tamanhoMm={tamanhoMm} />
    </div>
  );
}

function Regua() {
  const marcas = Array.from({ length: 51 }, (_, i) => i);
  return (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="56mm"
        height="9mm"
        viewBox="-3 0 56 9"
        role="img"
        aria-label="Régua de 50 mm"
      >
        {marcas.map((m) => (
          <line
            key={m}
            x1={m}
            x2={m}
            y1={0}
            y2={m % 10 === 0 ? 5 : m % 5 === 0 ? 3.5 : 2}
            stroke="#000"
            strokeWidth={0.12}
          />
        ))}
        <line x1={0} x2={50} y1={0} y2={0} stroke="#000" strokeWidth={0.12} />
        {marcas
          .filter((m) => m % 10 === 0)
          .map((m) => (
            <text key={m} x={m} y={8} fontSize={2.4} textAnchor="middle" fill="#000">
              {m}
            </text>
          ))}
      </svg>
      <p className="text-xs text-black">
        Régua de 50 mm. Confira com uma régua de verdade: se não medir 50 mm, a impressão saiu fora
        de escala e o teste não vale.
      </p>
    </div>
  );
}

function Impressao() {
  const { ids, tamanho, folhaTeste, crachas } = Route.useSearch();
  const lista = ids.split(",").filter(Boolean);

  const lote = useMutation({
    mutationFn: () => dadosImpressao({ ids: lista, tamanhoMm: tamanho }),
  });
  const folha = useMutation({ mutationFn: () => dadosFolhaTeste(lista[0] ?? "") });
  const cartoes = useMutation({ mutationFn: () => dadosCrachas({ ids: lista }) });

  // Mutação, e não consulta: cada busca grava na auditoria, então não pode repetir sozinha ao voltar para a aba.
  const buscou = useRef(false);
  useEffect(() => {
    if (buscou.current) return;
    buscou.current = true;
    if (crachas) cartoes.mutate();
    else if (folhaTeste) folha.mutate();
    else lote.mutate();
  }, [crachas, folhaTeste, folha, lote, cartoes]);

  const erro = lote.error ?? folha.error ?? cartoes.error;
  const pronto = !!(lote.data ?? folha.data ?? cartoes.data);

  return (
    <div>
      <div className="mb-6 space-y-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={crachas ? "/cme/colaboradores" : "/cme"}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
            </Link>
          </Button>
          <Button disabled={!pronto} onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" /> Imprimir
          </Button>
        </div>
        <div className="rounded-lg border-2 border-primary/40 bg-card p-4 text-sm">
          <p className="font-semibold">Antes de imprimir, confira na janela de impressão:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Escala em <strong>100%</strong> ou <strong>tamanho real</strong>.
            </li>
            <li>
              <strong>Desmarque "ajustar à página"</strong> e também cabeçalhos e rodapés.
            </li>
            <li>
              Use a <strong>melhor qualidade</strong> da impressora. Prefira laser, com 600 dpi ou
              mais.
            </li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Na tela, o tamanho pode parecer diferente. O que vale é o papel impresso.
          </p>
        </div>
      </div>

      {erro ? (
        <p role="alert" className="rounded-lg border-2 border-red-600 bg-red-50 p-4 text-red-900">
          {erro.message}
        </p>
      ) : null}
      {!pronto && !erro ? <p className="text-sm text-muted-foreground">Preparando...</p> : null}

      {cartoes.data ? (
        <div className="flex flex-wrap gap-[4mm] bg-white">
          {cartoes.data.linhas.map((c) => (
            <Cracha key={c.id} c={c} tamanhoMm={cartoes.data.tamanhoMm} />
          ))}
        </div>
      ) : null}

      {lote.data ? (
        <div className="folha-codigos flex flex-wrap items-start gap-4 bg-white text-black">
          {lote.data.linhas.map((c) => (
            <div key={c.id} className="break-inside-avoid">
              <DataMatrixSvg matriz={c.matriz} tamanhoMm={tamanho} />
              <p className="mt-1 max-w-32 text-[9px] leading-tight">{c.rotulo}</p>
              <p className="font-mono text-[9px] leading-tight">{c.codigo}</p>
            </div>
          ))}
        </div>
      ) : null}

      {folha.data ? (
        <div className="space-y-5 bg-white text-black">
          <div>
            <p className="font-semibold">Folha de teste: {folha.data.rotulo}</p>
            <p className="font-mono text-sm">{folha.data.codigo}</p>
          </div>
          <Regua />
          <div className="grid grid-cols-3 gap-6">
            {folha.data.tamanhos.map(({ avaliacao, matriz }) => (
              <div key={avaliacao.tamanhoMm} className="break-inside-avoid space-y-1">
                <p className="text-sm font-semibold">{avaliacao.tamanhoMm} mm</p>
                {matriz ? (
                  <DataMatrixSvg matriz={matriz} tamanhoMm={avaliacao.tamanhoMm} />
                ) : (
                  <AlertaAvaliacao avaliacao={avaliacao} />
                )}
                <p className="text-xs">
                  {textoMatriz(avaliacao)} · {textoModulo(avaliacao)}
                </p>
                <p className="text-xs">Leu: ( ) sim ( ) não Tentativas: ____</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
