import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import logoKlinsync from "@/assets/klinsync-logo.svg";

/** Marca KlinSync. Use tom="escuro" sobre fundos escuros (headers/sidebars). */
export function TrizionMark({
  className = "",
  tom = "claro",
}: {
  className?: string;
  tom?: "claro" | "escuro";
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src={logoKlinsync}
        alt="KlinSync"
        width={1010}
        height={300}
        className={`h-9 w-auto object-contain ${tom === "escuro" ? "brightness-0 invert" : ""}`}
      />
    </span>
  );
}

export function BrandShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-medsync flex min-h-screen flex-col bg-brand-gradient text-brand-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <TrizionMark tom="escuro" />
          <nav className="flex items-center gap-6 text-sm text-brand-foreground/70">
            <span className="hidden sm:inline">Tecnologia para centros cirúrgicos</span>
            <Link
              to="/"
              className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10"
            >
              Site Trizion
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">{children}</main>
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-brand-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Sistema desenvolvido por: Trizion Technology LTDA — todos os direitos reservados.
          </span>
          <span>Acesso monitorado e registrado por segurança</span>
        </div>
      </footer>
    </div>
  );
}
