import { useState, type ReactNode } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Info } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Cronometro } from "@/components/giro/Cronometro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useGiroPorSala } from "@/hooks/use-giro-por-sala";
import { useSessao } from "@/hooks/use-sessao";
import {
  giroDoHospital,
  salasDoHospital,
  type AgregadoGiro,
  type BlocoTempo,
  type LinhaGiro,
  type SalaNoPeriodo,
} from "@/lib/api/hospital";
import { exportarPdf, type Coluna } from "@/lib/exportar";
import { ETAPA_LABEL, formatDuracaoLegivel } from "@/lib/giro";
import {
  dataDe,
  intervaloDatas,
  rotuloPeriodo,
  rotuloPeriodoCurto,
  type FiltroHospital,
} from "@/lib/periodo";

const dur = formatDuracaoLegivel;
const horaCurta = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};
const totalSala = (a: AgregadoGiro) => a.enfermagem.total + a.limpeza.total;

function Esqueleto({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl border bg-muted/40 ${className}`} aria-busy="true" />
  );
}

/* ------------------------------------------------------------------ */
/* KPIs do período (como no resumão do cliente)                         */
/* ------------------------------------------------------------------ */

function Kpi({
  titulo,
  valor,
  nota,
  tom = "padrao",
}: {
  titulo: string;
  valor: number;
  nota: string;
  tom?: "padrao" | "atencao" | "andamento";
}) {
  const borda =
    tom === "atencao" && valor > 0
      ? "border-amber-500/60 bg-amber-500/5"
      : tom === "andamento" && valor > 0
        ? "border-sky-500/50 bg-sky-500/5"
        : "";
  return (
    <div className={`rounded-xl border bg-card px-4 py-3 ${borda}`}>
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}

export function IndicadoresDoPeriodo({ filtro }: { filtro: FiltroHospital }) {
  const q = useGiroPorSala(filtro);
  if (q.isError) return null; // o erro é explicado na tabela por sala
  if (!q.data) return <Esqueleto className="h-[92px]" />;
  const k = q.data.indicadores;
  const p = rotuloPeriodoCurto(filtro);
  return (
    <section
      aria-label={`Indicadores de ${p}`}
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
    >
      <Kpi titulo={`Registros · ${p}`} valor={k.registros} nota="Enfermagem e limpeza" />
      <Kpi titulo="Salas monitoradas" valor={k.salasMonitoradas} nota="No filtro atual" />
      <Kpi
        titulo="Em andamento"
        valor={k.emAndamento}
        nota="Ainda sem duração final"
        tom="andamento"
      />
      <Kpi titulo="Concluídos" valor={k.concluidos} nota="Entram nos tempos e médias" />
      <Kpi
        titulo={`Durações a revisar (< ${k.limiteRevisaoSegundos} s)`}
        valor={k.aRevisar}
        nota="Só para conferência; podem ser falha de apontamento"
        tom="atencao"
      />
    </section>
  );
}

const CONFIG_ETAPAS = {
  enfermagem: { label: "Enfermagem", color: "var(--giro-enfermagem)" },
  limpeza: { label: "Limpeza", color: "var(--giro-limpeza)" },
} satisfies ChartConfig;

/* ------------------------------------------------------------------ */
/* Salas paradas agora                                                  */
/* ------------------------------------------------------------------ */

export function SalasParadasAgora({ filtro }: { filtro: FiltroHospital }) {
  const q = useGiroPorSala(filtro);
  if (!q.data) return null;
  const paradas = q.data.salas
    .filter((s) => s.paradaDesde)
    .sort((a, b) => a.paradaDesde!.localeCompare(b.paradaDesde!));

  if (paradas.length === 0) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm"
      >
        <i aria-hidden className="size-2.5 rounded-full bg-emerald-500" />
        Nenhuma sala parada agora.
      </p>
    );
  }
  return (
    <section
      aria-label="Salas paradas agora"
      className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <AlertTriangle aria-hidden className="size-4 text-rose-600" />
        {paradas.length === 1 ? "1 sala parada agora" : `${paradas.length} salas paradas agora`}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {paradas.map((s) => (
          <li key={s.id} className="rounded-lg border border-rose-500/40 bg-card px-3 py-2">
            <p className="font-semibold">{s.nome}</p>
            <p className="text-xs text-muted-foreground">
              Parada desde {horaCurta(s.paradaDesde!)} · há{" "}
              <Cronometro inicio={s.paradaDesde!} className="font-semibold tabular-nums" />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              No período: {s.paradas.quantidade} parada(s) encerrada(s) · {dur(s.paradas.total)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela por sala com TOTAL + gráfico de barras                        */
/* ------------------------------------------------------------------ */

type LinhaResumo = AgregadoGiro & { nome: string; situacao: string };

const situacaoAgora = (s: SalaNoPeriodo) =>
  s.paradaDesde
    ? `Parada desde ${horaCurta(s.paradaDesde)}`
    : s.emAndamento
      ? `Em ${ETAPA_LABEL[s.emAndamento.tipo as keyof typeof ETAPA_LABEL] ?? s.emAndamento.tipo}`
      : s.ativa
        ? "Livre"
        : "Inativa";

/** Colunas do PDF: a mesma tabela da tela, com a linha de TOTAL no fim. */
const COLUNAS_PDF: Coluna<LinhaResumo>[] = [
  { chave: "sala", titulo: "Sala", valor: (l) => l.nome },
  { chave: "enf-qtd", titulo: "Enf. qtd", valor: (l) => l.enfermagem.quantidade },
  { chave: "enf-total", titulo: "Enf. tempo total", valor: (l) => dur(l.enfermagem.total) },
  { chave: "enf-media", titulo: "Enf. média", valor: (l) => dur(l.enfermagem.media) },
  { chave: "lim-qtd", titulo: "Limp. qtd", valor: (l) => l.limpeza.quantidade },
  { chave: "lim-total", titulo: "Limp. tempo total", valor: (l) => dur(l.limpeza.total) },
  { chave: "lim-media", titulo: "Limp. média", valor: (l) => dur(l.limpeza.media) },
  { chave: "total", titulo: "Total por sala", valor: (l) => dur(totalSala(l)) },
  { chave: "par-qtd", titulo: "Paradas qtd", valor: (l) => l.paradas.quantidade },
  { chave: "par-total", titulo: "Paradas tempo", valor: (l) => dur(l.paradas.total) },
  { chave: "situacao", titulo: "Situação agora", valor: (l) => l.situacao },
];

const BL = "border-l border-border/70";

function Celulas({ b, comMedia = true }: { b: BlocoTempo; comMedia?: boolean }) {
  const vazio = b.quantidade === 0;
  const cls = `px-3 py-2 text-right tabular-nums ${vazio ? "text-muted-foreground" : ""}`;
  return (
    <>
      <td className={`${cls} ${BL}`}>{b.quantidade}</td>
      <td className={cls}>{vazio ? "—" : dur(b.total)}</td>
      {comMedia ? <td className={cls}>{dur(b.media)}</td> : null}
    </>
  );
}

function SeloSituacao({ s }: { s: SalaNoPeriodo }) {
  if (s.paradaDesde)
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
        <AlertTriangle aria-hidden className="size-3" /> {situacaoAgora(s)}
      </span>
    );
  if (s.emAndamento)
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium">
        <i aria-hidden className="size-2 rounded-full bg-amber-500" /> {situacaoAgora(s)}
      </span>
    );
  return <span className="text-xs text-muted-foreground">{situacaoAgora(s)}</span>;
}

/** Busca TODOS os eventos do filtro (não só a página da tela) para a aba "Eventos" da planilha. */
async function buscarTodosEventos(filtro: FiltroHospital): Promise<LinhaGiro[]> {
  const porPagina = 200;
  const todos: LinhaGiro[] = [];
  for (let pagina = 1; pagina <= 100; pagina++) {
    const r = await giroDoHospital({
      data: { salaId: filtro.sala, de: filtro.de, ate: filtro.ate, pagina, porPagina },
    });
    todos.push(...r.linhas);
    if (todos.length >= r.total || r.linhas.length === 0) break;
  }
  return todos;
}

/** "01 a 31 de outubro de 2026" (ou "28/09/2026 a 05/10/2026" se cruzar meses). */
function periodoPorExtenso(f: FiltroHospital) {
  const de = dataDe(f.de);
  const ate = dataDe(f.ate);
  if (de.getMonth() === ate.getMonth() && de.getFullYear() === ate.getFullYear()) {
    const mes = ate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return `${String(de.getDate()).padStart(2, "0")} a ${String(ate.getDate()).padStart(2, "0")} de ${mes}`;
  }
  return intervaloDatas(f);
}

export function ResumoPorSala({
  filtro,
  acaoSala,
}: {
  filtro: FiltroHospital;
  /** Ação de cada linha (ex.: link "Ver eventos"). */
  acaoSala?: (sala: SalaNoPeriodo) => ReactNode;
}) {
  const q = useGiroPorSala(filtro);
  const sessao = useSessao();
  const [exportando, setExportando] = useState(false);
  const periodo = rotuloPeriodo(filtro);
  const titulo = `Tempo total por sala · ${periodo}`;
  const salas = q.data?.salas ?? [];
  const total = q.data?.total;
  const semMovimento =
    !!total &&
    total.enfermagem.quantidade + total.limpeza.quantidade + total.paradas.quantidade === 0;
  const nomeArquivo = `klinsync-giro-de-sala-${filtro.de}-a-${filtro.ate}`;
  const colunasAcao = acaoSala ? 1 : 0;

  async function exportarExcel() {
    if (!q.data) return;
    setExportando(true);
    try {
      const [{ baixarResumoGiro }, eventos, listaSalas] = await Promise.all([
        import("@/lib/exportar-resumo-giro"),
        buscarTodosEventos(filtro),
        filtro.sala === "todas" ? Promise.resolve([]) : salasDoHospital(),
      ]);
      const salaTexto =
        filtro.sala === "todas"
          ? "Todas as salas"
          : (listaSalas.find((s) => s.id === filtro.sala)?.nome ?? "Sala selecionada");
      await baixarResumoGiro(nomeArquivo, {
        hospital: sessao.data?.tenant?.nome ?? "Hospital",
        periodoTexto: periodoPorExtenso(filtro),
        periodo: { de: filtro.de, ate: filtro.ate },
        salaTexto,
        resumo: q.data,
        eventos,
      });
    } catch {
      toast.error("Não foi possível gerar a planilha. Tente de novo em instantes.");
    } finally {
      setExportando(false);
    }
  }

  const linhasPdf: LinhaResumo[] = total
    ? [
        ...salas.map((s) => ({ ...s, situacao: situacaoAgora(s) })),
        { ...total, nome: "TOTAL", situacao: "" },
      ]
    : [];

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{titulo}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Quantidade, tempo total (soma) e média de cada etapa. Entram só os registros{" "}
              <strong>concluídos</strong> que começaram no período.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={salas.length === 0 || exportando}
              onClick={() => void exportarExcel()}
              title="Planilha com as abas Resumo, Por dia, Eventos e Como ler"
            >
              <FileSpreadsheet className="size-4" />
              {exportando ? "Gerando planilha..." : "Exportar Excel"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={salas.length === 0}
              onClick={() => void exportarPdf(nomeArquivo, titulo, COLUNAS_PDF, linhasPdf)}
            >
              <Download className="size-4" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {q.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar o resumo agora. Verifique a conexão; a tela tenta de novo
            sozinha em instantes.
          </p>
        ) : q.isLoading ? (
          <Esqueleto className="h-40" />
        ) : salas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filtro.sala === "todas"
              ? "Nenhuma sala ativa cadastrada. Cadastre as salas em “Salas” no menu para começar a acompanhar o giro."
              : "A sala selecionada não foi encontrada. Escolha outra sala no filtro acima."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[960px] text-sm">
                <caption className="sr-only">
                  {titulo}. Tempos com unidade; a última linha é o total do período.
                </caption>
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th rowSpan={2} scope="col" className="px-3 py-2 text-left font-medium">
                      Sala
                    </th>
                    <GrupoTh cor="var(--giro-enfermagem)" span={3}>
                      Enfermagem
                    </GrupoTh>
                    <GrupoTh cor="var(--giro-limpeza)" span={3}>
                      Limpeza
                    </GrupoTh>
                    <th
                      rowSpan={2}
                      scope="col"
                      className={`${BL} px-3 py-2 text-right font-semibold text-foreground`}
                    >
                      Total por sala
                      <span className="block font-normal text-muted-foreground">
                        enf. + limpeza
                      </span>
                    </th>
                    <GrupoTh cor="var(--giro-parada)" span={2}>
                      Paradas
                    </GrupoTh>
                    <th rowSpan={2} scope="col" className={`${BL} px-3 py-2 text-left font-medium`}>
                      Situação agora
                    </th>
                    {acaoSala ? (
                      <th rowSpan={2} scope="col" className="px-3 py-2">
                        <span className="sr-only">Ações</span>
                      </th>
                    ) : null}
                  </tr>
                  <tr className="uppercase tracking-wide">
                    {[
                      "Qtd",
                      "Tempo total",
                      "Média",
                      "Qtd",
                      "Tempo total",
                      "Média",
                      "Qtd",
                      "Tempo total",
                    ].map((c, i) => (
                      <th
                        key={i}
                        scope="col"
                        className={`px-3 pb-2 pt-1 text-right font-medium ${i === 0 || i === 3 || i === 6 ? BL : ""}`}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salas.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-t border-border/70 ${s.paradaDesde ? "bg-rose-500/5" : ""}`}
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                      >
                        {s.nome}
                        {s.aRevisar > 0 ? (
                          <span
                            className="ml-2 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
                            title="Registros com menos de 30 s, para conferência"
                          >
                            {s.aRevisar} a revisar
                          </span>
                        ) : null}
                      </th>
                      <Celulas b={s.enfermagem} />
                      <Celulas b={s.limpeza} />
                      <td className={`${BL} px-3 py-2 text-right font-semibold tabular-nums`}>
                        {totalSala(s) === 0 ? "—" : dur(totalSala(s))}
                      </td>
                      <Celulas b={s.paradas} comMedia={false} />
                      <td className={`whitespace-nowrap ${BL} px-3 py-2`}>
                        <SeloSituacao s={s} />
                      </td>
                      {acaoSala ? (
                        <td className="whitespace-nowrap px-3 py-2 text-right">{acaoSala(s)}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                {total ? (
                  <tfoot>
                    <tr className="border-t-2 border-foreground/40 bg-muted font-semibold">
                      <th scope="row" className="px-3 py-3 text-left">
                        TOTAL {salas.length > 1 ? `(${salas.length} salas)` : ""}
                      </th>
                      <Celulas b={total.enfermagem} />
                      <Celulas b={total.limpeza} />
                      <td className={`${BL} px-3 py-3 text-right tabular-nums`}>
                        {dur(totalSala(total))}
                      </td>
                      <Celulas b={total.paradas} comMedia={false} />
                      <td className={`${BL} px-3 py-3`} colSpan={1 + colunasAcao} />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            {semMovimento ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum registro concluído em {periodo}. Quando as salas concluírem enfermagem,
                limpeza ou uma parada, os números aparecem aqui. Use as setas do filtro para ver
                outro mês.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GrupoTh({ cor, span, children }: { cor: string; span: number; children: ReactNode }) {
  return (
    <th
      colSpan={span}
      scope="colgroup"
      className={`${BL} px-3 pt-2 text-center font-semibold text-foreground`}
    >
      <span className="inline-flex items-center gap-1.5">
        <i aria-hidden className="size-2 rounded-full" style={{ background: cor }} />
        {children}
      </span>
    </th>
  );
}

/* ------------------------------------------------------------------ */
/* Enfermagem x limpeza por dia (duração média de cada etapa)           */
/* ------------------------------------------------------------------ */

type PontoDia = {
  dia: string;
  rotulo: string;
  enfermagem: number | null;
  limpeza: number | null;
  qtdEnfermagem: number;
  qtdLimpeza: number;
  mediaEnf: number | null;
  mediaLimp: number | null;
};

const minutos = (seg: number | null) => (seg == null ? null : Math.round((seg / 60) * 10) / 10);

function DicaDia({ active, payload }: { active?: boolean; payload?: { payload: PontoDia }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  const dif = p.mediaEnf != null && p.mediaLimp != null ? Math.abs(p.mediaEnf - p.mediaLimp) : null;
  const quem =
    dif == null || dif === 0 ? null : p.mediaEnf! > p.mediaLimp! ? "enfermagem" : "limpeza";
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{p.rotulo}</p>
      <p className="flex items-center gap-1.5">
        <i aria-hidden className="size-2 rounded-full bg-[var(--giro-enfermagem)]" />
        Enfermagem: <strong>{dur(p.mediaEnf)}</strong> em média · {p.qtdEnfermagem} giro(s)
      </p>
      <p className="flex items-center gap-1.5">
        <i aria-hidden className="size-2 rounded-full bg-[var(--giro-limpeza)]" />
        Limpeza: <strong>{dur(p.mediaLimp)}</strong> em média · {p.qtdLimpeza} limpeza(s)
      </p>
      {quem ? (
        <p className="mt-1 text-muted-foreground">
          Diferença: a {quem} levou {dur(dif)} a mais
        </p>
      ) : null}
    </div>
  );
}

export function EnfermagemXLimpezaPorDia({ filtro }: { filtro: FiltroHospital }) {
  const q = useGiroPorSala(filtro);
  if (q.isError) return null;
  if (!q.data) return <Esqueleto className="h-[260px]" />;

  const mapa = new Map(q.data.porDia.map((d) => [d.dia, d]));
  const hoje = new Date();
  const dias: PontoDia[] = [];
  for (let d = dataDe(filtro.de); d <= dataDe(filtro.ate) && d <= hoje;) {
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const v = mapa.get(chave);
    dias.push({
      dia: chave,
      rotulo: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      enfermagem: minutos(v?.mediaEnfermagem ?? null),
      limpeza: minutos(v?.mediaLimpeza ?? null),
      qtdEnfermagem: v?.enfermagemConcluidos ?? 0,
      qtdLimpeza: v?.limpezaConcluidos ?? 0,
      mediaEnf: v?.mediaEnfermagem ?? null,
      mediaLimp: v?.mediaLimpeza ?? null,
    });
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }
  const comDados = dias.filter((d) => d.qtdEnfermagem + d.qtdLimpeza > 0);
  const T = q.data.total;
  const p = rotuloPeriodo(filtro);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Enfermagem x limpeza por dia · {p}</CardTitle>
        {comDados.length > 0 ? (
          <p className="text-sm text-foreground">
            Neste período, a enfermagem levou em média <strong>{dur(T.enfermagem.media)}</strong>{" "}
            por giro e a limpeza <strong>{dur(T.limpeza.media)}</strong>.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {comDados.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma enfermagem ou limpeza concluída em {p}.
          </p>
        ) : (
          <>
            <ChartContainer
              config={CONFIG_ETAPAS}
              className="h-[240px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
              role="img"
              aria-label={`Linhas com a duração média por dia de enfermagem e de limpeza, em minutos. Média do período: enfermagem ${dur(T.enfermagem.media)}, limpeza ${dur(T.limpeza.media)}. Os valores de cada dia estão na tabela abaixo.`}
            >
              <LineChart data={dias} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="2 6"
                  stroke="var(--border)"
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="rotulo"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  minTickGap={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  fontSize={11}
                  tickFormatter={(v: number) => `${v} min`}
                />
                <ChartTooltip content={<DicaDia />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="enfermagem"
                  type="monotone"
                  stroke="var(--color-enfermagem)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  dataKey="limpeza"
                  type="monotone"
                  stroke="var(--color-limpeza)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
            <details className="rounded-xl border px-4 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-medium">Ver tabela por data</summary>
              <div className="mt-2 max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                    <tr>
                      <th rowSpan={2} className="py-1 text-left font-medium">
                        Data
                      </th>
                      <th colSpan={2} className="py-1 text-center font-medium">
                        Enfermagem
                      </th>
                      <th colSpan={2} className="py-1 text-center font-medium">
                        Limpeza
                      </th>
                    </tr>
                    <tr>
                      <th className="py-1 text-right font-medium">Qtd</th>
                      <th className="py-1 text-right font-medium">Média</th>
                      <th className="py-1 text-right font-medium">Qtd</th>
                      <th className="py-1 text-right font-medium">Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dias.map((d) => (
                      <tr key={d.dia} className="border-t border-border/60">
                        <td className="py-1">{d.rotulo}</td>
                        <td className="py-1 text-right tabular-nums">{d.qtdEnfermagem}</td>
                        <td className="py-1 text-right tabular-nums">{dur(d.mediaEnf)}</td>
                        <td className="py-1 text-right tabular-nums">{d.qtdLimpeza}</td>
                        <td className="py-1 text-right tabular-nums">{dur(d.mediaLimp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Nota metodológica                                                    */
/* ------------------------------------------------------------------ */

export function NotaMetodologica() {
  return (
    <aside
      aria-label="Como ler estes números"
      className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-xs text-muted-foreground"
    >
      <p className="flex items-center gap-1.5 font-semibold text-foreground">
        <Info aria-hidden className="size-3.5" /> Como ler estes números
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        <li>
          Atividades em andamento ainda não têm duração final: aparecem em “Em andamento”, mas não
          somam nos tempos nem nas médias.
        </li>
        <li>
          Enfermagem é o tempo líquido (desmontagem + montagem, sem a limpeza). Total por sala =
          enfermagem + limpeza.
        </li>
        <li>
          Durações abaixo de 30 s são sinalizadas só para conferência (podem ser falha de
          apontamento); não são erro e continuam nos totais.
        </li>
        <li>
          O tempo total é o acumulado por etapa no período, não o tempo de giro entre duas
          cirurgias.
        </li>
      </ul>
    </aside>
  );
}
