import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  FileWarning,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChecagemPostura, UsuarioObservado } from "@/lib/api/seguranca";
import { posturaSeguranca } from "@/lib/api/seguranca";

const CORES: Record<ChecagemPostura["status"], string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
  atencao: "border-amber-500/40 bg-amber-500/10 text-foreground",
  critico: "border-rose-500/40 bg-rose-500/10 text-foreground",
};

const ICONE_CATEGORIA: Record<ChecagemPostura["categoria"], React.ReactNode> = {
  banco: <Database className="size-4" />,
  arquivos: <HardDrive className="size-4" />,
  contas: <Users className="size-4" />,
  politica: <ShieldCheck className="size-4" />,
};

const ROTULO_ROLE: Record<string, string> = {
  master_admin: "Master Trizion",
  hospital_admin: "Admin do hospital",
  administrador: "Administrador",
  operador: "Operacional",
};

function quando(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "nunca";
}

export function usePostura(dias: number) {
  const carregar = posturaSeguranca;
  return useQuery({
    queryKey: ["postura-seguranca", Math.min(dias, 90)],
    queryFn: () => carregar({ data: { dias: Math.min(dias, 90) } }),
  });
}

export function PosturaSeguranca({ dias }: { dias: number }) {
  const { data, isLoading } = usePostura(dias);
  const [categoria, setCategoria] = useState("todas");

  const checagens = useMemo(
    () => (data?.checagens ?? []).filter((c) => categoria === "todas" || c.categoria === categoria),
    [data?.checagens, categoria],
  );

  const criticos = (data?.checagens ?? []).filter((c) => c.status === "critico").length;
  const atencoes = (data?.checagens ?? []).filter((c) => c.status === "atencao").length;
  const pontuacao = data?.pontuacao ?? 0;
  const nota = pontuacao >= 90 ? "Excelente" : pontuacao >= 70 ? "Aceitável" : "Requer ação";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Postura de segurança
          </CardTitle>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as áreas</SelectItem>
              <SelectItem value="banco">Banco de dados</SelectItem>
              <SelectItem value="arquivos">Arquivos</SelectItem>
              <SelectItem value="contas">Contas</SelectItem>
              <SelectItem value="politica">Políticas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border p-4 md:col-span-2">
              <p className="text-sm text-muted-foreground">Índice de conformidade</p>
              <p className="mt-1 text-4xl font-semibold">{pontuacao}%</p>
              <Progress value={pontuacao} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                {nota} · {(data?.checagens ?? []).length} controles verificados ·{" "}
                {data?.geradoEm ? new Date(data.geradoEm).toLocaleString("pt-BR") : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Falhas críticas</span>
                <ShieldAlert className="size-4 text-rose-300" />
              </div>
              <p className="mt-2 text-3xl font-semibold">{criticos}</p>
              <p className="text-xs text-muted-foreground">Exigem correção imediata</p>
            </div>
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pontos de atenção</span>
                <FileWarning className="size-4 text-amber-300" />
              </div>
              <p className="mt-2 text-3xl font-semibold">{atencoes}</p>
              <p className="text-xs text-muted-foreground">
                Tabelas com RLS: {data?.resumoTabelas.comRls ?? 0}/{data?.resumoTabelas.total ?? 0}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Verificando controles...</p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {checagens.map((c) => (
              <div key={c.id} className={`rounded-2xl border p-4 ${CORES[c.status]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {ICONE_CATEGORIA[c.categoria]}
                    {c.titulo}
                  </div>
                  {c.status === "ok" ? (
                    <CheckCircle2 className="size-5" />
                  ) : c.status === "atencao" ? (
                    <FileWarning className="size-5" />
                  ) : (
                    <XCircle className="size-5" />
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold">{c.detalhe}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>
                {c.itens.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.itens.slice(0, 8).map((i) => (
                      <Badge key={i} variant="outline" className="text-[11px]">
                        {i}
                      </Badge>
                    ))}
                    {c.itens.length > 8 ? (
                      <Badge variant="outline" className="text-[11px]">
                        +{c.itens.length - 8}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const RISCO_BADGE: Record<UsuarioObservado["risco"], { rotulo: string; classe: string }> = {
  ok: { rotulo: "Saudável", classe: "border-emerald-500/40 bg-emerald-500/10 text-foreground" },
  atencao: { rotulo: "Atenção", classe: "border-amber-500/40 bg-amber-500/10 text-foreground" },
  critico: { rotulo: "Crítico", classe: "border-rose-500/40 bg-rose-500/10 text-foreground" },
};

const POR_PAGINA = 15;

export function ObservabilidadeUsuarios({ dias }: { dias: number }) {
  const { data, isLoading } = usePostura(dias);
  const [busca, setBusca] = useState("");
  const [risco, setRisco] = useState("todos");
  const [perfil, setPerfil] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const usuarios = data?.usuarios ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (risco !== "todos" && u.risco !== risco) return false;
      if (perfil !== "todos" && u.role !== perfil) return false;
      if (!termo) return true;
      return [u.nome, u.email, u.hospital]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [usuarios, busca, risco, perfil]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const visiveis = filtrados.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  const resumo = {
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.ativo).length,
    nuncaAcessaram: usuarios.filter((u) => !u.ultimoLogin).length,
    emRisco: usuarios.filter((u) => u.risco !== "ok").length,
  };

  function exportar() {
    const linhas = [
      [
        "Nome",
        "E-mail",
        "Perfil",
        "Hospital",
        "Ativo",
        "E-mail confirmado",
        "MFA",
        "Último login",
        "Dias sem acesso",
        "Logins no período",
        "Falhas no período",
        "Risco",
        "Alertas",
      ],
      ...filtrados.map((u) => [
        u.nome,
        u.email ?? "",
        ROTULO_ROLE[u.role] ?? u.role,
        u.hospital ?? "",
        u.ativo ? "Sim" : "Não",
        u.confirmado ? "Sim" : "Não",
        u.mfa ? "Sim" : "Não",
        quando(u.ultimoLogin),
        u.diasSemAcesso ?? "",
        u.acessos,
        u.falhas,
        RISCO_BADGE[u.risco].rotulo,
        u.alertas.join(" | "),
      ]),
    ];
    const csv = linhas
      .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-seguranca-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { rotulo: "Usuários cadastrados", valor: resumo.total, nota: `${resumo.ativos} ativos` },
          {
            rotulo: "Nunca acessaram",
            valor: resumo.nuncaAcessaram,
            nota: "Contas sem primeiro login",
          },
          { rotulo: "Contas em risco", valor: resumo.emRisco, nota: "Com alertas abertos" },
          {
            rotulo: "Convites",
            valor: data?.convites.pendentes ?? 0,
            nota: `${data?.convites.expirados ?? 0} expirados · ${data?.convites.revogados ?? 0} revogados`,
          },
        ].map((c) => (
          <div key={c.rotulo} className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">{c.rotulo}</p>
            <p className="mt-1 text-3xl font-semibold">{c.valor}</p>
            <p className="text-xs text-muted-foreground">{c.nota}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>
            Observabilidade de usuários{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({filtrados.length} registros)
            </span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!filtrados.length}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="busca-user">Busca</Label>
              <Input
                id="busca-user"
                placeholder="nome, e-mail, hospital..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Risco</Label>
              <Select
                value={risco}
                onValueChange={(v) => {
                  setRisco(v);
                  setPagina(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="ok">Saudável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select
                value={perfil}
                onValueChange={(v) => {
                  setPerfil(v);
                  setPagina(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="master_admin">Master Trizion</SelectItem>
                  <SelectItem value="hospital_admin">Admin do hospital</SelectItem>
                  <SelectItem value="operador">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Logins</TableHead>
                  <TableHead className="text-right">Falhas</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && !visiveis.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      Nenhum usuário encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : null}
                {visiveis.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email ?? "sem e-mail"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{ROTULO_ROLE[u.role] ?? u.role}</TableCell>
                    <TableCell className="text-sm">{u.hospital ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {quando(u.ultimoLogin)}
                      {u.diasSemAcesso !== null ? (
                        <span className="block text-xs text-muted-foreground">
                          há {u.diasSemAcesso} dia(s)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-sm">{u.acessos}</TableCell>
                    <TableCell className="text-right text-sm">{u.falhas}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className={RISCO_BADGE[u.risco].classe}>
                          {RISCO_BADGE[u.risco].rotulo}
                        </Badge>
                        {!u.ativo ? <Badge variant="destructive">Desativado</Badge> : null}
                        {u.alertas.slice(0, 2).map((a) => (
                          <span key={a} className="text-[11px] text-muted-foreground">
                            {a}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {filtrados.length === 0 ? 0 : (atual - 1) * POR_PAGINA + 1}–
              {Math.min(atual * POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={atual <= 1}
                onClick={() => setPagina(atual - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {atual} de {paginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={atual >= paginas}
                onClick={() => setPagina(atual + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
