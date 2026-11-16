import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, ScanLine } from "lucide-react";
import { useEffect } from "react";

import { ModuleGuard } from "@/components/medsync/module-guard";
import { Button } from "@/components/ui/button";
import { sair as encerrarSessao } from "@/lib/api/auth";
import { acessoCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme")({
  head: () => ({
    meta: [
      { title: "CME | KlinSync" },
      {
        name: "description",
        content: "Caixas, itens, colaboradores e rastreabilidade do CME.",
      },
    ],
  }),
  component: Layout,
});

function Layout() {
  return (
    <ModuleGuard chave="cme" theme="theme-medsync">
      {(ctx) => <Conteudo nome={ctx.nome} />}
    </ModuleGuard>
  );
}

function Conteudo({ nome }: { nome: string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  const tipo = acesso.data?.tipo;
  // Os computadores da sala e do CME só têm uma tela cada.
  const telaUnica =
    tipo === "estacao_sala" ? "/cme/sala" : tipo === "estacao_cme" ? "/cme/operacao" : null;
  const ehSala = telaUnica !== null;

  useEffect(() => {
    if (telaUnica && pathname !== telaUnica) void navigate({ to: telaUnica, replace: true });
  }, [telaUnica, pathname, navigate]);

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
    <>
      <header className="border-b bg-card print:hidden">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <ScanLine className="size-5 text-primary" aria-hidden="true" /> CME
          </div>
          {ehSala ? (
            <span className="text-sm font-medium text-muted-foreground">
              {tipo === "estacao_cme"
                ? "Computador do CME"
                : `Computador da ${acesso.data?.sala?.nome}`}
            </span>
          ) : (
            <nav className="flex flex-wrap items-center gap-1">
              <Link to="/cme/painel" className={linkCls(pathname === "/cme/painel")}>
                Painel
              </Link>
              <Link to="/cme" className={linkCls(pathname === "/cme")}>
                Caixas
              </Link>
              <Link to="/cme/colaboradores" className={linkCls(pathname === "/cme/colaboradores")}>
                Colaboradores
              </Link>
              {acesso.data?.podeTestar ? (
                <Link
                  to="/cme/teste-leitura"
                  className={linkCls(pathname === "/cme/teste-leitura")}
                >
                  Teste de leitura
                </Link>
              ) : null}
              <Link to="/cme/falhas" className={linkCls(pathname === "/cme/falhas")}>
                Falhas de leitura
              </Link>
              {acesso.data?.podeEditar ? (
                <Link to="/cme/configuracao" className={linkCls(pathname === "/cme/configuracao")}>
                  Configuração
                </Link>
              ) : null}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            {ehSala ? (
              // Quem sai do crachá usa o botão da tela. Este desliga o login do computador, que só o master refaz.
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  if (
                    window.confirm(
                      "Desligar o login deste computador? Para usar de novo, será preciso a senha deste computador.",
                    )
                  ) {
                    void sair();
                  }
                }}
              >
                Desligar este computador
              </Button>
            ) : (
              <>
                <span className="text-sm font-medium">{nome}</span>
                <Button variant="outline" size="sm" onClick={() => void sair()}>
                  <LogOut className="size-4" aria-hidden="true" /> Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      {acesso.isError ? (
        <div className="mx-auto max-w-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">{acesso.error.message}</p>
        </div>
      ) : (
        <main className="mx-auto max-w-[1400px] p-4 print:max-w-none print:p-0">
          <Outlet />
        </main>
      )}
    </>
  );
}
