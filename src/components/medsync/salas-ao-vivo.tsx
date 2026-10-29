import { useMemo, useState } from "react";

import { Cronometro } from "@/components/giro/Cronometro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventosAbertos, useParadasAbertas, useSalas } from "@/hooks/use-giro";
import { ETAPA_LABEL } from "@/lib/giro";

type Situacao = "parada" | "processo" | "livre";
type Filtro = "todas" | "ativas";

const ESTILO: Record<Situacao, { tile: string; ponto: string }> = {
  parada: { tile: "border-rose-500/50 bg-rose-500/10", ponto: "bg-rose-500" },
  processo: { tile: "border-amber-500/50 bg-amber-500/10", ponto: "bg-amber-500" },
  livre: { tile: "border-border bg-card", ponto: "bg-emerald-500" },
};

/**
 * Situação de cada sala neste instante. Compacto de propósito: com muitas salas, o que precisa de atenção
 * (paradas e em andamento) vem primeiro e as livres ficam discretas. Atualiza sozinho pelo canal em tempo real.
 * Fica oculto se o hospital não contratou o giro de sala.
 */
export function SalasAoVivo() {
  const salas = useSalas();
  const eventos = useEventosAbertos();
  const paradas = useParadasAbertas();
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const itens = useMemo(() => {
    const ordem: Record<Situacao, number> = { parada: 0, processo: 1, livre: 2 };
    return (salas.data ?? [])
      .map((sala) => {
        const parada = (paradas.data ?? []).find((p) => p.sala_id === sala.id);
        const aberta = (eventos.data ?? []).find((e) => e.sala_id === sala.id && !e.fim);
        const situacao: Situacao = parada
          ? "parada"
          : sala.status_atual !== "livre"
            ? "processo"
            : "livre";
        const inicio = parada?.inicio ?? aberta?.inicio ?? null;
        const rotulo = parada
          ? "Parada"
          : situacao === "processo"
            ? ETAPA_LABEL[sala.status_atual as keyof typeof ETAPA_LABEL]
            : "Livre";
        const detalhe =
          aberta?.tipo_evento === "desmontagem" && aberta.cirurgia_anterior
            ? `Desmontando: ${aberta.cirurgia_anterior}`
            : sala.cirurgia_atual
              ? `Próxima: ${sala.cirurgia_atual}`
              : "";
        return { sala, situacao, inicio, rotulo, detalhe };
      })
      .sort(
        (a, b) =>
          ordem[a.situacao] - ordem[b.situacao] ||
          a.sala.nome.localeCompare(b.sala.nome, "pt-BR", { numeric: true }),
      );
  }, [salas.data, eventos.data, paradas.data]);

  if (salas.isError || !salas.data || salas.data.length === 0) return null; // sem módulo ou sem salas

  const total = itens.length;
  const contagem = (s: Situacao) => itens.filter((i) => i.situacao === s).length;
  const visiveis = filtro === "ativas" ? itens.filter((i) => i.situacao !== "livre") : itens;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Salas agora</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className={`size-2 rounded-full ${ESTILO.livre.ponto}`} />
            {contagem("livre")} livres
          </span>
          <span className="flex items-center gap-1.5">
            <i className={`size-2 rounded-full ${ESTILO.processo.ponto}`} />
            {contagem("processo")} em andamento
          </span>
          <span className="flex items-center gap-1.5">
            <i className={`size-2 rounded-full ${ESTILO.parada.ponto}`} />
            {contagem("parada")} paradas
          </span>
          {total > 8 ? (
            <button
              type="button"
              onClick={() => setFiltro(filtro === "todas" ? "ativas" : "todas")}
              className="rounded-md border px-2 py-1 font-medium text-foreground hover:bg-muted"
              aria-pressed={filtro === "ativas"}
            >
              {filtro === "ativas" ? `Mostrar todas (${total})` : "Só as que precisam de atenção"}
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {visiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sala em andamento ou parada no momento.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visiveis.map(({ sala, situacao, inicio, rotulo, detalhe }) => (
              <div
                key={sala.id}
                className={`rounded-lg border px-3 py-2 ${ESTILO[situacao].tile}`}
                title={[sala.nome, rotulo, detalhe].filter(Boolean).join(" · ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{sala.nome}</p>
                  <i className={`size-2.5 shrink-0 rounded-full ${ESTILO[situacao].ponto}`} />
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{rotulo}</span>
                  {inicio ? (
                    <Cronometro inicio={inicio} className="text-sm font-semibold tabular-nums" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
