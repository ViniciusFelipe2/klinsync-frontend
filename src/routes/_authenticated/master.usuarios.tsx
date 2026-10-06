import { createFileRoute } from "@tanstack/react-router";
import { REGRA_SENHA, senhaEhForte } from "@/lib/senha";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  alternarUsuarioAtivo,
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  masterDashboard,
  resetarSenha,
} from "@/lib/api/medsync";

export const Route = createFileRoute("/_authenticated/master/usuarios")({
  component: Usuarios,
});

type UsuarioEdicao = { id: string; nome: string; email: string };

function DialogoEditarUsuario({
  usuario,
  onClose,
}: {
  usuario: UsuarioEdicao | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const atualizar = atualizarUsuario;
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [chave, setChave] = useState<string | null>(null);

  if (usuario && chave !== usuario.id) {
    setChave(usuario.id);
    setNome(usuario.nome);
    setEmail(usuario.email);
  }

  const mSalvar = useMutation({
    mutationFn: () => atualizar({ data: { usuarioId: usuario!.id, nome, email } }),
    onSuccess: () => {
      toast.success("Dados do usuário atualizados. A senha continua a mesma.");
      void qc.invalidateQueries({ queryKey: ["master-usuarios"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!usuario} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Alterar o e-mail aqui já atualiza o acesso de login. A senha atual continua valendo.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mSalvar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ednome">Nome</Label>
            <Input
              id="ednome"
              required
              minLength={2}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edemail">E-mail de acesso</Label>
            <Input
              id="edemail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mSalvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Role = "master_admin" | "hospital_admin" | "operador";

function Usuarios() {
  const qc = useQueryClient();
  const fetchDash = masterDashboard;
  const fetchUsuarios = listarUsuarios;
  const criar = criarUsuario;
  const resetar = resetarSenha;
  const alternar = alternarUsuarioAtivo;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<Role>("hospital_admin");
  const [tenantId, setTenantId] = useState<string>("");
  const [featureId, setFeatureId] = useState<string>("");
  const [editando, setEditando] = useState<UsuarioEdicao | null>(null);

  const dash = useQuery({ queryKey: ["master-dashboard"], queryFn: () => fetchDash() });
  const usuarios = useQuery({ queryKey: ["master-usuarios"], queryFn: () => fetchUsuarios() });

  const mCriar = useMutation({
    mutationFn: () => {
      if (!senhaEhForte(senha)) throw new Error(REGRA_SENHA);
      return criar({
        data: {
          nome,
          email,
          senha,
          role,
          tenantId: role === "master_admin" ? null : tenantId || null,
          featureId: role === "operador" ? featureId || null : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Usuário criado.");
      setNome("");
      setEmail("");
      setSenha("");
      void qc.invalidateQueries({ queryKey: ["master-usuarios"] });
      void qc.invalidateQueries({ queryKey: ["master-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const featuresDoTenant = (dash.data?.tenantFeatures ?? [])
    .filter((tf) => tf.tenant_id === tenantId && tf.habilitada)
    .map((tf) => dash.data?.features.find((f) => f.id === tf.feature_id))
    .filter((f): f is NonNullable<typeof f> => !!f);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mCriar.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="unome">Nome</Label>
              <Input id="unome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uemail">E-mail</Label>
              <Input
                id="uemail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usenha">Senha inicial</Label>
              <Input
                id="usenha"
                required
                minLength={10}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{REGRA_SENHA}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de acesso</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_admin">Equipe KlinSync (master)</SelectItem>
                  <SelectItem value="hospital_admin">Admin do hospital</SelectItem>
                  <SelectItem value="operador">Operacional (1 login por feature)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== "master_admin" ? (
              <div className="space-y-1.5">
                <Label>Hospital</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {(dash.data?.tenants ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {role === "operador" ? (
              <div className="space-y-1.5">
                <Label>Feature deste login</Label>
                <Select value={featureId} onValueChange={setFeatureId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {featuresDoTenant.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_exibicao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O vínculo com a feature é permanente para este login.
                </p>
              </div>
            ) : null}
            <Button type="submit" disabled={mCriar.isPending} className="w-full">
              Criar usuário
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários da plataforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(usuarios.data ?? []).map((u) => {
            const hospital = dash.data?.tenants.find((t) => t.id === u.tenant_id)?.nome;
            const feature = dash.data?.features.find((f) => f.id === u.feature_id)?.nome_exibicao;
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium">
                    {u.nome} <span className="text-muted-foreground">· {u.email}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{u.role}</Badge>
                    {hospital ? <span>{hospital}</span> : <span>Plataforma</span>}
                    {feature ? <span>· {feature}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditando({ id: u.id, nome: u.nome, email: u.email ?? "" })}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nova = window.prompt(REGRA_SENHA);
                      if (!nova) return;
                      if (!senhaEhForte(nova)) {
                        toast.error(REGRA_SENHA);
                        return;
                      }
                      void resetar({ data: { usuarioId: u.id, senha: nova } })
                        .then(() => toast.success("Senha redefinida."))
                        .catch((e: Error) => toast.error(e.message));
                    }}
                  >
                    Resetar senha
                  </Button>
                  <Button
                    size="sm"
                    variant={u.ativo ? "destructive" : "default"}
                    onClick={() => {
                      void alternar({ data: { usuarioId: u.id, ativo: !u.ativo } })
                        .then(() => {
                          toast.success(u.ativo ? "Usuário desativado." : "Usuário ativado.");
                          void qc.invalidateQueries({ queryKey: ["master-usuarios"] });
                        })
                        .catch((e: Error) => toast.error(e.message));
                    }}
                  >
                    {u.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <DialogoEditarUsuario usuario={editando} onClose={() => setEditando(null)} />
    </div>
  );
}
