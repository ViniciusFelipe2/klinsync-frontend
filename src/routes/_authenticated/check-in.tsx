import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Stethoscope, ShieldCheck, LogOut } from "lucide-react";

import { sair as encerrarSessao } from "@/lib/api/auth";
import { ModuleGuard } from "@/components/medsync/module-guard";

export const Route = createFileRoute("/_authenticated/check-in")({
  head: () => ({
    meta: [
      { title: "Centro Cirúrgico | KlinSync" },
      {
        name: "description",
        content:
          "Controle de presença médica no Centro Cirúrgico, com check-in por foto e horário oficial.",
      },
      { property: "og:title", content: "Centro Cirúrgico | KlinSync" },
      {
        property: "og:description",
        content:
          "Controle de presença médica no Centro Cirúrgico, com check-in por foto e horário oficial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckInLayout,
});

function CheckInLayout() {
  const navigate = useNavigate();

  async function sair() {
    await encerrarSessao();
    void navigate({ to: "/entrar" });
  }

  return (
    <ModuleGuard chave="checkin_cirurgioes" theme="theme-checkin">
      {(ctx) => (
        <>
          <header className="border-b border-border bg-card/80 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Stethoscope className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Centro Cirúrgico</p>
                  <p className="text-xs text-muted-foreground">Controle de presença médica</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {ctx.podeAdministrar && (
                  <Link
                    to="/check-in/painel"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ShieldCheck className="size-4" /> Administrador
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void sair()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" /> Sair
                </button>
              </div>
            </div>
          </header>
          <Outlet />
        </>
      )}
    </ModuleGuard>
  );
}
