import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { HospitalShell } from "@/components/medsync/hospital-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usuariosDoMeuHospital } from "@/lib/api/medsync";
import { resumoHospital } from "@/lib/api/hospital";

export const Route = createFileRoute("/_authenticated/hospital/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe do Hospital | KlinSync" },
      { name: "description", content: "Logins operacionais do hospital e o módulo de cada um." },
      { property: "og:title", content: "Equipe do Hospital | KlinSync" },
      {
        property: "og:description",
        content: "Logins operacionais do hospital e o módulo de cada um.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipeHospital,
});

function EquipeHospital() {
  const fetchUsuarios = usuariosDoMeuHospital;
  const fetchResumo = resumoHospital;

  const usuarios = useQuery({ queryKey: ["hospital-usuarios"], queryFn: () => fetchUsuarios() });
  const resumo = useQuery({ queryKey: ["hospital-resumo"], queryFn: () => fetchResumo() });
  const features = resumo.data?.features ?? [];

  const nomeFeature = (id: string | null) =>
    features.find((f) => f.id === id)?.nome_exibicao ?? "—";

  return (
    <HospitalShell titulo="Equipe" subtitulo="Logins operacionais vinculados a cada módulo">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de equipe operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              A criação de logins operacionais dos módulos é exclusiva da administração Trizion
              Tech. Para incluir, alterar ou remover um acesso, solicite à equipe Trizion.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do hospital</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(usuarios.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
            ) : (
              (usuarios.data ?? []).map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.email} · {nomeFeature(u.feature_id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{u.role}</Badge>
                    <Badge variant={u.ativo ? "default" : "destructive"}>
                      {u.ativo ? "ativo" : "inativo"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </HospitalShell>
  );
}
