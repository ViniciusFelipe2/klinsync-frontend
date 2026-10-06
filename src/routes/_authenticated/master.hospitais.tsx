import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import {
  alternarFeature,
  excluirSalaMaster,
  masterDashboard,
  salasDoTenantMaster,
  salvarHospital,
  salvarSalaMaster,
} from "@/lib/api/medsync";

export const Route = createFileRoute("/_authenticated/master/hospitais")({
  component: Hospitais,
});

type Form = {
  id: string | null;
  nome: string;
  cnpj: string;
  endereco: string;
  contato_nome: string;
  contato_email: string;
  contato_telefone: string;
  status: "ativo" | "inativo" | "inadimplente";
  limite_salas: string;
};

const vazio: Form = {
  id: null,
  nome: "",
  cnpj: "",
  endereco: "",
  contato_nome: "",
  contato_email: "",
  contato_telefone: "",
  status: "ativo",
  limite_salas: "",
};

function Hospitais() {
  const qc = useQueryClient();
  const fetcher = masterDashboard;
  const salvar = salvarHospital;
  const toggle = alternarFeature;
  const [form, setForm] = useState<Form>(vazio);

  const { data, isLoading } = useQuery({
    queryKey: ["master-dashboard"],
    queryFn: () => fetcher(),
  });

  const mSalvar = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          id: form.id,
          nome: form.nome,
          cnpj: form.cnpj || null,
          endereco: form.endereco || null,
          contato_nome: form.contato_nome || null,
          contato_email: form.contato_email || null,
          contato_telefone: form.contato_telefone || null,
          status: form.status,
          limite_salas: form.limite_salas ? Number(form.limite_salas) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Hospital salvo.");
      setForm(vazio);
      void qc.invalidateQueries({ queryKey: ["master-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mToggle = useMutation({
    mutationFn: (v: { tenantId: string; featureId: string; habilitada: boolean }) =>
      toggle({ data: v }),
    onSuccess: () => {
      toast.success("Feature atualizada.");
      void qc.invalidateQueries({ queryKey: ["master-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{form.id ? "Editar hospital" : "Novo hospital"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mSalvar.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contato">Contato responsável</Label>
              <Input
                id="contato"
                value={form.contato_nome}
                onChange={(e) => setForm({ ...form, contato_nome: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cemail">E-mail</Label>
                <Input
                  id="cemail"
                  value={form.contato_email}
                  onChange={(e) => setForm({ ...form, contato_email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ctel">Telefone</Label>
                <Input
                  id="ctel"
                  value={form.contato_telefone}
                  onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Form["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="limite">Limite de salas (Giro de Sala)</Label>
              <Input
                id="limite"
                type="number"
                min={1}
                placeholder="Sem limite"
                value={form.limite_salas}
                onChange={(e) => setForm({ ...form, limite_salas: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Só se aplica quando o hospital contrata o módulo Giro de Sala. Em branco = sem
                limite.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mSalvar.isPending}>
                Salvar
              </Button>
              {form.id ? (
                <Button type="button" variant="outline" onClick={() => setForm(vazio)}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {data.tenants.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{t.nome}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.cnpj ?? "sem CNPJ"} · {t.status} · {t.contato_nome ?? "sem contato"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Limite de salas:{" "}
                  {(t as { limite_salas: number | null }).limite_salas ?? "sem limite"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <GerenciadorSalas tenantId={t.id} nomeHospital={t.nome} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      id: t.id,
                      nome: t.nome,
                      cnpj: t.cnpj ?? "",
                      endereco: t.endereco ?? "",
                      contato_nome: t.contato_nome ?? "",
                      contato_email: t.contato_email ?? "",
                      contato_telefone: t.contato_telefone ?? "",
                      status: t.status as Form["status"],
                      limite_salas: String(
                        (t as { limite_salas: number | null }).limite_salas ?? "",
                      ),
                    })
                  }
                >
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Features contratadas
              </p>
              {data.features.map((f) => {
                const habilitada =
                  data.tenantFeatures.find((tf) => tf.tenant_id === t.id && tf.feature_id === f.id)
                    ?.habilitada ?? false;
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{f.nome_exibicao}</p>
                      <p className="text-xs text-muted-foreground">{f.descricao}</p>
                    </div>
                    <Switch
                      checked={habilitada}
                      onCheckedChange={(v) =>
                        mToggle.mutate({ tenantId: t.id, featureId: f.id, habilitada: v })
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GerenciadorSalas({ tenantId, nomeHospital }: { tenantId: string; nomeHospital: string }) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [novaSala, setNovaSala] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");

  const listar = salasDoTenantMaster;
  const salvar = salvarSalaMaster;
  const excluir = excluirSalaMaster;

  const salas = useQuery({
    queryKey: ["master-salas", tenantId],
    queryFn: () => listar({ data: { tenantId } }),
    enabled: aberto,
  });

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["master-salas", tenantId] });
    void qc.invalidateQueries({ queryKey: ["master-dashboard"] });
  };

  const mSalvar = useMutation({
    mutationFn: (v: { id?: string; nome: string; ativa: boolean }) =>
      salvar({ data: { tenantId, ...v } }),
    onSuccess: () => {
      toast.success("Sala salva.");
      setNovaSala("");
      setEditandoId(null);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { tenantId, id } }),
    onSuccess: () => {
      toast.success("Sala removida.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = salas.data?.salas ?? [];
  const limite = salas.data?.limite ?? null;
  const atingiuLimite = limite != null && lista.length >= limite;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Gerenciar salas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Salas cirúrgicas · {nomeHospital}</DialogTitle>
          <DialogDescription>
            {limite == null
              ? "Sem limite contratado. Cadastre as salas do Giro de Sala."
              : `${lista.length} de ${limite} sala(s) do limite contratado.`}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!novaSala.trim()) return;
            mSalvar.mutate({ nome: novaSala.trim(), ativa: true });
          }}
        >
          <Input
            placeholder="Nome da sala (ex.: Sala 01)"
            value={novaSala}
            maxLength={60}
            onChange={(e) => setNovaSala(e.target.value)}
          />
          <Button type="submit" disabled={mSalvar.isPending || atingiuLimite}>
            Adicionar
          </Button>
        </form>
        {atingiuLimite ? (
          <p className="text-xs text-destructive">
            Limite de salas atingido. Aumente o limite do hospital para cadastrar mais.
          </p>
        ) : null}

        <div className="space-y-2">
          {salas.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando salas...</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada ainda.</p>
          ) : (
            lista.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                {editandoId === s.id ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      mSalvar.mutate({ id: s.id, nome: nomeEditado.trim(), ativa: s.ativa });
                    }}
                  >
                    <Input
                      value={nomeEditado}
                      maxLength={60}
                      autoFocus
                      onChange={(e) => setNomeEditado(e.target.value)}
                    />
                    <Button type="submit" size="sm" disabled={mSalvar.isPending}>
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditandoId(null)}
                    >
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium">{s.nome}</p>
                      <p className="text-xs text-muted-foreground">{s.status_atual}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.ativa ? "default" : "secondary"}>
                        {s.ativa ? "ativa" : "inativa"}
                      </Badge>
                      <Switch
                        checked={s.ativa}
                        onCheckedChange={(v) =>
                          mSalvar.mutate({ id: s.id, nome: s.nome, ativa: v })
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditandoId(s.id);
                          setNomeEditado(s.nome);
                        }}
                      >
                        Renomear
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        disabled={mExcluir.isPending}
                        onClick={() => mExcluir.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
