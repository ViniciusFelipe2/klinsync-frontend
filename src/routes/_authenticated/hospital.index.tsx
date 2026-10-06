import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { HospitalShell } from "@/components/medsync/hospital-shell";
import { TabelaDados, type Coluna } from "@/components/medsync/tabela-dados";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { acessosDoHospital, estatisticasGiroHospital, resumoHospital } from "@/lib/api/hospital";
import { formatDuracao } from "@/lib/giro";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

const CHART_CONFIG = {
  minutos: { label: "Minutos", color: "var(--giro-enfermagem)" },
  Enfermagem: { label: "Enfermagem", color: "var(--giro-enfermagem)" },
  Limpeza: { label: "Limpeza", color: "var(--giro-limpeza)" },
  "Giro geral": { label: "Giro geral", color: "var(--giro-geral)" },
  "Sala parada": { label: "Sala parada", color: "var(--giro-parada)" },
} satisfies ChartConfig;

const CORES_ETAPA: Record<string, string> = {
  Enfermagem: "var(--giro-enfermagem)",
  Limpeza: "var(--giro-limpeza)",
  "Giro geral": "var(--giro-geral)",
  "Sala parada": "var(--giro-parada)",
};

export const Route = createFileRoute("/_authenticated/hospital/")({
  head: () => ({
    meta: [
      { title: "Dashboard do Hospital | KlinSync" },
      {
        name: "description",
        content:
          "Indicadores consolidados de check-in, giro de sala, equipe e acessos do hospital.",
      },
      { property: "og:title", content: "Dashboard do Hospital | KlinSync" },
      {
        property: "og:description",
        content:
          "Indicadores consolidados de check-in, giro de sala, equipe e acessos do hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardHospital,
});

function Indicador({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{rotulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-foreground">{valor}</p>
        {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
      </CardContent>
    </Card>
  );
}

function DashboardHospital() {
  return (
    <HospitalShell
      titulo="Dashboard"
      subtitulo="Visão consolidada dos módulos contratados pelo seu hospital"
    >
      <ConteudoDashboard />
    </HospitalShell>
  );
}

type LinhaAcesso = {
  id: string;
  email_tentado: string | null;
  sucesso: boolean;
  created_at: string;
};

const COLUNAS_ACESSO: Coluna<LinhaAcesso>[] = [
  { chave: "email", titulo: "Quem acessou", valor: (l) => l.email_tentado ?? "—" },
  { chave: "status", titulo: "Resultado", valor: (l) => (l.sucesso ? "sucesso" : "falha") },
  { chave: "dia", titulo: "Dia", valor: (l) => new Date(l.created_at).toLocaleDateString("pt-BR") },
  {
    chave: "hora",
    titulo: "Hora",
    valor: (l) => new Date(l.created_at).toLocaleTimeString("pt-BR"),
  },
];

const POR_PAGINA_ACESSO = 10;

function ConteudoDashboard() {
  const fetcher = resumoHospital;
  const { data, isLoading } = useQuery({
    queryKey: ["hospital-resumo"],
    queryFn: () => fetcher(),
  });

  const media = (s: number | null) => (s == null ? "—" : formatDuracao(s));

  const hoje = new Date().toISOString().slice(0, 10);
  const trintaDias = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [de, setDe] = useState(trintaDias);
  const [ate, setAte] = useState(hoje);
  const [filtro, setFiltro] = useState({ de: trintaDias, ate: hoje });

  const statsFetcher = estatisticasGiroHospital;
  const { data: stats } = useQuery({
    queryKey: ["hospital-giro-stats", filtro.de, filtro.ate],
    queryFn: () => statsFetcher({ data: filtro }),
  });

  const acessosFetcher = acessosDoHospital;
  const [busca, setBusca] = useState("");
  const [paginaAcesso, setPaginaAcesso] = useState(1);
  const acessosQuery = useQuery({
    queryKey: ["hospital-acessos-dashboard", busca, paginaAcesso],
    queryFn: () =>
      acessosFetcher({
        data: {
          busca: busca || undefined,
          pagina: paginaAcesso,
          porPagina: POR_PAGINA_ACESSO,
        },
      }),
  });

  return (
    <>
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              rotulo="Check-ins hoje"
              valor={String(data.checkins.hoje)}
              nota={`${data.checkins.ultimos30} nos últimos 30 dias`}
            />
            <Indicador
              rotulo="Salas ativas"
              valor={String(data.salas.ativas)}
              nota={`${data.salas.emProcesso} em processo agora${
                data.salas.limite != null ? ` · limite contratado: ${data.salas.limite}` : ""
              }`}
            />
            <Indicador
              rotulo="Eventos de giro (30d)"
              valor={String(data.giro.eventos30)}
              nota="Ciclos completos (enfermagem + limpeza)"
            />
            <Indicador
              rotulo="Equipe ativa"
              valor={String(data.usuarios.ativos)}
              nota={`${data.usuarios.operadores} logins operacionais`}
            />
          </section>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Tempos do giro no período</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Médias por ciclo concluído: enfermagem sem o tempo de limpeza, limpeza e geral.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[7, 15, 30, 45].map((d) => {
                    const inicio = new Date(Date.now() - d * 24 * 3600 * 1000)
                      .toISOString()
                      .slice(0, 10);
                    const ativo = filtro.de === inicio && filtro.ate === hoje;
                    return (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={ativo ? "default" : "outline"}
                        onClick={() => {
                          setDe(inicio);
                          setAte(hoje);
                          setFiltro({ de: inicio, ate: hoje });
                        }}
                      >
                        {d}d
                      </Button>
                    );
                  })}
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="de" className="text-xs">
                    De
                  </Label>
                  <Input
                    id="de"
                    type="date"
                    value={de}
                    max={ate}
                    onChange={(e) => setDe(e.target.value)}
                    className="h-9 w-[150px]"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ate" className="text-xs">
                    Até
                  </Label>
                  <Input
                    id="ate"
                    type="date"
                    value={ate}
                    min={de}
                    onChange={(e) => setAte(e.target.value)}
                    className="h-9 w-[150px]"
                  />
                </div>
                <Button size="sm" onClick={() => setFiltro({ de, ate })}>
                  Aplicar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Indicador rotulo="Ciclos no período" valor={String(stats?.ciclos ?? 0)} />
                <Indicador
                  rotulo="Enfermagem (líquida)"
                  valor={media(stats?.mediaEnfermagem ?? null)}
                  nota="Sem o tempo de limpeza"
                />
                <Indicador rotulo="Limpeza" valor={media(stats?.mediaLimpeza ?? null)} />
                <Indicador
                  rotulo="Giro geral"
                  valor={media(stats?.mediaGeral ?? null)}
                  nota="Enfermagem + limpeza"
                />
                <Indicador
                  rotulo="Sala parada"
                  valor={media(stats?.mediaParada ?? null)}
                  nota={`Média por parada · ${stats?.paradas ?? 0} no período`}
                />
              </div>

              <ChartContainer
                config={CHART_CONFIG}
                className="h-[220px] w-full sm:h-[260px] [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
              >
                <BarChart
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="35%"
                  data={[
                    {
                      etapa: "Enfermagem",
                      minutos: Number(((stats?.mediaEnfermagem ?? 0) / 60).toFixed(1)),
                    },
                    {
                      etapa: "Limpeza",
                      minutos: Number(((stats?.mediaLimpeza ?? 0) / 60).toFixed(1)),
                    },
                    {
                      etapa: "Giro geral",
                      minutos: Number(((stats?.mediaGeral ?? 0) / 60).toFixed(1)),
                    },
                    {
                      etapa: "Sala parada",
                      minutos: Number(((stats?.mediaParada ?? 0) / 60).toFixed(1)),
                    },
                  ]}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="2 6"
                    stroke="var(--border)"
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="etapa"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    interval={0}
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    fontSize={11}
                    tickCount={4}
                    tickMargin={6}
                    tickFormatter={(v: number) => `${Number(v).toFixed(1)} min`}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${value as number} min`}
                        hideIndicator
                      />
                    }
                  />
                  <Bar dataKey="minutos" radius={[8, 8, 4, 4]} maxBarSize={72}>
                    {["Enfermagem", "Limpeza", "Giro geral", "Sala parada"].map((etapa) => (
                      <Cell key={etapa} fill={CORES_ETAPA[etapa]} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <section className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Módulos contratados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.features.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum módulo habilitado. Fale com a equipe Trizion Tech.
                  </p>
                ) : (
                  data.features.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                    >
                      <div>
                        <p className="font-medium text-foreground">{f.nome_exibicao}</p>
                        <p className="text-xs text-muted-foreground">{f.descricao}</p>
                      </div>
                      <Badge variant={f.habilitada ? "default" : "destructive"}>
                        {f.habilitada ? "Ativo" : "Suspenso"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <div className="space-y-3">
            <TabelaDados
              titulo="Últimos acessos"
              nomeArquivo="medsync-ultimos-acessos"
              colunas={COLUNAS_ACESSO}
              linhas={(acessosQuery.data?.linhas ?? []) as LinhaAcesso[]}
              total={acessosQuery.data?.total ?? 0}
              pagina={paginaAcesso}
              porPagina={POR_PAGINA_ACESSO}
              onPagina={setPaginaAcesso}
              carregando={acessosQuery.isLoading}
              filtros={
                <div className="space-y-1.5">
                  <Label htmlFor="busca-acesso" className="text-xs">
                    Buscar por e-mail
                  </Label>
                  <Input
                    id="busca-acesso"
                    value={busca}
                    placeholder="ex.: enfermagem@hospital.com"
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setPaginaAcesso(1);
                    }}
                    className="h-9 w-[260px]"
                  />
                </div>
              }
            />
            <Link to="/hospital/acessos" className="inline-block text-sm text-primary underline">
              Ver registro completo
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
