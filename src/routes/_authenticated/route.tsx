import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { usuarioAtual } from "@/lib/api/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const user = await usuarioAtual();
    if (!user) throw redirect({ to: "/entrar" });
    return { user };
  },
  component: () => <Outlet />,
});
