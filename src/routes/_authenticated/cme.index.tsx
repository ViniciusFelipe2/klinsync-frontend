import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ListaCaixas } from "@/components/cme/lista-caixas";
import { acessoCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme/")({
  head: () => ({ meta: [{ title: "Caixas do CME | KlinSync" }] }),
  component: Caixas,
});

function Caixas() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  if (!acesso.data) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  return (
    <ListaCaixas
      podeEditar={acesso.data.podeEditar}
      tamanhoPadraoMm={acesso.data.config.tamanhoPadraoMm}
    />
  );
}
