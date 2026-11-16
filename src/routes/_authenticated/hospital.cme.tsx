import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ListaCaixas } from "@/components/cme/lista-caixas";
import { ListaColaboradores } from "@/components/cme/lista-colaboradores";
import { RelatorioFalhas, ResumoTestes } from "@/components/cme/relatorios";
import { HospitalShell } from "@/components/medsync/hospital-shell";
import { acessoCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/hospital/cme")({
  head: () => ({ meta: [{ title: "CME | KlinSync" }] }),
  component: CmeHospital,
});

/** Acompanhamento da administração: somente leitura. O servidor recusa qualquer alteração deste perfil. */
function CmeHospital() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });

  return (
    <HospitalShell titulo="CME" subtitulo="Acompanhamento do que o CME cadastrou (somente leitura)">
      {acesso.isError ? (
        <p className="text-sm text-muted-foreground">{acesso.error.message}</p>
      ) : !acesso.data ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          <ListaCaixas podeEditar={false} tamanhoPadraoMm={acesso.data.config.tamanhoPadraoMm} />
          <ListaColaboradores podeEditar={false} />
          <RelatorioFalhas />
          <ResumoTestes />
        </div>
      )}
    </HospitalShell>
  );
}
