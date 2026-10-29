import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  DollarSign,
  Info,
  Lightbulb,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  COR,
  GraficoCustoDiario,
  GraficoDuplo,
  GraficoLatencia,
  GraficoRequisicoes,
  GraficoSerie,
  fmtBytes,
  fmtUsd,
} from "@/components/medsync/observabilidade-graficos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  obterAplicacao,
  obterCustos,
  obterResumo,
  obterServidores,
  type Alerta,
  type Fonte,
  type Horas,
  type Instancia,
  type SerieInstancia,
  type Severidade,
} from "@/lib/api/observabilidade";
import { mensagemAmigavel } from "@/lib/erros";

const PERIODOS: { valor: Horas; rotulo: string }[] = [
  { valor: 1, rotulo: "1 h" },
  { valor: 6, rotulo: "6 h" },
  { valor: 24, rotulo: "24 h" },
  { valor: 72, rotulo: "3 dias" },
];

const ESTILO_SEV: Record<Severidade, { rotulo: string; classe: string; icone: ReactNode }> = {
  critico: {
    rotulo: "Crítico",
    classe: "border-rose-500/50 bg-rose-500/10",
    icone: <XCircle className="size-5 text-rose-600" />,
  },
  aviso: {
    rotulo: "Atenção",
    classe: "border-amber-500/50 bg-amber-500/10",
    icone: <AlertTriangle className="size-5 text-amber-600" />,
  },
  info: {
    rotulo: "Informação",
    classe: "border-sky-500/40 bg-sky-500/10",
    icone: <Info className="size-5 text-sky-600" />,
  },
};

const quando = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "—";

function duracao(seg: number) {
  const d = Math.floor(seg / 86400);
  const h = Math.floor((seg % 86400) / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function Carregando({ erro }: { erro?: unknown }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {erro ? `Não foi possível carregar: ${mensagemAmigavel(erro)}` : "Carregando..."}
    </p>
  );
}

function Seletor({ valor, aoMudar }: { valor: Horas; aoMudar: (h: Horas) => void }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Período">
      {PERIODOS.map((p) => (
        <Button
          key={p.valor}
          size="sm"
          variant={valor === p.valor ? "default" : "ghost"}
          aria-pressed={valor === p.valor}
          onClick={() => aoMudar(p.valor)}
          className="h-7 px-3"
        >
          {p.rotulo}
        </Button>
      ))}
    </div>
  );
}

function AvisoFonte({ fonte, o_que }: { fonte: Fonte; o_que: string }) {
  if (fonte.ok) return null;
  return (
    <Card className="border-amber-500/50 bg-amber-500/10">
      <CardContent className="flex gap-3 pt-6">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">{o_que} indisponível</p>
          <p>{fonte.mensagem}</p>
          {fonte.acao ? <p className="text-muted-foreground">{fonte.acao}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  titulo,
  valor,
  detalhe,
  tom,
}: {
  titulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "ok" | "aviso" | "critico";
}) {
  const cor = tom === "critico" ? "text-rose-600" : tom === "aviso" ? "text-amber-600" : "";
  return (
    <Card className="shadow-elev">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-semibold ${cor}`}>{valor}</p>
        {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------- Visão geral ----------------------------------------------- */

function CartaoAlerta({ a }: { a: Alerta }) {
  const e = ESTILO_SEV[a.severidade];
  return (
    <div className={`rounded-xl border p-4 ${e.classe}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{e.icone}</span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{a.titulo}</p>
            <Badge variant="outline" className="text-[10px] uppercase">
              {e.rotulo}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{a.detalhe}</p>
          <p className="flex items-start gap-1.5 text-sm">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{a.recomendacao}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function VisaoGeral() {
  const q = useQuery({
    queryKey: ["obs", "resumo"],
    queryFn: obterResumo,
    refetchInterval: 30_000,
  });
  if (!q.data) return <Carregando erro={q.error} />;
  const r = q.data;
  const { servidores, api, banco, custos } = r.kpis;

  const banner =
    r.saude === "critico"
      ? {
          classe: "border-rose-500/50 bg-rose-500/10",
          icone: <XCircle className="size-6 text-rose-600" />,
          texto: "Há problemas críticos que pedem ação agora",
        }
      : r.saude === "atencao"
        ? {
            classe: "border-amber-500/50 bg-amber-500/10",
            icone: <AlertTriangle className="size-6 text-amber-600" />,
            texto: "Tudo no ar, mas há pontos de atenção",
          }
        : {
            classe: "border-emerald-500/50 bg-emerald-500/10",
            icone: <CheckCircle2 className="size-6 text-emerald-600" />,
            texto: "Tudo certo: nenhum problema detectado",
          };

  const contagem = (s: Severidade) => r.alertas.filter((a) => a.severidade === s).length;
  const orcamentoPct = custos?.orcamento
    ? Math.min(100, (custos.mesAtual / custos.orcamento) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${banner.classe}`}
      >
        <div className="flex items-center gap-3">
          {banner.icone}
          <div>
            <p className="font-semibold">{banner.texto}</p>
            <p className="text-xs text-muted-foreground">
              {contagem("critico")} crítico(s) · {contagem("aviso")} atenção · {contagem("info")}{" "}
              informação · atualizado às {new Date(r.geradoEm).toLocaleTimeString("pt-BR")} (renova
              a cada 30 s)
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}
        >
          <RefreshCw className={`mr-2 size-4 ${q.isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          titulo="Servidores"
          valor={`${servidores.emExecucao}/${servidores.total}`}
          detalhe={servidores.comProblema ? `${servidores.comProblema} com alerta` : "em execução"}
          tom={
            servidores.comProblema
              ? "aviso"
              : servidores.total && servidores.emExecucao < servidores.total
                ? "critico"
                : "ok"
          }
        />
        <Kpi
          titulo="API (últimos 15 min)"
          valor={`${api.requisicoes15m} req`}
          detalhe={`${api.taxaErros5xx}% de erros 5xx · ${api.latenciaMediaMs} ms em média`}
          tom={api.taxaErros5xx >= 5 ? "critico" : api.taxaErros5xx >= 1 ? "aviso" : "ok"}
        />
        <Kpi
          titulo="Banco de dados"
          valor={banco ? `${banco.latenciaMs} ms` : "Sem resposta"}
          detalhe={
            banco ? `${banco.conexoes} de ${banco.maxConexoes} conexões` : "A verificação falhou"
          }
          tom={!banco ? "critico" : banco.conexoes / banco.maxConexoes >= 0.75 ? "aviso" : "ok"}
        />
        <Kpi
          titulo="Custo no mês"
          valor={custos ? fmtUsd(custos.mesAtual) : "—"}
          detalhe={
            custos ? (
              <>
                {custos.previsaoFimMes !== null
                  ? `Previsão ${fmtUsd(custos.previsaoFimMes)}`
                  : "Sem previsão ainda"}
                {orcamentoPct !== null ? ` · ${Math.round(orcamentoPct)}% do orçamento` : ""}
              </>
            ) : (
              "Dados de custo indisponíveis"
            )
          }
          tom={
            custos?.orcamento && (custos.previsaoFimMes ?? custos.mesAtual) >= custos.orcamento
              ? "critico"
              : "ok"
          }
        />
      </div>

      <section className="space-y-3" aria-label="Alertas">
        <h2 className="text-lg font-semibold">Alertas e recomendações</h2>
        {r.alertas.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Nenhum alerta. As regras acompanham CPU, créditos, memória, disco (inclusive a
              tendência de encher), status da AWS, erros e lentidão da API, conexões do banco e
              custo.
            </CardContent>
          </Card>
        ) : (
          r.alertas.map((a) => <CartaoAlerta key={a.id} a={a} />)
        )}
      </section>
    </div>
  );
}

/* ----------------------------------------------- Servidores ----------------------------------------------- */

function corEstado(estado: string): "default" | "secondary" | "destructive" | "outline" {
  return estado === "running" ? "default" : estado === "pending" ? "secondary" : "destructive";
}

function rotuloStatus(s: string) {
  return s === "ok"
    ? "OK"
    : s === "comprometido"
      ? "Falhou"
      : s === "inicializando"
        ? "Iniciando"
        : s === "indisponivel"
          ? "Sem dados"
          : "—";
}

const ultimo = (p: { v: number }[]) => (p.length ? p[p.length - 1]!.v : null);

function Medida({
  rotulo,
  valor,
  sufixo = "%",
  alerta,
  critico,
}: {
  rotulo: string;
  valor: number | null;
  sufixo?: string;
  alerta?: number;
  critico?: number;
}) {
  const cor =
    valor === null
      ? ""
      : critico !== undefined && valor >= critico
        ? "text-rose-600"
        : alerta !== undefined && valor >= alerta
          ? "text-amber-600"
          : "";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={`text-xl font-semibold ${cor}`}>
        {valor === null ? "—" : `${valor.toFixed(valor >= 100 ? 0 : 1)}${sufixo}`}
      </p>
    </div>
  );
}

function CartaoServidor({
  i,
  s,
  longo,
}: {
  i: Instancia;
  s: SerieInstancia | undefined;
  longo: boolean;
}) {
  const semAgente = !!s && s.memoria.length === 0 && s.disco.length === 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="size-4" /> {i.nome}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {i.tipo} · {i.az ?? "—"} · {i.ipPrivado ?? "sem IP privado"}
              {i.ipPublico ? ` · público ${i.ipPublico}` : ""}
              {i.iniciadaEm && i.estado === "running"
                ? ` · ligada há ${duracao((Date.now() - new Date(i.iniciadaEm).getTime()) / 1000)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={corEstado(i.estado)}>{i.estado}</Badge>
            <Badge variant={i.statusInstancia === "comprometido" ? "destructive" : "outline"}>
              Instância: {rotuloStatus(i.statusInstancia)}
            </Badge>
            <Badge variant={i.statusSistema === "comprometido" ? "destructive" : "outline"}>
              Sistema AWS: {rotuloStatus(i.statusSistema)}
            </Badge>
          </div>
        </div>
        {i.eventosAgendados.map((e) => (
          <p key={e.codigo} className="mt-2 flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="size-4" /> Manutenção agendada ({e.codigo}): {e.descricao}{" "}
            {e.inicio ? `— ${quando(e.inicio)}` : ""}
          </p>
        ))}
      </CardHeader>
      {i.estado !== "running" || !s ? (
        <CardContent className="text-sm text-muted-foreground">
          Sem métricas: a instância não está em execução.
        </CardContent>
      ) : (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Medida rotulo="CPU" valor={ultimo(s.cpu)} alerta={75} critico={90} />
            <Medida rotulo="Memória" valor={ultimo(s.memoria)} alerta={80} critico={92} />
            <Medida rotulo="Disco (/)" valor={ultimo(s.disco)} alerta={80} critico={90} />
            {i.burstavel ? (
              <Medida rotulo="Créditos de CPU" valor={ultimo(s.creditos)} sufixo="" />
            ) : (
              <Medida rotulo="Créditos" valor={null} />
            )}
          </div>
          {semAgente ? (
            <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-xs">
              Memória e disco ainda não chegam ao CloudWatch. Instale o agente nesta instância com{" "}
              <code className="rounded bg-muted px-1">
                sudo klinsync-backend/scripts/install-cwagent.sh
              </code>
              .
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">CPU (%)</p>
              <GraficoSerie dados={s.cpu} cor={COR.azul} max={100} longo={longo} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Rede (por intervalo)</p>
              <GraficoDuplo a={s.redeEntrada} b={s.redeSaida} nomeA="Entrada" nomeB="Saída" />
            </div>
            {s.memoria.length ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Memória (%)</p>
                <GraficoSerie dados={s.memoria} cor={COR.verde} max={100} longo={longo} />
              </div>
            ) : null}
            {s.disco.length ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Disco usado (%)</p>
                <GraficoSerie dados={s.disco} cor={COR.ambar} max={100} longo={longo} />
              </div>
            ) : null}
            {i.burstavel && s.creditos.length ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Créditos de CPU</p>
                <GraficoSerie
                  dados={s.creditos}
                  cor={COR.roxo}
                  unidade=""
                  formatar={(v) => v.toFixed(0)}
                  longo={longo}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Servidores() {
  const [horas, setHoras] = useState<Horas>(6);
  const q = useQuery({
    queryKey: ["obs", "servidores", horas],
    queryFn: () => obterServidores(horas),
    refetchInterval: 60_000,
  });
  if (!q.data) return <Carregando erro={q.error} />;
  const d = q.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Métricas básicas do EC2 têm resolução de 5 min. Atualizado às{" "}
          {new Date(d.geradoEm).toLocaleTimeString("pt-BR")}.
        </p>
        <Seletor valor={horas} aoMudar={setHoras} />
      </div>
      <AvisoFonte fonte={d.fonte} o_que="Leitura dos servidores" />
      {d.fonte.ok && d.instancias.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhuma instância EC2 encontrada nesta região com a tag Name começando com o prefixo
            configurado (MONITOR_NOME_PREFIXO, padrão "Klinsync"). Quando os servidores forem
            criados pelo Terraform, eles aparecem aqui sozinhos.
          </CardContent>
        </Card>
      ) : null}
      {d.instancias.map((i) => (
        <CartaoServidor key={i.id} i={i} s={d.series[i.id]} longo={horas > 24} />
      ))}
      {d.alarmes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alarmes do CloudWatch</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alarme</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.alarmes.map((a) => (
                  <TableRow key={a.nome}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.estado === "ALARM"
                            ? "destructive"
                            : a.estado === "OK"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {a.estado}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-md truncate text-xs text-muted-foreground"
                      title={a.motivo}
                    >
                      {a.motivo}
                    </TableCell>
                    <TableCell className="text-xs">{quando(a.atualizadoEm)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------- Aplicação ----------------------------------------------- */

function Aplicacao() {
  const [horas, setHoras] = useState<Horas>(1);
  const q = useQuery({
    queryKey: ["obs", "aplicacao", horas],
    queryFn: () => obterAplicacao(horas),
    refetchInterval: 30_000,
  });
  if (!q.data) return <Carregando erro={q.error} />;
  const d = q.data;
  const total = d.serie.reduce((a, p) => a + p.requisicoes, 0);
  const e5 = d.serie.reduce((a, p) => a + p.erros5xx, 0);
  const e4 = d.serie.reduce((a, p) => a + p.erros4xx, 0);
  const lentas = d.serie.reduce((a, p) => a + p.lentas, 0);
  const soma = d.serie.reduce((a, p) => a + p.latenciaMediaMs * p.requisicoes, 0);
  const media = total ? Math.round(soma / total) : 0;
  const b = d.banco;
  const p = d.processo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Medido pela própria API (sem dados de usuários). Lenta = acima de {d.limiteLentaMs} ms.
        </p>
        <Seletor valor={horas} aoMudar={setHoras} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi titulo="Requisições" valor={total.toLocaleString("pt-BR")} />
        <Kpi
          titulo="Erros 5xx (servidor)"
          valor={e5}
          detalhe={total ? `${((e5 / total) * 100).toFixed(2)}%` : undefined}
          tom={total && e5 / total >= 0.05 ? "critico" : e5 > 0 ? "aviso" : "ok"}
        />
        <Kpi titulo="Erros 4xx (cliente)" valor={e4} detalhe="login errado, sem permissão…" />
        <Kpi titulo="Latência média" valor={`${media} ms`} tom={media >= 1000 ? "aviso" : "ok"} />
        <Kpi titulo="Respostas lentas" valor={lentas} tom={lentas > 0 ? "aviso" : "ok"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisições e erros</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoRequisicoes dados={d.serie} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latência</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoLatencia dados={d.serie} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rotas (piores primeiro)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {d.rotas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda sem requisições registradas neste período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rota</TableHead>
                  <TableHead className="text-right">Req.</TableHead>
                  <TableHead className="text-right">5xx</TableHead>
                  <TableHead className="text-right">4xx</TableHead>
                  <TableHead className="text-right">Lentas</TableHead>
                  <TableHead className="text-right">Média</TableHead>
                  <TableHead className="text-right">Máx.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.rotas.map((r) => (
                  <TableRow key={`${r.metodo} ${r.rota}`}>
                    <TableCell className="font-mono text-xs">
                      <span className="mr-2 text-muted-foreground">{r.metodo}</span>
                      {r.rota}
                    </TableCell>
                    <TableCell className="text-right">{r.requisicoes}</TableCell>
                    <TableCell
                      className={`text-right ${r.erros5xx ? "font-semibold text-rose-600" : ""}`}
                    >
                      {r.erros5xx}
                    </TableCell>
                    <TableCell className="text-right">{r.erros4xx}</TableCell>
                    <TableCell className={`text-right ${r.lentas ? "text-amber-600" : ""}`}>
                      {r.lentas}
                    </TableCell>
                    <TableCell className="text-right">{r.latenciaMediaMs} ms</TableCell>
                    <TableCell className="text-right">{r.latenciaMaxMs} ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Banco de dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!b.disponivel ? (
              <p className="text-rose-600">
                Sem resposta do Postgres, ou sem permissão para ler as estatísticas.
              </p>
            ) : (
              <>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Conexões</span>
                    <span>
                      {b.conexoes} / {b.maxConexoes}
                    </span>
                  </div>
                  <Progress value={(b.conexoes / b.maxConexoes) * 100} />
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <dt className="text-muted-foreground">Latência de uma consulta simples</dt>
                  <dd className="text-right">{b.latenciaMs} ms</dd>
                  <dt className="text-muted-foreground">Consultas ativas</dt>
                  <dd className="text-right">{b.consultasAtivas}</dd>
                  <dt className="text-muted-foreground">Consulta ativa mais longa</dt>
                  <dd
                    className={`text-right ${b.consultaMaisLongaSeg > 30 ? "text-amber-600" : ""}`}
                  >
                    {b.consultaMaisLongaSeg} s
                  </dd>
                  <dt className="text-muted-foreground">Tamanho do banco</dt>
                  <dd className="text-right">{fmtBytes(b.tamanhoBytes)}</dd>
                  <dt className="text-muted-foreground">Versão</dt>
                  <dd className="text-right">{b.versao}</dd>
                </dl>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processo da API (este servidor)</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Ligado há</dt>
              <dd className="text-right">{duracao(p.uptimeSeg)}</dd>
              <dt className="text-muted-foreground">Memória do processo</dt>
              <dd className="text-right">
                {p.rssMb} MB (heap {p.heapUsadoMb} MB)
              </dd>
              <dt className="text-muted-foreground">Atraso do event loop</dt>
              <dd className={`text-right ${p.atrasoLoopP99Ms > 100 ? "text-amber-600" : ""}`}>
                {p.atrasoLoopMs} ms (p99 {p.atrasoLoopP99Ms} ms)
              </dd>
              <dt className="text-muted-foreground">Memória livre do servidor</dt>
              <dd className="text-right">
                {p.host.memoriaLivreMb} / {p.host.memoriaTotalMb} MB
              </dd>
              <dt className="text-muted-foreground">Carga (1 min) · CPUs</dt>
              <dd className="text-right">
                {p.host.cargaMedia1m} · {p.host.cpus}
              </dd>
              <dt className="text-muted-foreground">Node · ambiente</dt>
              <dd className="text-right">
                {p.node} · {p.ambiente}
              </dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------- Custos ------------------------------------------------- */

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior < 0.01) return <span className="text-muted-foreground">novo</span>;
  const v = ((atual - anterior) / anterior) * 100;
  const cor = v > 20 ? "text-rose-600" : v < -20 ? "text-emerald-600" : "text-muted-foreground";
  return (
    <span className={cor}>
      {v > 0 ? "+" : ""}
      {v.toFixed(0)}%
    </span>
  );
}

function Custos() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["obs", "custos"],
    queryFn: () => obterCustos(false),
    refetchInterval: 5 * 60_000,
  });
  const atualizar = useMutation({
    mutationFn: () => obterCustos(true),
    onSuccess: (novo) => qc.setQueryData(["obs", "custos"], novo),
  });
  if (!q.data) return <Carregando erro={q.error} />;
  const { custos: c, orcamento, fonte } = q.data;
  const bloqueado = q.data.proximaAtualizacaoManualEm
    ? new Date(q.data.proximaAtualizacaoManualEm).getTime() > Date.now()
    : false;

  return (
    <div className="space-y-6">
      <AvisoFonte fonte={fonte} o_que="Leitura de custos" />
      {c ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Fonte: AWS Cost Explorer, atualizado em {quando(c.atualizadoEm)}. A AWS consolida os
              valores com até ~24 h de atraso, então o dia de hoje é parcial. Cada consulta é
              cobrada pela AWS (US$ 0,01), por isso a leitura é guardada por 3 h.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={atualizar.isPending || bloqueado}
              onClick={() => atualizar.mutate()}
              title={bloqueado ? "Disponível a cada 10 minutos" : undefined}
            >
              <RefreshCw className={`mr-2 size-4 ${atualizar.isPending ? "animate-spin" : ""}`} />{" "}
              Atualizar custos
            </Button>
          </div>
          {atualizar.isError ? (
            <p className="text-sm text-rose-600">{mensagemAmigavel(atualizar.error)}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              titulo="Gasto no mês"
              valor={fmtUsd(c.mesAtual.total)}
              detalhe={`${c.mesAtual.diasDecorridos} de ${c.mesAtual.diasNoMes} dias`}
            />
            <Kpi
              titulo="Previsão do mês"
              valor={c.previsaoFimMes !== null ? fmtUsd(c.previsaoFimMes) : "—"}
              detalhe={
                c.previsaoFimMes === null
                  ? "A AWS precisa de mais histórico"
                  : `Mês passado: ${fmtUsd(c.mesAnterior.total)}`
              }
              tom={orcamento && (c.previsaoFimMes ?? 0) >= orcamento ? "critico" : "ok"}
            />
            <Kpi
              titulo="Hoje (parcial)"
              valor={fmtUsd(c.hoje)}
              detalhe={`Média diária dos últimos 7 dias: ${fmtUsd(c.mediaDiaria7d)}`}
            />
            <Kpi
              titulo="Vs. mesmo período do mês passado"
              valor={<Variacao atual={c.mesAtual.total} anterior={c.mesAnterior.mesmoPeriodo} />}
              detalhe={`Antes: ${fmtUsd(c.mesAnterior.mesmoPeriodo)}`}
            />
          </div>

          {orcamento ? (
            <Card>
              <CardContent className="space-y-2 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Orçamento mensal</span>
                  <span>
                    {fmtUsd(c.mesAtual.total)} de {fmtUsd(orcamento)}
                  </span>
                </div>
                <Progress value={Math.min(100, (c.mesAtual.total / orcamento) * 100)} />
                <p className="text-xs text-muted-foreground">
                  Defina com ORCAMENTO_MENSAL_USD no ambiente da API; o alerta dispara quando a
                  previsão passa do valor.
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground">
              Dica: defina ORCAMENTO_MENSAL_USD no ambiente da API para receber alerta quando a
              previsão de fim de mês passar do seu limite.
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custo diário (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoCustoDiario dados={c.diario} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por serviço</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {c.porServico.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem custos registrados neste mês até agora.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Este mês</TableHead>
                      <TableHead className="text-right">Mesmo período mês passado</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead className="w-40">Participação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.porServico.map((s) => (
                      <TableRow key={s.servico}>
                        <TableCell className="font-medium">{s.servico}</TableCell>
                        <TableCell className="text-right">{fmtUsd(s.valor)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtUsd(s.anterior)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Variacao atual={s.valor} anterior={s.anterior} />
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={c.mesAtual.total ? (s.valor / c.mesAtual.total) * 100 : 0}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------- Painel ------------------------------------------------- */

export function PainelObservabilidade() {
  const resumo = useQuery({
    queryKey: ["obs", "resumo"],
    queryFn: obterResumo,
    refetchInterval: 30_000,
  });
  const criticos = resumo.data?.alertas.filter((a) => a.severidade === "critico").length ?? 0;
  const avisos = resumo.data?.alertas.filter((a) => a.severidade === "aviso").length ?? 0;

  return (
    <div className="space-y-4">
      {resumo.data?.modo === "demo" ? (
        <p
          className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-sm"
          role="status"
        >
          <strong>Modo demonstração:</strong> servidores e custos abaixo são fictícios, só para ver
          o painel funcionando. Em produção a API lê a AWS de verdade.
        </p>
      ) : null}
      <Tabs defaultValue="geral">
        <TabsList className="flex-wrap">
          <TabsTrigger value="geral" className="gap-2">
            <Activity className="size-4" /> Visão geral
            {criticos + avisos > 0 ? (
              <Badge variant={criticos ? "destructive" : "secondary"} className="ml-1">
                {criticos + avisos}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="servidores" className="gap-2">
            <Server className="size-4" /> Servidores
          </TabsTrigger>
          <TabsTrigger value="aplicacao" className="gap-2">
            <Activity className="size-4" /> Aplicação e banco
          </TabsTrigger>
          <TabsTrigger value="custos" className="gap-2">
            <DollarSign className="size-4" /> Custos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="geral" className="mt-4">
          <VisaoGeral />
        </TabsContent>
        <TabsContent value="servidores" className="mt-4">
          <Servidores />
        </TabsContent>
        <TabsContent value="aplicacao" className="mt-4">
          <Aplicacao />
        </TabsContent>
        <TabsContent value="custos" className="mt-4">
          <Custos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
