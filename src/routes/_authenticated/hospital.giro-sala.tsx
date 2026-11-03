import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { FiltroPeriodoSala } from "@/components/medsync/filtro-periodo-sala";
import { HospitalShell } from "@/components/medsync/hospital-shell";
import {
  EnfermagemXLimpezaPorDia,
  IndicadoresDoPeriodo,
  NotaMetodologica,
  ResumoPorSala,
  SalasParadasAgora,
} from "@/components/medsync/resumo-giro-por-sala";
import { TabelaDados, type Coluna } from "@/components/medsync/tabela-dados";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  giroDoHospital,
  paradasDoHospital,
  salasDoHospital,
  type LinhaGiro,
} from "@/lib/api/hospital";
import { ETAPA_LABEL, formatDuracaoLegivel } from "@/lib/giro";
import {
  filtroComPadrao,
  lerFiltroHospital,
  rotuloPeriodo,
  type FiltroHospital,
} from "@/lib/periodo";

export const Route = createFileRoute("/_authenticated/hospital/giro-sala")({
  head: () => ({
    meta: [
      { title: "Relatório de Giro de Sala | KlinSync" },
      {
        name: "description",
        content: "Histórico de enfermagem, limpeza e paradas das salas cirúrgicas do hospital.",
      },
      { property: "og:title", content: "Relatório de Giro de Sala | KlinSync" },
      {
        property: "og:description",
        content: "Histórico de enfermagem, limpeza e paradas das salas cirúrgicas do hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: lerFiltroHospital,
  component: RelatorioGiro,
});

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const COLUNAS: Coluna<LinhaGiro>[] = [
  { chave: "sala", titulo: "Sala", valor: (l) => l.sala },
  {
    chave: "etapa",
    titulo: "Etapa",
    valor: (l) => ETAPA_LABEL[l.tipo_evento as keyof typeof ETAPA_LABEL] ?? l.tipo_evento,
  },
  { chave: "inicio", titulo: "Início", valor: (l) => dataHora(l.inicio) },
  { chave: "fim", titulo: "Fim", valor: (l) => (l.fim ? hora(l.fim) : "em andamento") },
  {
    chave: "duracao",
    titulo: "Duração",
    valor: (l) => (l.fim ? formatDuracaoLegivel(l.duracao_segundos) : "em andamento"),
  },
  { chave: "por", titulo: "Iniciado por", valor: (l) => l.usuario_inicio ?? "—" },
  { chave: "anterior", titulo: "Cirurgia anterior", valor: (l) => l.cirurgia_anterior ?? "—" },
  { chave: "proxima", titulo: "Próxima cirurgia", valor: (l) => l.cirurgia_proxima ?? "—" },
];

type LinhaParada = {
  id: string;
  sala: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
};

const COLUNAS_PARADA: Coluna<LinhaParada>[] = [
  { chave: "sala", titulo: "Sala", valor: (l) => l.sala },
  { chave: "inicio", titulo: "Início", valor: (l) => dataHora(l.inicio) },
  {
    chave: "fim",
    titulo: "Fim",
    valor: (l) => (l.fim ? dataHora(l.fim) : "parada agora"),
  },
  {
    chave: "duracao",
    titulo: "Tempo parada",
    valor: (l) => (l.fim ? formatDuracaoLegivel(l.duracao_segundos) : "em andamento"),
  },
];

const POR_PAGINA = 20;

function RelatorioGiro() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const filtro = filtroComPadrao(search);
  const mudarFiltro = (f: FiltroHospital) =>
    void navigate({ search: { de: f.de, ate: f.ate, sala: f.sala }, replace: true });

  // Vindo do dashboard com "#eventos": rola até a lista depois que a tela monta.
  useEffect(() => {
    if (window.location.hash === "#eventos") {
      document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Sala da lista de eventos: começa com a do topo e pode ser trocada só para a lista.
  const [salaLista, setSalaLista] = useState(filtro.sala);
  const [salaTopo, setSalaTopo] = useState(filtro.sala);
  if (salaTopo !== filtro.sala) {
    setSalaTopo(filtro.sala);
    setSalaLista(filtro.sala);
  }
  const filtroLista = { ...filtro, sala: salaLista };

  const verEventosDaSala = (salaId: string) => {
    setSalaLista(salaId);
    requestAnimationFrame(() =>
      document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <HospitalShell
      titulo="Giro de sala"
      subtitulo="Enfermagem, limpeza e paradas de cada sala no período escolhido"
    >
      <div className="space-y-8">
        <FiltroPeriodoSala
          key={`${filtro.de}_${filtro.ate}`}
          filtro={filtro}
          onChange={mudarFiltro}
        />

        <SalasParadasAgora filtro={filtro} />

        <IndicadoresDoPeriodo filtro={filtro} />

        <section aria-labelledby="titulo-por-sala" className="space-y-3">
          <h2 id="titulo-por-sala" className="text-lg font-semibold">
            1. Por sala
          </h2>
          <ResumoPorSala
            filtro={filtro}
            acaoSala={(s) => (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => verEventosDaSala(s.id)}
                aria-label={`Ver eventos da ${s.nome}`}
              >
                Ver eventos
              </Button>
            )}
          />
        </section>

        <section aria-labelledby="titulo-por-dia" className="space-y-3">
          <h2 id="titulo-por-dia" className="text-lg font-semibold">
            2. Quem está demorando mais: enfermagem ou limpeza
          </h2>
          <EnfermagemXLimpezaPorDia filtro={filtro} />
        </section>

        <section id="eventos" aria-labelledby="titulo-eventos" className="scroll-mt-28 space-y-3">
          <div>
            <h2 id="titulo-eventos" className="text-lg font-semibold">
              3. Eventos do período
            </h2>
            <p className="text-sm text-muted-foreground">
              Cada linha é um registro feito no tablet da sala, em {rotuloPeriodo(filtro)}.
            </p>
          </div>
          <Tabs defaultValue="eventos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="eventos">Enfermagem e limpeza</TabsTrigger>
              <TabsTrigger value="paradas">Paradas</TabsTrigger>
            </TabsList>
            <TabsContent value="eventos">
              <ListaGiro filtro={filtroLista} onSala={setSalaLista} />
            </TabsContent>
            <TabsContent value="paradas">
              <ListaParadas filtro={filtroLista} onSala={setSalaLista} />
            </TabsContent>
          </Tabs>
        </section>

        <NotaMetodologica />
      </div>
    </HospitalShell>
  );
}

function ListaGiro({ filtro, onSala }: { filtro: FiltroHospital; onSala: (s: string) => void }) {
  const [etapa, setEtapa] = useState<"todas" | "desmontagem" | "limpeza">("todas");
  const [pagina, setPagina] = useState(1);
  // Filtro do topo mudou: volta para a primeira página.
  const chave = `${filtro.de}|${filtro.ate}|${filtro.sala}`;
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    setPagina(1);
  }

  const q = useQuery({
    queryKey: ["hospital-giro", filtro.sala, etapa, filtro.de, filtro.ate, pagina],
    queryFn: () =>
      giroDoHospital({
        data: {
          salaId: filtro.sala,
          etapa,
          de: filtro.de,
          ate: filtro.ate,
          pagina,
          porPagina: POR_PAGINA,
        },
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <TabelaDados
      titulo={`Enfermagem e limpeza · ${rotuloPeriodo(filtro)}`}
      nomeArquivo={`klinsync-giro-de-sala-${filtro.de}-a-${filtro.ate}`}
      colunas={COLUNAS}
      linhas={q.data?.linhas ?? []}
      total={q.data?.total ?? 0}
      pagina={pagina}
      porPagina={POR_PAGINA}
      onPagina={setPagina}
      carregando={q.isLoading}
      filtros={
        <>
          <SeletorSalaLista valor={filtro.sala} onChange={onSala} />
          <div className="space-y-1.5">
            <Label>Etapa</Label>
            <Select
              value={etapa}
              onValueChange={(v) => {
                setEtapa(v as typeof etapa);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Enfermagem e limpeza</SelectItem>
                <SelectItem value="desmontagem">Só enfermagem</SelectItem>
                <SelectItem value="limpeza">Só limpeza</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    />
  );
}

function ListaParadas({ filtro, onSala }: { filtro: FiltroHospital; onSala: (s: string) => void }) {
  const [pagina, setPagina] = useState(1);
  const chave = `${filtro.de}|${filtro.ate}|${filtro.sala}`;
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    setPagina(1);
  }

  const lista = useQuery({
    queryKey: ["hospital-paradas", filtro.sala, filtro.de, filtro.ate, pagina],
    queryFn: () =>
      paradasDoHospital({
        data: {
          salaId: filtro.sala,
          de: filtro.de,
          ate: filtro.ate,
          pagina,
          porPagina: POR_PAGINA,
        },
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <TabelaDados
      titulo={`Paradas · ${rotuloPeriodo(filtro)}`}
      nomeArquivo={`klinsync-salas-paradas-${filtro.de}-a-${filtro.ate}`}
      colunas={COLUNAS_PARADA}
      linhas={(lista.data?.linhas ?? []) as LinhaParada[]}
      total={lista.data?.total ?? 0}
      pagina={pagina}
      porPagina={POR_PAGINA}
      onPagina={setPagina}
      carregando={lista.isLoading}
      filtros={<SeletorSalaLista valor={filtro.sala} onChange={onSala} />}
    />
  );
}

/** Sala só da lista de eventos (não mexe no filtro do topo). */
function SeletorSalaLista({ valor, onChange }: { valor: string; onChange: (s: string) => void }) {
  const salas = useQuery({ queryKey: ["hospital-salas"], queryFn: () => salasDoHospital() });
  return (
    <div className="space-y-1.5">
      <Label>Sala da lista</Label>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger className="w-48" aria-label="Sala da lista de eventos">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as salas</SelectItem>
          {(salas.data ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
