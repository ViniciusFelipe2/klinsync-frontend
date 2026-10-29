import { createFileRoute } from "@tanstack/react-router";

import { PainelObservabilidade } from "@/components/medsync/observabilidade";

export const Route = createFileRoute("/_authenticated/master/observabilidade")({
  head: () => ({ meta: [{ title: "Observabilidade | KlinSync" }] }),
  component: PainelObservabilidade,
});
