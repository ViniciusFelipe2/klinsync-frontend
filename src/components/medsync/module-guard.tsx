import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useModulo } from "@/hooks/use-modulo";
import { useSessao } from "@/hooks/use-sessao";

const MENSAGENS: Record<string, string> = {
  feature_nao_contratada:
    "Este módulo ainda não foi liberado para o seu hospital. Fale com a equipe Trizion Tech para contratá-lo.",
  hospital_inativo:
    "O contrato do seu hospital está suspenso. Fale com a equipe Trizion Tech para regularizar o acesso.",
  sem_acesso: "Seu login não tem permissão para acessar este módulo.",
};

/**
 * Envolve um módulo do ecossistema. Só renderiza o conteúdo quando a feature
 * está contratada pelo hospital e liberada para o login em uso.
 */
export function ModuleGuard({
  chave,
  theme,
  children,
}: {
  chave: string;
  theme: string;
  children: (ctx: NonNullable<ReturnType<typeof useModulo>["data"]>) => ReactNode;
}) {
  const { data, isLoading } = useModulo(chave);
  const navigate = useNavigate();
  const sessao = useSessao();
  // As telas do módulo são operacionais: o admin do hospital acompanha tudo
  // pelo painel administrativo, sem precisar abrir o módulo.
  const ehAdminHospital = sessao.data?.perfil?.role === "hospital_admin";

  useEffect(() => {
    if (ehAdminHospital) void navigate({ to: "/hospital", replace: true });
  }, [ehAdminHospital, navigate]);

  if (isLoading || !data || sessao.isLoading || ehAdminHospital) {
    return (
      <div className={`${theme} grid min-h-screen place-items-center bg-background`}>
        <p className="text-sm text-muted-foreground">Carregando módulo...</p>
      </div>
    );
  }

  if (!data.permitido) {
    return (
      <div className={`${theme} grid min-h-screen place-items-center bg-background px-6`}>
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Módulo indisponível</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {MENSAGENS[data.motivo] ?? MENSAGENS["sem_acesso"]}
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  return <div className={`${theme} min-h-screen bg-background`}>{children(data)}</div>;
}
