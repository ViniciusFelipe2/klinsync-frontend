import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { HospitalShell } from "@/components/medsync/hospital-shell";
import { TabelaDados, type Coluna } from "@/components/medsync/tabela-dados";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  estatisticasParadaHospital,
  giroDoHospital,
  paradasDoHospital,
  salasDoHospital,
} from "@/lib/api/hospital";
import { ETAPA_LABEL, formatDuracao } from "@/lib/giro";

export const Route = createFileRoute("/_authenticated/hospital/giro-sala")({
  head: () => ({
    meta: [
      { title: "Relatório de Giro de Sala | KlinSync" },
      {
        name: "description",
        content: "Histórico de desmontagem, limpeza e remontagem das salas cirúrgicas do hospital.",
      },
      { property: "og:title", content: "Relatório de Giro de Sala | KlinSync" },
      {
        property: "og:description",
        content: "Histórico de desmontagem, limpeza e remontagem das salas cirúrgicas do hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatorioGiro,
});

type Linha = {
  id: string;
  sala: string;
  tipo_evento: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
  cirurgia_anterior: string | null;
  cirurgia_proxima: string | null;
};

const COLUNAS: Coluna<Linha>[] = [
  { chave: "sala", titulo: "Sala", valor: (l) => l.sala },
  {
    chave: "etapa",
    titulo: "Etapa",
    valor: (l) => ETAPA_LABEL[l.tipo_evento as keyof typeof ETAPA_LABEL] ?? l.tipo_evento,
  },
  { chave: "inicio", titulo: "Início", valor: (l) => new Date(l.inicio).toLocaleString("pt-BR") },
  {
    chave: "fim",
    titulo: "Fim",
    valor: (l) => (l.fim ? new Date(l.fim).toLocaleString("pt-BR") : "em andamento"),
  },
  {
    chave: "duracao",
    titulo: "Duração",
    valor: (l) => (l.duracao_segundos == null ? "—" : formatDuracao(l.duracao_segundos)),
  },
  { chave: "anterior", titulo: "Cirurgia anterior", valor: (l) => l.cirurgia_anterior ?? "—" },
  { chave: "proxima", titulo: "Próxima cirurgia", valor: (l) => l.cirurgia_proxima ?? "—" },
];

const POR_PAGINA = 20;

function RelatorioGiro() {
  const fetcher = giroDoHospital;
  const fetchSalas = salasDoHospital;
  const [salaId, setSalaId] = useState("todas");
  const [etapa, setEtapa] = useState<"todas" | "desmontagem" | "limpeza" | "remontagem">("todas");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);

  const salas = useQuery({ queryKey: ["hospital-salas"], queryFn: () => fetchSalas() });
  const q = useQuery({
    queryKey: ["hospital-giro", salaId, etapa, de, ate, pagina],
    queryFn: () =>
      fetcher({
        data: {
          salaId,
          etapa,
          de: de || undefined,
          ate: ate || undefined,
          pagina,
          porPagina: POR_PAGINA,
        },
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <HospitalShell
      titulo="Giro de sala"
      subtitulo="Relatório completo do módulo, incluindo salas paradas"
    >
      <Tabs defaultValue="eventos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="eventos">Eventos de giro</TabsTrigger>
          <TabsTrigger value="paradas">Salas paradas</TabsTrigger>
        </TabsList>
        <TabsContent value="eventos">
          <TabelaDados
            titulo="Eventos de giro"
            nomeArquivo="medsync-giro-de-sala"
            colunas={COLUNAS}
            linhas={(q.data?.linhas ?? []) as Linha[]}
            total={q.data?.total ?? 0}
            pagina={pagina}
            porPagina={POR_PAGINA}
            onPagina={setPagina}
            carregando={q.isLoading}
            filtros={
              <>
                <div className="space-y-1.5">
                  <Label>Sala</Label>
                  <Select
                    value={salaId}
                    onValueChange={(v) => {
                      setSalaId(v);
                      setPagina(1);
                    }}
                  >
                    <SelectTrigger className="w-48">
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
                      <SelectItem value="todas">Todas as etapas</SelectItem>
                      <SelectItem value="desmontagem">Enfermagem</SelectItem>
                      <SelectItem value="limpeza">Limpeza</SelectItem>
                      <SelectItem value="remontagem">Remontagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gde">De</Label>
                  <Input
                    id="gde"
                    type="date"
                    value={de}
                    onChange={(e) => {
                      setDe(e.target.value);
                      setPagina(1);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gate">Até</Label>
                  <Input
                    id="gate"
                    type="date"
                    value={ate}
                    onChange={(e) => {
                      setAte(e.target.value);
                      setPagina(1);
                    }}
                  />
                </div>
              </>
            }
          />
        </TabsContent>
        <TabsContent value="paradas">
          <AbaParadas salas={salas.data ?? []} />
        </TabsContent>
      </Tabs>
    </HospitalShell>
  );
}

type LinhaParada = {
  id: string;
  sala: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
};

const COLUNAS_PARADA: Coluna<LinhaParada>[] = [
  { chave: "sala", titulo: "Sala", valor: (l) => l.sala },
  { chave: "dia", titulo: "Dia", valor: (l) => new Date(l.inicio).toLocaleDateString("pt-BR") },
  {
    chave: "inicio",
    titulo: "Início",
    valor: (l) => new Date(l.inicio).toLocaleTimeString("pt-BR"),
  },
  {
    chave: "fim",
    titulo: "Fim",
    valor: (l) => (l.fim ? new Date(l.fim).toLocaleTimeString("pt-BR") : "em andamento"),
  },
  {
    chave: "duracao",
    titulo: "Tempo parada",
    valor: (l) => (l.duracao_segundos == null ? "—" : formatDuracao(l.duracao_segundos)),
  },
];

function AbaParadas({ salas }: { salas: { id: string; nome: string }[] }) {
  const fetchParadas = paradasDoHospital;
  const fetchStats = estatisticasParadaHospital;
  const [salaId, setSalaId] = useState("todas");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);

  const lista = useQuery({
    queryKey: ["hospital-paradas", salaId, de, ate, pagina],
    queryFn: () =>
      fetchParadas({
        data: { salaId, de: de || undefined, ate: ate || undefined, pagina, porPagina: POR_PAGINA },
      }),
    placeholderData: keepPreviousData,
  });

  const stats = useQuery({
    queryKey: ["hospital-paradas-stats", salaId, de, ate],
    queryFn: () => fetchStats({ data: { salaId, de: de || undefined, ate: ate || undefined } }),
  });

  const dur = (s: number | null | undefined) => (s == null ? "—" : formatDuracao(s));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Média de sala parada por período</CardTitle>
          <p className="text-xs text-muted-foreground">
            Total considera o período filtrado; as médias usam as janelas fixas de 7, 15, 30 e 45
            dias.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(stats.data?.salas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma parada registrada nos últimos 45 dias.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Sala</th>
                  <th className="py-2 pr-4">Paradas no período</th>
                  <th className="py-2 pr-4">Total parada</th>
                  {(stats.data?.janelas ?? []).map((j) => (
                    <th key={j} className="py-2 pr-4">
                      Média {j}d
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats.data?.salas ?? []).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{s.sala}</td>
                    <td className="py-2 pr-4">{s.ocorrencias}</td>
                    <td className="py-2 pr-4">{dur(s.total)}</td>
                    {(stats.data?.janelas ?? []).map((j) => (
                      <td key={j} className="py-2 pr-4">
                        {dur(s.medias[j] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <TabelaDados
        titulo="Registros de sala parada"
        nomeArquivo="medsync-salas-paradas"
        colunas={COLUNAS_PARADA}
        linhas={(lista.data?.linhas ?? []) as LinhaParada[]}
        total={lista.data?.total ?? 0}
        pagina={pagina}
        porPagina={POR_PAGINA}
        onPagina={setPagina}
        carregando={lista.isLoading}
        filtros={
          <>
            <div className="space-y-1.5">
              <Label>Sala</Label>
              <Select
                value={salaId}
                onValueChange={(v) => {
                  setSalaId(v);
                  setPagina(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as salas</SelectItem>
                  {salas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pde">De</Label>
              <Input
                id="pde"
                type="date"
                value={de}
                onChange={(e) => {
                  setDe(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pate">Até</Label>
              <Input
                id="pate"
                type="date"
                value={ate}
                onChange={(e) => {
                  setAte(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </>
        }
      />
    </div>
  );
}
