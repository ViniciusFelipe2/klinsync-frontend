import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useSessao } from "@/hooks/use-sessao";
import type { Papel } from "@/lib/permissoes";

/**
 * Só renderiza o conteúdo quando o papel do usuário logado está na lista.
 * Enquanto a sessão carrega (ou quando o papel não bate) nada do painel é
 * montado — evita que um operacional veja, mesmo por um instante, telas
 * administrativas.
 */
export function RoleGate({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const navigate = useNavigate();
  const { data, isLoading } = useSessao();
  const role = data?.perfil?.role as Papel | undefined;
  const permitido = !!role && papeis.includes(role);

  useEffect(() => {
    if (isLoading || !data) return;
    if (!data.perfil) {
      void navigate({ to: "/entrar", replace: true });
      return;
    }
    if (!permitido) void navigate({ to: "/app", replace: true });
  }, [data, isLoading, permitido, navigate]);

  if (isLoading || !permitido) {
    return (
      <div className="theme-medsync grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  return <>{children}</>;
}
