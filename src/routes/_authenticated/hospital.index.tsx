import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { FiltroPeriodoSala } from "@/components/medsync/filtro-periodo-sala";
import { HospitalShell } from "@/components/medsync/hospital-shell";
import {
  IndicadoresDoPeriodo,
  ResumoPorSala,
  SalasParadasAgora,
} from "@/components/medsync/resumo-giro-por-sala";
import { SalasAoVivo } from "@/components/medsync/salas-ao-vivo";
import { TabelaDados, type Coluna } from "@/components/medsync/tabela-dados";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acessosDoHospital, checkinsDoHospital, resumoHospital } from "@/lib/api/hospital";
import {
  filtroComPadrao,
  lerFiltroHospital,
  rotuloPeriodoCurto,
  type FiltroHospital,
} from "@/lib/periodo";

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
  validateSearch: lerFiltroHospital,
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
      subtitulo="Como está o centro cirúrgico agora e no período escolhido"
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const filtro = filtroComPadrao(search);
  const mudarFiltro = (f: FiltroHospital) =>
    void navigate({ search: { de: f.de, ate: f.ate, sala: f.sala }, replace: true });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hospital-resumo"],
    queryFn: () => resumoHospital(),
    refetchInterval: 60_000, // rede de segurança; as mudanças chegam na hora pelo canal em tempo real
  });

  // Só o total interessa aqui: a consulta paginada devolve a contagem do período.
  const checkinsPeriodo = useQuery({
    queryKey: ["hospital-checkins", "total-periodo", filtro.de, filtro.ate],
    queryFn: () =>
      checkinsDoHospital({ data: { de: filtro.de, ate: filtro.ate, pagina: 1, porPagina: 5 } }),
  });

  const [busca, setBusca] = useState("");
  const [paginaAcesso, setPaginaAcesso] = useState(1);
  const acessosQuery = useQuery({
    queryKey: ["hospital-acessos-dashboard", busca, paginaAcesso],
    queryFn: () =>
      acessosDoHospital({
        data: {
          busca: busca || undefined,
          pagina: paginaAcesso,
          porPagina: POR_PAGINA_ACESSO,
        },
      }),
  });

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar o dashboard agora. Verifique a conexão e recarregue a página.
      </p>
    );
  }
  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Carregando indicadores...</p>;
  }

  const temGiro = data.features.some((f) => f.chave === "giro_de_sala");
  const periodoCurto = rotuloPeriodoCurto(filtro);

  return (
    <div className="space-y-8">
      {temGiro ? (
        <>
          <FiltroPeriodoSala
            key={`${filtro.de}_${filtro.ate}`}
            filtro={filtro}
            onChange={mudarFiltro}
          />

          <section aria-labelledby="titulo-agora" className="space-y-3">
            <h2 id="titulo-agora" className="sr-only">
              Agora
            </h2>
            <SalasParadasAgora filtro={filtro} />
            <SalasAoVivo salaId={filtro.sala} />
          </section>

          <section aria-labelledby="titulo-periodo" className="space-y-4">
            <h2 id="titulo-periodo" className="text-lg font-semibold">
              Giro de sala no período
            </h2>
            <IndicadoresDoPeriodo filtro={filtro} />
            <ResumoPorSala
              filtro={filtro}
              acaoSala={(s) => (
                <Link
                  to="/hospital/giro-sala"
                  search={{ de: filtro.de, ate: filtro.ate, sala: s.id }}
                  hash="eventos"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver eventos
                </Link>
              )}
            />
            <Link
              to="/hospital/giro-sala"
              search={{ de: filtro.de, ate: filtro.ate, sala: filtro.sala }}
              className="inline-block text-sm text-primary underline"
            >
              Abrir o relatório completo do giro (por etapa, por dia e lista de eventos)
            </Link>
          </section>
        </>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
          O módulo Giro de sala não está contratado. Fale com a equipe Trizion Tech para acompanhar
          enfermagem, limpeza e paradas por sala.
        </p>
      )}

      <section aria-labelledby="titulo-outros" className="space-y-4">
        <h2 id="titulo-outros" className="text-lg font-semibold">
          Outros indicadores
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            rotulo={`Check-ins · ${periodoCurto}`}
            valor={checkinsPeriodo.data ? String(checkinsPeriodo.data.total) : "—"}
            nota={`${data.checkins.hoje} hoje`}
          />
          <Indicador
            rotulo="Salas ativas · agora"
            valor={String(data.salas.ativas)}
            nota={`${data.salas.emProcesso} em processo agora${
              data.salas.limite != null ? ` · limite contratado: ${data.salas.limite}` : ""
            }`}
          />
          <Indicador
            rotulo="Equipe ativa · agora"
            valor={String(data.usuarios.ativos)}
            nota={`${data.usuarios.operadores} logins operacionais`}
          />
          <Indicador
            rotulo="Módulos ativos"
            valor={String(data.features.filter((f) => f.habilitada).length)}
            nota={`de ${data.features.length} contratado(s)`}
          />
        </div>
      </section>

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

      <div className="space-y-3">
        <TabelaDados
          titulo="Últimos acessos (não depende do filtro de período)"
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
  );
}
