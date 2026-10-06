import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, LogOut } from "lucide-react";
import { sair as encerrarSessao } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

export function GiroHeader({
  nome,
  role,
  podeAdministrar,
}: {
  nome: string | null;
  role: string | null;
  podeAdministrar: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const sair = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await encerrarSessao();
    void navigate({ to: "/entrar", replace: true });
  };

  const linkCls = (ativo: boolean) =>
    `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
      ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 font-display text-base font-bold sm:text-lg">
          <Activity className="size-5 shrink-0 text-primary sm:size-6" aria-hidden="true" />
          <span className="truncate">Giro de Sala</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link to="/giro-sala" className={linkCls(pathname === "/giro-sala")}>
            Operacional
          </Link>
          {podeAdministrar ? (
            <Link to="/giro-sala/admin" className={linkCls(pathname === "/giro-sala/admin")}>
              Painel Administrativo
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-semibold">{nome}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {role ?? "sem papel"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => void sair()}>
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
