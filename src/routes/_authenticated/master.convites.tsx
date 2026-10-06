import { createFileRoute } from "@tanstack/react-router";
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
import { criarConvite, listarConvites, regerarConvite, revogarConvite } from "@/lib/api/convites";
import { masterDashboard } from "@/lib/api/medsync";

export const Route = createFileRoute("/_authenticated/master/convites")({
  component: Convites,
});

type Role = "master_admin" | "hospital_admin" | "operador";

function statusDoConvite(c: {
  aceito_em: string | null;
  revogado_em: string | null;
  expira_em: string;
}) {
  if (c.aceito_em) return { rotulo: "Aceito", variante: "default" as const };
  if (c.revogado_em) return { rotulo: "Revogado", variante: "outline" as const };
  if (new Date(c.expira_em).getTime() < Date.now())
    return { rotulo: "Expirado", variante: "destructive" as const };
  return { rotulo: "Pendente", variante: "secondary" as const };
}

function Convites() {
  const qc = useQueryClient();
  const fetchDash = masterDashboard;
  const fetchConvites = listarConvites;
  const criar = criarConvite;
  const regerar = regerarConvite;
  const revogar = revogarConvite;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("hospital_admin");
  const [tenantId, setTenantId] = useState("");
  const [featureId, setFeatureId] = useState("");
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);

  const dash = useQuery({ queryKey: ["master-dashboard"], queryFn: () => fetchDash() });
  const convites = useQuery({ queryKey: ["convites"], queryFn: () => fetchConvites() });

  const linkDe = (token: string) => `${window.location.origin}/convite/${token}`;

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Link copiado.");
    } catch {
      toast.info(texto);
    }
  }

  const mCriar = useMutation({
    mutationFn: () =>
      criar({
        data: {
          nome,
          email,
          role,
          tenantId: role === "master_admin" ? null : tenantId || null,
          featureId: role === "operador" ? featureId || null : null,
        },
      }),
    onSuccess: async (r) => {
      const link = linkDe(r.token);
      setUltimoLink(link);
      setNome("");
      setEmail("");
      await copiar(link);
      void qc.invalidateQueries({ queryKey: ["convites"] });
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
          <CardTitle>Novo convite</CardTitle>
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
              <Label htmlFor="cnome">Nome</Label>
              <Input id="cnome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cemail">E-mail</Label>
              <Input
                id="cemail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de acesso</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_admin">Equipe Trizion (master)</SelectItem>
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
              </div>
            ) : null}
            <Button type="submit" disabled={mCriar.isPending} className="w-full">
              Gerar link de convite
            </Button>
            <p className="text-xs text-muted-foreground">
              O link vale por 7 dias e só pode ser usado uma vez. O convidado define a própria
              senha.
            </p>
          </form>

          {ultimoLink ? (
            <div className="mt-4 space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Link gerado
              </p>
              <p className="break-all font-mono text-xs">{ultimoLink}</p>
              <Button size="sm" variant="outline" onClick={() => void copiar(ultimoLink)}>
                Copiar novamente
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!(convites.data ?? []).length ? (
            <p className="text-sm text-muted-foreground">Nenhum convite gerado ainda.</p>
          ) : null}
          {(convites.data ?? []).map((c) => {
            const st = statusDoConvite(c);
            const hospital = dash.data?.tenants.find((t) => t.id === c.tenant_id)?.nome;
            const feature = dash.data?.features.find((f) => f.id === c.feature_id)?.nome_exibicao;
            const pendente = !c.aceito_em && !c.revogado_em;
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium">
                    {c.nome} <span className="text-muted-foreground">· {c.email}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={st.variante}>{st.rotulo}</Badge>
                    <Badge variant="outline">{c.role}</Badge>
                    {hospital ? <span>{hospital}</span> : <span>Plataforma</span>}
                    {feature ? <span>· {feature}</span> : null}
                    <span>· expira {new Date(c.expira_em).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                {pendente ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void regerar({ data: { conviteId: c.id } })
                          .then(async (r) => {
                            await copiar(linkDe(r.token));
                            void qc.invalidateQueries({ queryKey: ["convites"] });
                          })
                          .catch((e: Error) => toast.error(e.message));
                      }}
                    >
                      Novo link
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        void revogar({ data: { conviteId: c.id } })
                          .then(() => {
                            toast.success("Convite revogado.");
                            void qc.invalidateQueries({ queryKey: ["convites"] });
                          })
                          .catch((e: Error) => toast.error(e.message));
                      }}
                    >
                      Revogar
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
