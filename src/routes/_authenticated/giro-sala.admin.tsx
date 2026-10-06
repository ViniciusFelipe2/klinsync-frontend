import { useMemo, useState } from "react";
import { getNomesEquipe } from "@/lib/api/modulos";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { historicoGiro } from "@/lib/api/giro";
import { Cronometro } from "@/components/giro/Cronometro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModulo } from "@/hooks/use-modulo";
import { useEventosAbertos, useParadasAbertas, useRealtimeGiro, useSalas } from "@/hooks/use-giro";
import { reservaAtiva, useLiberarSala, useReservas } from "@/hooks/use-sala-dispositivos";
import {
  ETAPA_LABEL,
  formatDataHora,
  formatDuracao,
  mediaSegundos,
  statusLabel,
  statusTone,
  type EventoGiro,
  type EventoParada,
  type TipoEvento,
} from "@/lib/giro";

export const Route = createFileRoute("/_authenticated/giro-sala/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo | Giro de Sala" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real todas as salas cirúrgicas e os indicadores de tempo de giro por período.",
      },
      { property: "og:title", content: "Painel Administrativo | Giro de Sala" },
      {
        property: "og:description",
        content: "Torre de controle do centro cirúrgico com indicadores e histórico de eventos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

const toneClasses = {
  livre: "bg-livre text-livre-foreground",
  processo: "bg-processo text-processo-foreground",
  parada: "bg-parada text-parada-foreground",
} as const;

const TURNOS = {
  todos: "Todos os turnos",
  manha: "Manhã (06h–12h)",
  tarde: "Tarde (12h–18h)",
  noite: "Noite (18h–06h)",
} as const;
type Turno = keyof typeof TURNOS;

function noTurno(iso: string, turno: Turno) {
  if (turno === "todos") return true;
  const h = new Date(iso).getHours();
  if (turno === "manha") return h >= 6 && h < 12;
  if (turno === "tarde") return h >= 12 && h < 18;
  return h >= 18 || h < 6;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function Admin() {
  const { data: modulo } = useModulo("giro_de_sala");
  const qc = useQueryClient();
  useRealtimeGiro();
  const salas = useSalas();
  const abertos = useEventosAbertos();
  const paradasAbertas = useParadasAbertas();
  const reservas = useReservas();
  const liberarReserva = useLiberarSala();
  const fetchNomes = getNomesEquipe;

  const [de, setDe] = useState(hojeISO());
  const [ate, setAte] = useState(hojeISO());
  const [salaFiltro, setSalaFiltro] = useState("todas");
  const [turno, setTurno] = useState<Turno>("todos");
  const [pagIndic, setPagIndic] = useState(1);
  const [pagCir, setPagCir] = useState(1);
  const [pagHist, setPagHist] = useState(1);
  const porPaginaIndic = 10;
  const porPaginaCir = 10;
  const porPaginaHist = 25;

  const inicioISO = new Date(`${de}T00:00:00`).toISOString();
  const fimISO = new Date(`${ate}T23:59:59`).toISOString();

  const historico = useQuery({
    queryKey: ["historico", de, ate],
    queryFn: async () => {
      const [dados, perfis] = await Promise.all([historicoGiro(inicioISO, fimISO), fetchNomes()]);
      return {
        giro: dados.giro as EventoGiro[],
        paradas: dados.paradas as EventoParada[],
        perfis: new Map(perfis.map((p) => [p.id, p.nome])),
      };
    },
  });

  const nomeSala = useMemo(
    () => new Map((salas.data ?? []).map((s) => [s.id, s.nome])),
    [salas.data],
  );

  const giroFiltrado = useMemo(
    () =>
      (historico.data?.giro ?? []).filter(
        (e) => (salaFiltro === "todas" || e.sala_id === salaFiltro) && noTurno(e.inicio, turno),
      ),
    [historico.data, salaFiltro, turno],
  );

  const paradasFiltradas = useMemo(
    () =>
      (historico.data?.paradas ?? []).filter(
        (e) => (salaFiltro === "todas" || e.sala_id === salaFiltro) && noTurno(e.inicio, turno),
      ),
    [historico.data, salaFiltro, turno],
  );

  const indicadores = useMemo(() => {
    const porSala = (salas.data ?? []).map((sala) => {
      const eventos = giroFiltrado.filter(
        (e) => e.sala_id === sala.id && e.duracao_segundos != null,
      );
      const media = (tipo: TipoEvento) =>
        mediaSegundos(
          eventos.filter((e) => e.tipo_evento === tipo).map((e) => e.duracao_segundos as number),
        );
      const paradas = paradasFiltradas.filter((p) => p.sala_id === sala.id);
      const d = media("desmontagem");
      const l = media("limpeza");
      return {
        id: sala.id,
        nome: sala.nome,
        desmontagem: d,
        limpeza: l,
        total: d != null ? d : null,
        paradasQtd: paradas.length,
        paradasTempo: paradas.reduce((acc, p) => acc + (p.duracao_segundos ?? 0), 0),
      };
    });
    return porSala;
  }, [salas.data, giroFiltrado, paradasFiltradas]);

  // Média de tempo por par de cirurgias (anterior → próxima)
  const porCirurgia = useMemo(() => {
    const todosGiro = historico.data?.giro ?? [];
    const cicloDaLimpeza = (e: EventoGiro) =>
      todosGiro
        .filter(
          (g) =>
            g.tipo_evento === "desmontagem" &&
            g.sala_id === e.sala_id &&
            g.inicio <= e.inicio &&
            (g.fim == null || g.fim >= e.inicio),
        )
        .sort((a, b) => b.inicio.localeCompare(a.inicio))[0] ?? null;

    const mapa = new Map<string, { par: string; enf: number[]; lim: number[]; ciclos: number }>();
    const chave = (a: string | null, p: string | null) =>
      `${a?.trim() || "—"} → ${p?.trim() || "—"}`;
    const bucket = (par: string) => {
      let b = mapa.get(par);
      if (!b) {
        b = { par, enf: [], lim: [], ciclos: 0 };
        mapa.set(par, b);
      }
      return b;
    };

    for (const e of giroFiltrado) {
      if (e.tipo_evento === "desmontagem") {
        const b = bucket(chave(e.cirurgia_anterior, e.cirurgia_proxima));
        b.ciclos += 1;
        if (e.duracao_segundos != null) b.enf.push(e.duracao_segundos);
      } else if (e.tipo_evento === "limpeza" && e.duracao_segundos != null) {
        const ciclo = cicloDaLimpeza(e);
        if (!ciclo) continue;
        bucket(chave(ciclo.cirurgia_anterior, ciclo.cirurgia_proxima)).lim.push(e.duracao_segundos);
      }
    }

    return [...mapa.values()]
      .map((b) => ({
        par: b.par,
        ciclos: b.ciclos,
        enfermagem: mediaSegundos(b.enf),
        limpeza: mediaSegundos(b.lim),
      }))
      .sort((a, b) => b.ciclos - a.ciclos || a.par.localeCompare(b.par));
  }, [giroFiltrado, historico.data]);

  const linhaDoTempo = useMemo(() => {
    const perfis = historico.data?.perfis ?? new Map<string, string>();
    const todosGiro = historico.data?.giro ?? [];
    const cirurgiaDe = (e: EventoGiro) => {
      if (e.tipo_evento === "desmontagem") {
        return `${e.cirurgia_anterior ?? "—"} → ${e.cirurgia_proxima ?? "—"}`;
      }
      // Limpeza: herda a cirurgia do ciclo de enfermagem que a envolve
      const ciclo = todosGiro
        .filter(
          (g) =>
            g.tipo_evento === "desmontagem" &&
            g.sala_id === e.sala_id &&
            g.inicio <= e.inicio &&
            (g.fim == null || g.fim >= e.inicio),
        )
        .sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
      if (!ciclo) return "—";
      return `${ciclo.cirurgia_anterior ?? "—"} → ${ciclo.cirurgia_proxima ?? "—"}`;
    };
    const itens = [
      ...giroFiltrado.map((e) => ({
        id: e.id,
        sala: nomeSala.get(e.sala_id) ?? "—",
        tipo: ETAPA_LABEL[e.tipo_evento],
        cirurgia: cirurgiaDe(e),
        inicio: e.inicio,
        fim: e.fim,
        duracao: e.duracao_segundos,
        responsavel: perfis.get(e.usuario_inicio_id) ?? "—",
      })),

      ...paradasFiltradas.map((e) => ({
        id: e.id,
        sala: nomeSala.get(e.sala_id) ?? "—",
        tipo: "Sala parada",
        cirurgia: "—",
        inicio: e.inicio,
        fim: e.fim,
        duracao: e.duracao_segundos,
        responsavel: perfis.get(e.usuario_inicio_id) ?? "—",
      })),
    ];
    return itens.sort((a, b) => b.inicio.localeCompare(a.inicio));
  }, [giroFiltrado, paradasFiltradas, historico.data, nomeSala]);

  const baixar = (linhas: (string | number)[][], aba: string, arquivo: string) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), aba);
    XLSX.writeFile(wb, `${arquivo}-${de}-a-${ate}.xlsx`);
  };

  const exportarIndicadores = () =>
    baixar(
      [
        [
          "Sala",
          "Média enfermagem",
          "Média limpeza",
          "Giro total médio",
          "Paradas",
          "Tempo parada",
        ],
        ...indicadores.map((i) => [
          i.nome,
          i.desmontagem != null ? formatDuracao(i.desmontagem) : "—",
          i.limpeza != null ? formatDuracao(i.limpeza) : "—",
          i.total != null ? formatDuracao(i.total) : "—",
          i.paradasQtd,
          formatDuracao(i.paradasTempo),
        ]),
      ],
      "Indicadores",
      "indicadores-por-sala",
    );

  const exportarHistorico = () =>
    baixar(
      [
        [
          "Sala",
          "Evento",
          "Cirurgia (anterior → próxima)",
          "Início",
          "Fim",
          "Duração",
          "Responsável",
        ],
        ...linhaDoTempo.map((i) => [
          i.sala,
          i.tipo,
          i.cirurgia,
          formatDataHora(i.inicio),
          i.fim ? formatDataHora(i.fim) : "",
          i.duracao != null ? formatDuracao(i.duracao) : "em andamento",
          i.responsavel,
        ]),
      ],
      "Histórico",
      "historico-de-eventos",
    );

  const exportarCirurgias = () =>
    baixar(
      [
        ["Cirurgia (anterior → próxima)", "Ciclos", "Média enfermagem", "Média limpeza"],
        ...porCirurgia.map((i) => [
          i.par,
          i.ciclos,
          i.enfermagem != null ? formatDuracao(i.enfermagem) : "—",
          i.limpeza != null ? formatDuracao(i.limpeza) : "—",
        ]),
      ],
      "Cirurgias",
      "media-por-cirurgia",
    );

  const totalPagIndic = Math.max(1, Math.ceil(indicadores.length / porPaginaIndic));
  const totalPagCir = Math.max(1, Math.ceil(porCirurgia.length / porPaginaCir));
  const totalPagHist = Math.max(1, Math.ceil(linhaDoTempo.length / porPaginaHist));
  const paginaIndic = Math.min(pagIndic, totalPagIndic);
  const paginaCir = Math.min(pagCir, totalPagCir);
  const paginaHist = Math.min(pagHist, totalPagHist);
  const indicadoresPagina = indicadores.slice(
    (paginaIndic - 1) * porPaginaIndic,
    paginaIndic * porPaginaIndic,
  );
  const cirurgiasPagina = porCirurgia.slice(
    (paginaCir - 1) * porPaginaCir,
    paginaCir * porPaginaCir,
  );
  const historicoPagina = linhaDoTempo.slice(
    (paginaHist - 1) * porPaginaHist,
    paginaHist * porPaginaHist,
  );

  if (modulo && !modulo.podeAdministrar) {
    return (
      <div className="min-h-screen bg-surface">
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">
            Este painel está disponível apenas para administradores.
          </p>
        </main>
      </div>
    );
  }

  const val = (v: number | null) => (v == null ? "—" : formatDuracao(v));

  return (
    <div className="min-h-screen bg-surface">
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <h1 className="mb-6 font-display text-3xl font-bold">
          Torre de Controle — Centro Cirúrgico
        </h1>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(salas.data ?? []).map((sala) => {
            const evento = (abertos.data ?? []).find((e) => e.sala_id === sala.id) ?? null;
            const parada = (paradasAbertas.data ?? []).find((p) => p.sala_id === sala.id) ?? null;
            const tone = statusTone(sala.status_atual, parada !== null);
            return (
              <article key={sala.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold">{sala.nome}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${toneClasses[tone]}`}
                  >
                    {statusLabel(sala.status_atual, parada !== null)}
                  </span>
                </div>
                <p className="mt-4 text-4xl font-bold tabular">
                  {parada ? (
                    <Cronometro inicio={parada.inicio} />
                  ) : evento ? (
                    <Cronometro inicio={evento.inicio} />
                  ) : (
                    "--:--"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {parada
                    ? "Tempo parada"
                    : evento
                      ? `Em ${ETAPA_LABEL[evento.tipo_evento].toLowerCase()}`
                      : "Sem etapa em andamento"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Última atualização: {formatDataHora(sala.updated_at)}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mb-6 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="de">De</Label>
            <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ate">Até</Label>
            <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sala">Sala</Label>
            <select
              id="sala"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={salaFiltro}
              onChange={(e) => setSalaFiltro(e.target.value)}
            >
              <option value="todas">Todas as salas</option>
              {(salas.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="turno">Turno</Label>
            <select
              id="turno"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={turno}
              onChange={(e) => setTurno(e.target.value as Turno)}
            >
              {Object.entries(TURNOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mb-8 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="font-display text-lg font-bold">Indicadores por sala</h2>
            <Button variant="outline" size="sm" onClick={exportarIndicadores}>
              <Download className="size-4" aria-hidden="true" />
              Exportar Excel
            </Button>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="p-3">Sala</th>
                  <th className="p-3">Média enfermagem</th>
                  <th className="p-3">Média limpeza</th>
                  <th className="p-3">Giro total médio</th>
                  <th className="p-3">Paradas</th>
                  <th className="p-3">Tempo parada</th>
                </tr>
              </thead>
              <tbody>
                {indicadoresPagina.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-semibold">{i.nome}</td>
                    <td className="p-3 tabular">{val(i.desmontagem)}</td>
                    <td className="p-3 tabular">{val(i.limpeza)}</td>
                    <td className="p-3 font-bold tabular">{val(i.total)}</td>
                    <td className="p-3 tabular">{i.paradasQtd}</td>
                    <td className="p-3 tabular">{formatDuracao(i.paradasTempo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao
            pagina={paginaIndic}
            total={totalPagIndic}
            itens={indicadores.length}
            onChange={setPagIndic}
          />
        </section>

        <section className="mb-8 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="font-display text-lg font-bold">
              Média por cirurgia (anterior → próxima)
            </h2>
            <Button variant="outline" size="sm" onClick={exportarCirurgias}>
              <Download className="size-4" aria-hidden="true" />
              Exportar Excel
            </Button>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left">
                <tr>
                  <th className="p-3">Cirurgia</th>
                  <th className="p-3">Ciclos</th>
                  <th className="p-3">Média enfermagem</th>
                  <th className="p-3">Média limpeza</th>
                </tr>
              </thead>
              <tbody>
                {cirurgiasPagina.map((i) => (
                  <tr key={i.par} className="border-t">
                    <td className="p-3 font-semibold">{i.par}</td>
                    <td className="p-3 tabular">{i.ciclos}</td>
                    <td className="p-3 font-bold tabular">{val(i.enfermagem)}</td>
                    <td className="p-3 tabular">{val(i.limpeza)}</td>
                  </tr>
                ))}
                {porCirurgia.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                      Nenhuma cirurgia registrada no período selecionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Paginacao
            pagina={paginaCir}
            total={totalPagCir}
            itens={porCirurgia.length}
            onChange={setPagCir}
          />
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="font-display text-lg font-bold">Histórico de eventos</h2>
            <Button variant="outline" size="sm" onClick={exportarHistorico}>
              <Download className="size-4" aria-hidden="true" />
              Exportar Excel
            </Button>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left">
                <tr>
                  <th className="p-3">Sala</th>
                  <th className="p-3">Evento</th>
                  <th className="p-3">Cirurgia</th>
                  <th className="p-3">Início</th>
                  <th className="p-3">Fim</th>
                  <th className="p-3">Duração</th>
                  <th className="p-3">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {historicoPagina.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-semibold">{i.sala}</td>
                    <td className="p-3">{i.tipo}</td>
                    <td className="p-3">{i.cirurgia}</td>
                    <td className="p-3 tabular">{formatDataHora(i.inicio)}</td>
                    <td className="p-3 tabular">{i.fim ? formatDataHora(i.fim) : "—"}</td>
                    <td className="p-3 tabular">
                      {i.duracao != null ? formatDuracao(i.duracao) : "em andamento"}
                    </td>
                    <td className="p-3">{i.responsavel}</td>
                  </tr>
                ))}
                {linhaDoTempo.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                      Nenhum evento no período selecionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Paginacao
            pagina={paginaHist}
            total={totalPagHist}
            itens={linhaDoTempo.length}
            onChange={setPagHist}
          />
        </section>

        <section className="mb-8 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="font-display text-lg font-bold">Tablets conectados</h2>
          </div>
          <div className="max-h-[320px] overflow-auto border-t">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-semibold">Sala</th>
                  <th className="p-3 font-semibold">Último sinal</th>
                  <th className="p-3 font-semibold">Situação</th>
                  <th className="p-3 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(reservas.data ?? []).map((r) => (
                  <tr key={r.sala_id} className="border-t">
                    <td className="p-3">
                      {(salas.data ?? []).find((s) => s.id === r.sala_id)?.nome ?? "—"}
                    </td>
                    <td className="p-3 tabular">{formatDataHora(r.ultimo_sinal)}</td>
                    <td className="p-3">{reservaAtiva(r) ? "Ativo" : "Sem sinal"}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={liberarReserva.isPending}
                        onClick={() =>
                          void liberarReserva.mutateAsync({
                            salaId: r.sala_id,
                            deviceId: r.device_id,
                          })
                        }
                      >
                        Liberar
                      </Button>
                    </td>
                  </tr>
                ))}
                {(reservas.data ?? []).length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                      Nenhum tablet com sala reservada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Paginacao({
  pagina,
  total,
  itens,
  onChange,
}: {
  pagina: number;
  total: number;
  itens: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
      <span className="text-muted-foreground">
        {itens} registro{itens === 1 ? "" : "s"} · página {pagina} de {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= total}
          onClick={() => onChange(pagina + 1)}
        >
          Próxima
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
