import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Globe, KeyRound, ShieldCheck, ToggleRight } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditoria } from "@/lib/api/auditoria";
import { painelSeguranca, salvarConfigSeguranca } from "@/lib/api/medsync";
import { PainelIps, useIndicadoresSeguranca } from "@/components/medsync/painel-ips";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ObservabilidadeUsuarios,
  PosturaSeguranca,
  usePostura,
} from "@/components/medsync/postura-seguranca";

export const Route = createFileRoute("/_authenticated/master/auditoria")({
  head: () => ({
    meta: [
      { title: "Segurança e Auditoria | KlinSync" },
      {
        name: "description",
        content:
          "Central unificada de acessos, ações administrativas, features e política de segurança da plataforma.",
      },
      { property: "og:title", content: "Segurança e Auditoria | KlinSync" },
      {
        property: "og:description",
        content:
          "Central unificada de acessos, ações administrativas, features e política de segurança da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SegurancaAuditoria,
});

const TIPOS = [
  { valor: "todos", nome: "Todos os setores" },
  { valor: "acesso", nome: "Acessos" },
  { valor: "acao", nome: "Ações administrativas" },
  { valor: "feature", nome: "Features" },
];

const POR_PAGINA = 20;

/** Extrai o país a partir do texto "cidade, região, país" gravado nos acessos. */
function paisDe(regiao: string | null | undefined): string | null {
  if (!regiao) return null;
  const partes = regiao
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!partes.length) return null;
  const ultimo = partes[partes.length - 1]!;
  if (/rede local/i.test(regiao)) return "Rede local";
  return ultimo;
}

function CardSetor({
  titulo,
  valor,
  nota,
  linhas,
  icone,
  cor,
  ativo,
  onClick,
}: {
  titulo: string;
  valor: number;
  nota: string;
  linhas: { rotulo: string; valor: string | number }[];
  icone: React.ReactNode;
  cor: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${cor} ${
        ativo ? "ring-2 ring-primary" : "hover:brightness-110"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{titulo}</span>
        {icone}
      </div>
      <p className="mt-3 text-3xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs opacity-80">{nota}</p>
      <dl className="mt-3 space-y-1 border-t border-current/20 pt-2 text-xs opacity-90">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex items-center justify-between gap-2">
            <dt className="opacity-80">{l.rotulo}</dt>
            <dd className="font-medium">{l.valor}</dd>
          </div>
        ))}
      </dl>
    </button>
  );
}

function SegurancaAuditoria() {
  const qc = useQueryClient();
  const fetcher = auditoria;
  const fetchSeguranca = painelSeguranca;
  const salvar = salvarConfigSeguranca;

  const [dias, setDias] = useState("30");
  const [tipo, setTipo] = useState("todos");
  const [hospital, setHospital] = useState("todos");
  const [pais, setPais] = useState("todos");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aba, setAba] = useState("geral");

  const { data, isLoading } = useQuery({
    queryKey: ["auditoria", dias],
    queryFn: () => fetcher({ data: { dias: Number(dias) } }),
  });
  const { data: seg } = useQuery({ queryKey: ["seguranca"], queryFn: () => fetchSeguranca() });
  const { data: ind } = useIndicadoresSeguranca(Number(dias));
  const { data: postura } = usePostura(Number(dias));

  const [cfg, setCfg] = useState({ max_tentativas: 5, janela_minutos: 15, bloqueio_minutos: 15 });
  useEffect(() => {
    if (seg?.config) {
      setCfg({
        max_tentativas: seg.config.max_tentativas,
        janela_minutos: seg.config.janela_minutos,
        bloqueio_minutos: seg.config.bloqueio_minutos,
      });
    }
  }, [seg?.config]);

  const mSalvar = useMutation({
    mutationFn: () => salvar({ data: cfg }),
    onSuccess: () => {
      toast.success("Política de acesso atualizada.");
      void qc.invalidateQueries({ queryKey: ["seguranca"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eventos = useMemo(() => data?.eventos ?? [], [data]);

  const resumo = useMemo(() => {
    const acessos = eventos.filter((e) => e.tipo === "acesso");
    const falhas = acessos.filter((e) => e.sucesso === false);
    const acoes = eventos.filter((e) => e.tipo === "acao");
    const feats = eventos.filter((e) => e.tipo === "feature");
    const contarPorTitulo = (lista: typeof eventos) => {
      const m = new Map<string, number>();
      for (const e of lista) m.set(e.titulo, (m.get(e.titulo) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const alvos = new Map<string, number>();
    for (const f of falhas) alvos.set(f.detalhe, (alvos.get(f.detalhe) ?? 0) + 1);
    const maiorAlvo = [...alvos.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      acessos: acessos.length,
      falhas: falhas.length,
      acoes: acoes.length,
      features: feats.length,
      sucessos: acessos.length - falhas.length,
      taxaFalha: acessos.length ? Math.round((falhas.length / acessos.length) * 100) : 0,
      ultimoAcesso: acessos[0]
        ? new Date(acessos[0].quando).toLocaleString("pt-BR")
        : "sem registro",
      maiorAlvo: maiorAlvo ? `${maiorAlvo[0]} (${maiorAlvo[1]})` : "nenhum",
      acaoTop: contarPorTitulo(acoes)[0],
      autoresAcoes: new Set(acoes.map((a) => a.autor ?? "")).size,
      featAtivadas: feats.filter((f) => f.titulo.includes("ativada")).length,
      featDesativadas: feats.filter((f) => f.titulo.includes("desativada")).length,
      hospitaisFeat: new Set(feats.map((f) => f.hospital ?? "")).size,
    };
  }, [eventos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return eventos.filter((e) => {
      if (tipo !== "todos" && e.tipo !== tipo) return false;
      if (hospital !== "todos" && e.hospital !== hospital) return false;
      if (pais !== "todos" && (paisDe(e.regiao) ?? "Desconhecido") !== pais) return false;
      if (!termo) return true;
      return [e.titulo, e.detalhe, e.autor, e.hospital, e.ip]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [eventos, tipo, hospital, pais, busca]);

  const paises = useMemo(() => {
    const m = new Map<string, { total: number; falhas: number }>();
    for (const e of eventos) {
      if (e.tipo !== "acesso") continue;
      const p = paisDe(e.regiao) ?? "Desconhecido";
      const atual = m.get(p) ?? { total: 0, falhas: 0 };
      atual.total += 1;
      if (e.sucesso === false) atual.falhas += 1;
      m.set(p, atual);
    }
    return [...m.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.total - a.total);
  }, [eventos]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, paginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function trocarTipo(v: string) {
    setTipo(v);
    setPagina(1);
  }

  function exportarCsv() {
    const linhas = [
      ["Data", "Setor", "Evento", "Detalhe", "Autor", "Hospital", "IP", "País", "Região"],
      ...filtrados.map((e) => [
        new Date(e.quando).toLocaleString("pt-BR"),
        e.tipo,
        e.titulo,
        e.detalhe,
        e.autor ?? "",
        e.hospital ?? "",
        e.ip ?? "",
        paisDe(e.regiao) ?? "",
        e.regiao ?? "",
      ]),
    ];
    const csv = linhas
      .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `seguranca-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Segurança e observabilidade</h1>
          <p className="text-sm text-muted-foreground">
            Postura técnica, comportamento dos usuários e trilha de auditoria da plataforma.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label>Período analisado</Label>
            <Select
              value={dias}
              onValueChange={(v) => {
                setDias(v);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24 horas</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">Conformidade</p>
            <p className="text-2xl font-semibold">{postura?.pontuacao ?? "—"}%</p>
          </div>
        </div>
      </header>

      <Tabs value={aba} onValueChange={setAba} className="space-y-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="postura">
            Postura de segurança
            {postura && postura.checagens.some((c) => c.status === "critico") ? (
              <Badge variant="destructive" className="ml-2">
                {postura.checagens.filter((c) => c.status === "critico").length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            Usuários
            {postura && postura.usuarios.some((u) => u.risco !== "ok") ? (
              <Badge variant="secondary" className="ml-2">
                {postura.usuarios.filter((u) => u.risco !== "ok").length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="rede">Rede e bloqueios</TabsTrigger>
          <TabsTrigger value="linha">Linha do tempo</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CardSetor
              titulo="Acessos"
              valor={resumo.acessos}
              nota="Tentativas de login no período"
              linhas={[
                { rotulo: "Logins válidos", valor: resumo.sucessos },
                { rotulo: "IPs distintos", valor: ind?.indicadores.ipsUnicos ?? "—" },
                { rotulo: "Último acesso", valor: resumo.ultimoAcesso },
              ]}
              icone={<KeyRound className="size-5" />}
              cor="border-sky-500/40 bg-sky-400/70 text-slate-950"
              ativo={tipo === "acesso"}
              onClick={() => {
                trocarTipo(tipo === "acesso" ? "todos" : "acesso");
                setAba("linha");
              }}
            />
            <CardSetor
              titulo="Falhas de login"
              valor={resumo.falhas}
              nota="Bloqueios e credenciais inválidas"
              linhas={[
                { rotulo: "Taxa de falha", valor: `${resumo.taxaFalha}%` },
                { rotulo: "IPs suspeitos", valor: ind?.indicadores.ipsSuspeitos ?? "—" },
                { rotulo: "Mais visado", valor: resumo.maiorAlvo },
              ]}
              icone={<AlertTriangle className="size-5" />}
              cor="border-rose-500/40 bg-rose-400/70 text-slate-950"
              ativo={false}
              onClick={() => {
                trocarTipo("acesso");
                setBusca("");
                setAba("linha");
              }}
            />
            <CardSetor
              titulo="Ações administrativas"
              valor={resumo.acoes}
              nota="Cadastros, permissões e convites"
              linhas={[
                {
                  rotulo: "Mais frequente",
                  valor: resumo.acaoTop ? `${resumo.acaoTop[0]} (${resumo.acaoTop[1]})` : "nenhuma",
                },
                { rotulo: "Autores distintos", valor: resumo.autoresAcoes },
                { rotulo: "IPs bloqueados", valor: ind?.indicadores.bloqueiosAtivos ?? "—" },
              ]}
              icone={<ShieldCheck className="size-5" />}
              cor="border-emerald-500/40 bg-emerald-400/70 text-slate-950"
              ativo={tipo === "acao"}
              onClick={() => {
                trocarTipo(tipo === "acao" ? "todos" : "acao");
                setAba("linha");
              }}
            />
            <CardSetor
              titulo="Features"
              valor={resumo.features}
              nota="Ativações e suspensões por hospital"
              linhas={[
                { rotulo: "Ativações", valor: resumo.featAtivadas },
                { rotulo: "Desativações", valor: resumo.featDesativadas },
                { rotulo: "Hospitais afetados", valor: resumo.hospitaisFeat },
              ]}
              icone={<ToggleRight className="size-5" />}
              cor="border-amber-500/40 bg-amber-400/70 text-slate-950"
              ativo={tipo === "feature"}
              onClick={() => {
                trocarTipo(tipo === "feature" ? "todos" : "feature");
                setAba("linha");
              }}
            />
          </section>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Origem dos acessos por país</CardTitle>
              {pais !== "todos" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPais("todos");
                    setPagina(1);
                  }}
                >
                  Limpar filtro
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {paises.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum acesso com localidade registrada no período.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {paises.map((p) => (
                    <button
                      key={p.nome}
                      type="button"
                      onClick={() => {
                        setPais(pais === p.nome ? "todos" : p.nome);
                        setPagina(1);
                      }}
                      className={`rounded-xl border p-3 text-left transition hover:bg-muted ${
                        pais === p.nome ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{p.nome}</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold">{p.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.falhas} falha(s) · {p.total ? Math.round((p.falhas / p.total) * 100) : 0}
                        % de falha
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="postura">
          <PosturaSeguranca dias={Number(dias)} />
        </TabsContent>

        <TabsContent value="usuarios">
          <ObservabilidadeUsuarios dias={Number(dias)} />
        </TabsContent>

        <TabsContent value="rede" className="space-y-6">
          <PainelIps dias={Number(dias)} />

          <Card>
            <CardHeader>
              <CardTitle>Política de tentativas de login</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mSalvar.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="max">Tentativas permitidas</Label>
                  <Input
                    id="max"
                    type="number"
                    value={cfg.max_tentativas}
                    onChange={(e) => setCfg({ ...cfg, max_tentativas: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="janela">Janela (min)</Label>
                  <Input
                    id="janela"
                    type="number"
                    value={cfg.janela_minutos}
                    onChange={(e) => setCfg({ ...cfg, janela_minutos: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bloq">Bloqueio (min)</Label>
                  <Input
                    id="bloq"
                    type="number"
                    value={cfg.bloqueio_minutos}
                    onChange={(e) => setCfg({ ...cfg, bloqueio_minutos: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={mSalvar.isPending}>
                    Salvar política
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linha" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Select value={tipo} onValueChange={trocarTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hospital</Label>
                <Select
                  value={hospital}
                  onValueChange={(v) => {
                    setHospital(v);
                    setPagina(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(data?.hospitais ?? []).map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>País</Label>
                <Select
                  value={pais}
                  onValueChange={(v) => {
                    setPais(v);
                    setPagina(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os países</SelectItem>
                    {paises.map((p) => (
                      <SelectItem key={p.nome} value={p.nome}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="busca">Busca</Label>
                <Input
                  id="busca"
                  placeholder="e-mail, usuário, IP..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>
                Linha do tempo{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filtrados.length} registros)
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarCsv}
                disabled={!filtrados.length}
              >
                <Download className="size-4" /> Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
                {!isLoading && !filtrados.length ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum registro no período e filtros selecionados.
                  </p>
                ) : null}
                {visiveis.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            e.sucesso === false
                              ? "destructive"
                              : e.tipo === "acesso"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {e.titulo}
                        </Badge>
                        {e.hospital ? (
                          <span className="text-xs text-muted-foreground">{e.hospital}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm">{e.detalhe}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {e.autor ? `por ${e.autor}` : "autor não identificado"}
                        {e.ip ? ` · ${e.ip}` : ""}
                        {e.regiao ? ` · ${e.regiao}` : ""}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.quando).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {filtrados.length === 0 ? 0 : (paginaAtual - 1) * POR_PAGINA + 1}–
                  {Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPagina(paginaAtual - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {paginaAtual} de {paginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual >= paginas}
                    onClick={() => setPagina(paginaAtual + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
