import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { masterDashboard } from "@/lib/api/medsync";

export const Route = createFileRoute("/_authenticated/master/")({
  component: VisaoGeral,
});

function VisaoGeral() {
  const fetcher = masterDashboard;
  const { data, isLoading } = useQuery({
    queryKey: ["master-dashboard"],
    queryFn: () => fetcher(),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const ativos = data.tenants.filter((t) => t.status === "ativo").length;
  const tentativasFalhas = data.acessos7d.filter((a) => !a.sucesso).length;

  const metricas = [
    { rotulo: "Hospitais cadastrados", valor: data.tenants.length },
    { rotulo: "Hospitais ativos", valor: ativos },
    { rotulo: "Usuários da plataforma", valor: data.usuarios.length },
    { rotulo: "Falhas de login (7d)", valor: tentativasFalhas },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((m) => (
          <Card key={m.rotulo} className="shadow-elev">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.rotulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{m.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes e módulos contratados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.tenants.map((t) => {
            const features = data.tenantFeatures
              .filter((tf) => tf.tenant_id === t.id && tf.habilitada)
              .map((tf) => data.features.find((f) => f.id === tf.feature_id)?.nome_exibicao)
              .filter(Boolean);
            const usuarios = data.usuarios.filter((u) => u.tenant_id === t.id).length;
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium">{t.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {usuarios} usuário(s) · desde{" "}
                    {new Date(t.contratado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {features.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhuma feature habilitada
                    </span>
                  ) : (
                    features.map((f) => (
                      <Badge key={f} variant="secondary">
                        {f}
                      </Badge>
                    ))
                  )}
                  <Badge variant={t.status === "ativo" ? "default" : "destructive"}>
                    {t.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
