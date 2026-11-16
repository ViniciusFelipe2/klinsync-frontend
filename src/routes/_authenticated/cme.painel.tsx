import { createFileRoute } from "@tanstack/react-router";

import { PainelCme } from "@/components/cme/painel";

export const Route = createFileRoute("/_authenticated/cme/painel")({
  head: () => ({ meta: [{ title: "Painel do CME | KlinSync" }] }),
  component: PainelCme,
});
