import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { HospitalShell } from "@/components/medsync/hospital-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { salasDoHospital, salvarSalaDoHospital } from "@/lib/api/hospital";
import { statusLabel } from "@/lib/giro";

export const Route = createFileRoute("/_authenticated/hospital/salas")({
  head: () => ({
    meta: [
      { title: "Salas cirúrgicas | KlinSync" },
      { name: "description", content: "Cadastro e ativação das salas cirúrgicas do hospital." },
      { property: "og:title", content: "Salas cirúrgicas | KlinSync" },
      {
        property: "og:description",
        content: "Cadastro e ativação das salas cirúrgicas do hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalasHospital,
});

function SalasHospital() {
  const qc = useQueryClient();
  const listar = salasDoHospital;
  const salvar = salvarSalaDoHospital;

  const salas = useQuery({ queryKey: ["hospital-salas"], queryFn: () => listar() });

  const mSalvar = useMutation({
    mutationFn: (v: { id?: string; nome: string; ativa: boolean }) => salvar({ data: v }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hospital-salas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <HospitalShell titulo="Salas" subtitulo="Salas cirúrgicas contratadas com a Trizion Tech">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Cadastro de salas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O cadastro de salas cirúrgicas é exclusivo da administração Trizion Tech, conforme o
              limite contratado. Para incluir ou remover uma sala, solicite à equipe Trizion.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salas cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(salas.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada ainda.</p>
            ) : (
              (salas.data ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(s.status_atual as never, false)}
                      {s.cirurgia_atual ? ` · ${s.cirurgia_atual}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={s.ativa ? "default" : "secondary"}>
                      {s.ativa ? "ativa" : "inativa"}
                    </Badge>
                    <Switch
                      checked={s.ativa}
                      onCheckedChange={(v) => mSalvar.mutate({ id: s.id, nome: s.nome, ativa: v })}
                    />
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
