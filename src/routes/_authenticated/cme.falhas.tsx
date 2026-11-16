import { createFileRoute } from "@tanstack/react-router";

import { RelatorioFalhas } from "@/components/cme/relatorios";

export const Route = createFileRoute("/_authenticated/cme/falhas")({
  head: () => ({ meta: [{ title: "Falhas de leitura | KlinSync" }] }),
  component: RelatorioFalhas,
});
