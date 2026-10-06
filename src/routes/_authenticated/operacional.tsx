import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/medsync/app-shell";
import { RoleGate } from "@/components/medsync/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessao } from "@/hooks/use-sessao";
import { FEATURE_ROTAS } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/operacional")({
  head: () => ({
    meta: [
      { title: "Área Operacional | KlinSync" },
      {
        name: "description",
        content: "Acesso operacional ao módulo contratado do centro cirúrgico do seu hospital.",
      },
      { property: "og:title", content: "Área Operacional | KlinSync" },
      {
        property: "og:description",
        content: "Acesso operacional ao módulo contratado do centro cirúrgico do seu hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Operacional,
});

/**
 * O login operacional não escolhe módulo: entra direto naquele definido pelo
 * hospital ou pela Trizion. Esta tela só aparece quando nenhum módulo está
 * liberado para o login.
 */
function Operacional() {
  const navigate = useNavigate();
  const { data, isLoading } = useSessao();

  useEffect(() => {
    if (isLoading || !data) return;
    if (!data.perfil) {
      void navigate({ to: "/entrar", replace: true });
      return;
    }
    const chave = data.features?.[0]?.chave;
    const rota = chave ? FEATURE_ROTAS[chave] : undefined;
    if (rota) void navigate({ to: rota as never, replace: true });
  }, [data, isLoading, navigate]);

  const semModulo = !isLoading && (data?.features ?? []).length === 0;

  return (
    <RoleGate papeis={["operador"]}>
      <AppShell titulo={data?.tenant?.nome ?? "Área operacional"} subtitulo="Acesso ao seu módulo">
        {semModulo ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum módulo liberado</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Este login ainda não está vinculado a uma feature habilitada. Fale com o administrador
              do hospital.
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Abrindo seu módulo...</p>
        )}
      </AppShell>
    </RoleGate>
  );
}
