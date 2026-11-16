import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { IdCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AlertaAvaliacao, SeloSituacao } from "@/components/cme/data-matrix";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROTULO_PERFIL,
  alterarSituacaoColaborador,
  listarColaboradores,
  salvarColaborador,
  type Colaborador,
  type PerfilColaborador,
} from "@/lib/api/cme";

type Formulario = { id?: string; nome: string; numeroCracha: string; perfil: PerfilColaborador };
const VAZIO: Formulario = { nome: "", numeroCracha: "", perfil: "sala" };

function FormularioColaborador({
  inicial,
  aoTerminar,
}: {
  inicial: Formulario;
  aoTerminar: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState(inicial);
  const [base, setBase] = useState(inicial);
  if (inicial !== base) {
    setBase(inicial);
    setF(inicial);
  }

  const salvar = useMutation({
    mutationFn: () => salvarColaborador(f),
    onSuccess: (c) => {
      toast.success(
        f.id ? "Cadastro atualizado." : `${c.nome} cadastrado. O crachá já pode ser impresso.`,
      );
      void qc.invalidateQueries({ queryKey: ["cme-colaboradores"] });
      aoTerminar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{f.id ? "Editar colaborador" : "Novo colaborador"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="colab-nome">Nome completo</Label>
            <Input
              id="colab-nome"
              required
              minLength={3}
              value={f.nome}
              onChange={(e) => setF((v) => ({ ...v, nome: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colab-cracha">Número do crachá</Label>
            <Input
              id="colab-cracha"
              required
              minLength={4}
              maxLength={30}
              autoComplete="off"
              className="font-mono uppercase"
              value={f.numeroCracha}
              onChange={(e) => setF((v) => ({ ...v, numeroCracha: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              De 4 a 30 letras, números ou hífen. É o que vai dentro do Data Matrix do crachá.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Equipe</Label>
            <Select
              value={f.perfil}
              onValueChange={(v) => setF((x) => ({ ...x, perfil: v as PerfilColaborador }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sala">{ROTULO_PERFIL.sala}</SelectItem>
                <SelectItem value="cme">{ROTULO_PERFIL.cme}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={salvar.isPending} className="flex-1">
              {f.id ? "Salvar" : "Cadastrar"}
            </Button>
            {f.id ? (
              <Button type="button" variant="outline" onClick={aoTerminar}>
                Cancelar
              </Button>
            ) : null}
          </div>
          {f.id ? (
            <p className="text-xs text-muted-foreground">
              Se mudar o número do crachá, o crachá antigo para de funcionar e é preciso imprimir
              outro.
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

/** Colaboradores com crachá. Sem `podeEditar`, só a lista (administração do hospital). */
export function ListaColaboradores({ podeEditar }: { podeEditar: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [inativos, setInativos] = useState(false);
  const [editando, setEditando] = useState<Formulario>(VAZIO);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const q = useQuery({
    queryKey: ["cme-colaboradores", busca, inativos],
    queryFn: () => listarColaboradores({ busca, inativos }),
  });
  const linhas = q.data?.linhas ?? [];
  const bloqueado = linhas.find(
    (c) => selecionados.has(c.id) && c.avaliacao.situacao === "bloqueado",
  );

  const situacao = useMutation({
    mutationFn: alterarSituacaoColaborador,
    onSuccess: (_r, v) => {
      toast.success(
        v.ativo ? "Crachá reativado." : "Crachá desativado: ele não entra mais na sala.",
      );
      setSelecionados((s) => {
        const n = new Set(s);
        n.delete(v.id);
        return n;
      });
      void qc.invalidateQueries({ queryKey: ["cme-colaboradores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = (id: string, marcar: boolean) =>
    setSelecionados((s) => {
      const n = new Set(s);
      if (marcar) n.add(id);
      else n.delete(id);
      return n;
    });

  const editar = (c: Colaborador) =>
    setEditando({ id: c.id, nome: c.nome, numeroCracha: c.numero_cracha, perfil: c.perfil });

  const tabela = (
    <Card className="min-w-0">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Colaboradores ({linhas.length})</CardTitle>
          {podeEditar ? (
            <Button
              disabled={selecionados.size === 0 || !!bloqueado}
              onClick={() =>
                void navigate({
                  to: "/cme/impressao",
                  search: {
                    ids: [...selecionados].join(","),
                    tamanho: q.data?.tamanhoMm ?? 12,
                    crachas: true,
                  },
                })
              }
            >
              <IdCard className="size-4" aria-hidden="true" /> Imprimir crachás ({selecionados.size}
              )
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="busca-colab">Buscar por nome ou número do crachá</Label>
            <Input id="busca-colab" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <Checkbox checked={inativos} onCheckedChange={(v) => setInativos(v === true)} />
            Mostrar inativos
          </label>
        </div>
        {bloqueado ? <AlertaAvaliacao avaliacao={bloqueado.avaliacao} /> : null}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {q.isLoading ? "Carregando..." : "Nenhum colaborador cadastrado."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                {podeEditar ? <th className="w-8 px-2 py-2" /> : null}
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">Crachá</th>
                <th className="px-2 py-2">Equipe</th>
                <th className="px-2 py-2">Código do crachá</th>
                <th className="px-2 py-2">Situação</th>
                {podeEditar ? <th className="px-2 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {linhas.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b last:border-0 ${c.ativo ? "" : "text-muted-foreground"}`}
                >
                  {podeEditar ? (
                    <td className="px-2 py-2">
                      <Checkbox
                        aria-label={`Selecionar ${c.nome}`}
                        checked={selecionados.has(c.id)}
                        disabled={!c.ativo}
                        onCheckedChange={(v) => alternar(c.id, v === true)}
                      />
                    </td>
                  ) : null}
                  <td className="px-2 py-2 font-medium">{c.nome}</td>
                  <td className="px-2 py-2 font-mono">{c.numero_cracha}</td>
                  <td className="px-2 py-2">{ROTULO_PERFIL[c.perfil]}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <SeloSituacao avaliacao={c.avaliacao} />
                  </td>
                  <td className="px-2 py-2">{c.ativo ? "Ativo" : "Inativo"}</td>
                  {podeEditar ? (
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => editar(c)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            !c.ativo ||
                            window.confirm(
                              `Desativar o crachá de ${c.nome}? Ele não entra mais na sala.`,
                            )
                          ) {
                            situacao.mutate({ id: c.id, ativo: !c.ativo });
                          }
                        }}
                      >
                        {c.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );

  if (!podeEditar) return tabela;
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <FormularioColaborador inicial={editando} aoTerminar={() => setEditando(VAZIO)} />
      {tabela}
    </div>
  );
}
