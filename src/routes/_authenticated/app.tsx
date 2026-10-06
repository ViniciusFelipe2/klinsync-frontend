import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { sair } from "@/lib/api/auth";
import { resolverDestinoInicial } from "@/lib/api/medsync";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Redirecionando | KlinSync" },
      { name: "description", content: "Direcionando você ao painel correto do KlinSync." },
      { property: "og:title", content: "Redirecionando | KlinSync" },
      { property: "og:description", content: "Direcionando você ao painel correto do KlinSync." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Redirecionador,
});

function Redirecionador() {
  const navigate = useNavigate();
  const resolver = resolverDestinoInicial;
  // O servidor decide o destino; o cliente só navega para a rota recebida.
  const { data } = useQuery({
    queryKey: ["destino-inicial"],
    queryFn: () => resolver(),
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    if (!data.destino) {
      void sair().then(() => navigate({ to: "/entrar", replace: true }));
      return;
    }
    void navigate({ to: data.destino as never, replace: true });
  }, [data, navigate]);

  return (
    <div className="theme-medsync grid min-h-screen place-items-center bg-brand-gradient text-brand-foreground">
      <p className="text-sm">Carregando seu painel...</p>
    </div>
  );
}
