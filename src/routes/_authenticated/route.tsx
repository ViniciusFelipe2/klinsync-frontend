import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useManterSessao, useTelaSempreLigada } from "@/hooks/use-manter-sessao";
import { useSessao } from "@/hooks/use-sessao";
import { useTempoReal } from "@/hooks/use-tempo-real";
import { usuarioAtual } from "@/lib/api/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const user = await usuarioAtual();
    if (!user) throw redirect({ to: "/entrar" });
    return { user };
  },
  component: AreaAutenticada,
});

/**
 * Tudo que fica aberto por horas (tablets das salas, painel na TV) precisa de três coisas:
 * login que não cai sozinho, telas que se atualizam na hora e (nos tablets) tela que não apaga.
 */
function AreaAutenticada() {
  useManterSessao();
  const papel = useSessao().data?.perfil?.role;
  useTempoReal(papel === "hospital_admin" || papel === "operador");
  useTelaSempreLigada(papel === "operador");
  return <Outlet />;
}
