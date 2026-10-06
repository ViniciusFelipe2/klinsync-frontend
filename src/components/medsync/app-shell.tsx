import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { TrizionMark } from "@/components/medsync/brand";
import { RodapeTrizion } from "@/components/medsync/rodape";
import { Button } from "@/components/ui/button";
import { sair as encerrarSessao } from "@/lib/api/auth";

export type NavItem = { to: string; label: string };

/** Layout administrativo da Trizion: menu lateral fixo + área de conteúdo. */
export function AppShell({
  titulo,
  subtitulo,
  nav = [],
  children,
}: {
  titulo: string;
  subtitulo?: string;
  nav?: NavItem[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuAberto, setMenuAberto] = useState(false);

  async function sair() {
    await queryClient.cancelQueries();
    await encerrarSessao();
    queryClient.clear();
    navigate({ to: "/entrar", replace: true });
  }

  return (
    <div className="theme-medsync min-h-screen bg-background lg:flex">
      <aside className="bg-brand-gradient text-brand-foreground lg:min-h-screen lg:w-72 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <TrizionMark tom="escuro" />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-brand-foreground/60">
              KlinSync
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((v) => !v)}
              className="text-brand-foreground hover:bg-white/10 hover:text-brand-foreground lg:hidden"
            >
              {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
        <div className={menuAberto ? "block" : "hidden lg:block"}>
          <div className="px-6 pb-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 shrink-0" />
              Trizion Tech
            </p>
            <p className="mt-1 text-xs text-brand-foreground/60">Painel Master</p>
          </div>
          {nav.length > 0 ? (
            <nav className="flex flex-wrap gap-1 px-3 pb-4 lg:flex-col lg:flex-nowrap">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAberto(false)}
                  activeOptions={{ exact: item.to.split("/").length === 2 }}
                  activeProps={{ className: "bg-white/15 text-brand-foreground" }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-foreground/70 transition-colors hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="px-6 pb-6">
            <Button
              variant="ghost"
              onClick={() => void sair()}
              className="w-full justify-start text-brand-foreground hover:bg-white/10 hover:text-brand-foreground"
            >
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="border-b border-border px-6 py-6">
          <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
          {subtitulo ? <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p> : null}
        </header>
        <div className="px-6 py-6">{children}</div>
        <RodapeTrizion />
      </main>
    </div>
  );
}
