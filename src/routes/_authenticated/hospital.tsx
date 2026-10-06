import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RoleGate } from "@/components/medsync/role-gate";

export const Route = createFileRoute("/_authenticated/hospital")({
  head: () => ({
    meta: [
      { title: "Painel do Hospital | KlinSync" },
      {
        name: "description",
        content:
          "Dashboard administrativo do hospital: indicadores, relatórios por módulo, equipe e acessos.",
      },
      { property: "og:title", content: "Painel do Hospital | KlinSync" },
      {
        property: "og:description",
        content:
          "Dashboard administrativo do hospital: indicadores, relatórios por módulo, equipe e acessos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HospitalLayout,
});

function HospitalLayout() {
  return (
    <RoleGate papeis={["hospital_admin"]}>
      <Outlet />
    </RoleGate>
  );
}
