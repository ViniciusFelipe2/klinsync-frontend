import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ListaColaboradores } from "@/components/cme/lista-colaboradores";
import { acessoCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores do CME | KlinSync" }] }),
  component: Colaboradores,
});

function Colaboradores() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  if (!acesso.data) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  return <ListaColaboradores podeEditar={acesso.data.podeEditar} />;
}
