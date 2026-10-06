import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/medsync/app-shell";
import { RoleGate } from "@/components/medsync/role-gate";

export const Route = createFileRoute("/_authenticated/master")({
  head: () => ({
    meta: [
      { title: "Painel Master | KlinSync" },
      {
        name: "description",
        content: "Gestão de hospitais, usuários, features contratadas e segurança da plataforma.",
      },
      { property: "og:title", content: "Painel Master | KlinSync" },
      {
        property: "og:description",
        content: "Gestão de hospitais, usuários, features contratadas e segurança da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MasterLayout,
});

function MasterLayout() {
  return (
    <RoleGate papeis={["master_admin"]}>
      <AppShell
        titulo="Painel Trizion"
        subtitulo="Controle da plataforma KlinSync — hospitais, features e acessos"
        nav={[
          { to: "/master", label: "Visão geral" },
          { to: "/master/hospitais", label: "Hospitais e features" },
          { to: "/master/features", label: "Features" },
          { to: "/master/usuarios", label: "Usuários" },
          { to: "/master/convites", label: "Convites" },
          { to: "/master/permissoes", label: "Permissões" },
          { to: "/master/auditoria", label: "Segurança e auditoria" },
          { to: "/master/mfa", label: "Verificação em 2 etapas" },
        ]}
      >
        <Outlet />
      </AppShell>
    </RoleGate>
  );
}
