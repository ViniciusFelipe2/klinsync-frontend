import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/medsync/module-guard";
import { GiroHeader } from "@/components/giro/GiroHeader";

export const Route = createFileRoute("/_authenticated/giro-sala")({
  head: () => ({
    meta: [
      { title: "Giro de Sala | KlinSync" },
      {
        name: "description",
        content:
          "Módulo de giro de sala cirúrgica do KlinSync: cronômetros, status e indicadores por sala.",
      },
      { property: "og:title", content: "Giro de Sala | KlinSync" },
      {
        property: "og:description",
        content:
          "Acompanhe em tempo real as etapas de enfermagem e limpeza das salas cirúrgicas do seu hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Layout,
});

function Layout() {
  return (
    <ModuleGuard chave="giro_de_sala" theme="theme-giro">
      {(ctx) => (
        <>
          <GiroHeader nome={ctx.nome} role={ctx.role} podeAdministrar={ctx.podeAdministrar} />
          <Outlet />
        </>
      )}
    </ModuleGuard>
  );
}
