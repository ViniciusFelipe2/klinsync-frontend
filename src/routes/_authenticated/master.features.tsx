import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { alternarFeature, masterDashboard } from "@/lib/api/medsync";

export const Route = createFileRoute("/_authenticated/master/features")({
  component: Features,
});

type Pendente = {
  tenantId: string;
  featureId: string;
  hospital: string;
  feature: string;
  afetados: number;
};

function Features() {
  const qc = useQueryClient();
  const fetcher = masterDashboard;
  const toggle = alternarFeature;
  const [pendente, setPendente] = useState<Pendente | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["master-dashboard"],
    queryFn: () => fetcher(),
  });

  const mToggle = useMutation({
    mutationFn: (v: { tenantId: string; featureId: string; habilitada: boolean }) =>
      toggle({ data: v }),
    onSuccess: () => {
      toast.success("Feature atualizada.");
      void qc.invalidateQueries({ queryKey: ["master-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["auditoria"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const ativa = (tenantId: string, featureId: string) =>
    data.tenantFeatures.find((tf) => tf.tenant_id === tenantId && tf.feature_id === featureId)
      ?.habilitada ?? false;

  const operadoresDe = (tenantId: string, featureId: string) =>
    data.usuarios.filter(
      (u) =>
        u.tenant_id === tenantId && u.feature_id === featureId && u.role === "operador" && u.ativo,
    ).length;

  function aoAlternar(
    tenantId: string,
    featureId: string,
    hospital: string,
    feature: string,
    valor: boolean,
  ) {
    if (valor) {
      mToggle.mutate({ tenantId, featureId, habilitada: true });
      return;
    }
    setPendente({
      tenantId,
      featureId,
      hospital,
      feature,
      afetados: operadoresDe(tenantId, featureId),
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.features.map((f) => {
          const contratos = data.tenantFeatures.filter((tf) => tf.feature_id === f.id);
          const ativos = contratos.filter((tf) => tf.habilitada).length;
          return (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{f.nome_exibicao}</CardTitle>
                  <Badge variant={ativos ? "default" : "outline"}>
                    {ativos} ativo{ativos === 1 ? "" : "s"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.descricao}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{f.chave}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {contratos.length} hospital(is) com registro de contrato · {data.tenants.length}{" "}
                  hospital(is) na plataforma
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status por hospital</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Hospital</th>
                {data.features.map((f) => (
                  <th key={f.id} className="py-2 pr-4 font-medium">
                    {f.nome_exibicao}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.status}</p>
                  </td>
                  {data.features.map((f) => (
                    <td key={f.id} className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ativa(t.id, f.id)}
                          onCheckedChange={(v) =>
                            aoAlternar(t.id, f.id, t.nome, f.nome_exibicao, v)
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {operadoresDe(t.id, f.id)} login(s)
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {!data.tenants.length ? (
                <tr>
                  <td
                    className="py-4 text-sm text-muted-foreground"
                    colSpan={data.features.length + 1}
                  >
                    Nenhum hospital cadastrado ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendente} onOpenChange={(o) => !o && setPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {pendente?.feature}?</AlertDialogTitle>
            <AlertDialogDescription>
              O módulo deixa de abrir imediatamente para {pendente?.hospital}.{" "}
              {pendente?.afetados
                ? `${pendente.afetados} login(s) operacional(is) serão afetados.`
                : "Nenhum login operacional está vinculado a esta feature."}{" "}
              Os dados históricos são preservados e tudo volta ao normal se você reativar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendente) return;
                mToggle.mutate({
                  tenantId: pendente.tenantId,
                  featureId: pendente.featureId,
                  habilitada: false,
                });
                setPendente(null);
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
