import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Share } from "lucide-react";

import { TrizionMark } from "@/components/medsync/brand";
import { RodapeTrizion } from "@/components/medsync/rodape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInstalarApp } from "@/hooks/use-instalar-app";
import { entrar as autenticar, verificarMfaLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import { obterTokenCaptcha } from "@/lib/recaptcha";
import { mensagemAmigavel } from "@/lib/erros";
import medico from "@/assets/medico-medsync.jpg";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "KlinSync | Acesso dos Hospitais — Trizion Tech" },
      {
        name: "description",
        content:
          "Entrada única do ecossistema KlinSync: acesso dos hospitais aos módulos de check-in de cirurgiões e giro de sala cirúrgica.",
      },
      { property: "og:title", content: "KlinSync | Acesso dos Hospitais — Trizion Tech" },
      {
        property: "og:description",
        content:
          "Plataforma multi-hospital da Trizion Tech para o centro cirúrgico. Faça login para acessar os módulos contratados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { podeInstalar, instalado, ios, instalar } = useInstalarApp();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [desafioMfa, setDesafioMfa] = useState<{ factorId: string; mfaToken: string } | null>(null);
  const [codigoMfa, setCodigoMfa] = useState("");

  async function concluirLogin() {
    // Descarta qualquer dado em cache do usuário anterior (sessão, painéis).
    await queryClient.cancelQueries();
    queryClient.clear();
    navigate({ to: "/app" });
  }

  async function validarCodigoMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!desafioMfa) return;
    setCarregando(true);
    try {
      await verificarMfaLogin({
        mfaToken: desafioMfa.mfaToken,
        factorId: desafioMfa.factorId,
        code: codigoMfa.replace(/\D/g, ""),
      });
      setDesafioMfa(null);
      setCodigoMfa("");
      await concluirLogin();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Código inválido ou expirado.");
      } else {
        toast.error(mensagemAmigavel(err));
      }
    } finally {
      setCarregando(false);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const emailNormalizado = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setCarregando(true);
    try {
      const captchaToken = await obterTokenCaptcha("login");
      // O servidor valida captcha e bloqueio por IP/tentativas e registra o resultado do login.
      const resultado = await autenticar(emailNormalizado, senha, captchaToken);
      if (resultado.status === "mfa") {
        setDesafioMfa({ factorId: resultado.factorId, mfaToken: resultado.mfaToken });
        return;
      }
      await concluirLogin();
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        const minutos = (err.data as { minutosRestantes?: number } | null)?.minutosRestantes;
        toast.error(
          minutos
            ? `Acesso temporariamente bloqueado. Tente novamente em ${minutos} min.`
            : "Acesso temporariamente bloqueado.",
        );
      } else if (err instanceof ApiError && err.status === 401) {
        toast.error("E-mail ou senha inválidos.");
      } else {
        toast.error(mensagemAmigavel(err));
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="theme-medsync flex min-h-screen flex-col bg-[oklch(0.98_0.01_240)] text-foreground">
      <header className="border-b border-border/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-foreground">
          <TrizionMark />
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Ecossistema KlinSync
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-start gap-5">
              <img
                src={medico}
                alt="Médico sorrindo em corredor hospitalar iluminado"
                width={1024}
                height={1280}
                className="h-44 w-36 shrink-0 rounded-2xl border border-border object-cover shadow-sm sm:h-56 sm:w-44"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                  KlinSync · Trizion Technology
                </p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                  O centro cirúrgico inteiro em um só ecossistema.
                </h1>
              </div>
            </div>
            <p className="mt-6 max-w-lg text-base text-muted-foreground">
              O KlinSync conecta check-in de cirurgiões, giro de sala e gestão hospitalar em uma
              plataforma única: menos tempo ocioso entre cirurgias, indicadores em tempo real e
              relatórios prontos para a diretoria. Cada hospital recebe apenas os módulos
              contratados, com isolamento total de dados e trilha de auditoria completa.
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-foreground/80 sm:grid-cols-2">
              <li className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <span className="size-2 rounded-full bg-primary" /> Check-in seguro de cirurgiões
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <span className="size-2 rounded-full bg-primary" /> Giro de sala cronometrado
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <span className="size-2 rounded-full bg-primary" /> Indicadores e exportações
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <span className="size-2 rounded-full bg-primary" /> Segurança e LGPD por padrão
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-white p-8 text-foreground shadow-elev">
            <h2 className="text-2xl font-semibold">Acesso dos hospitais</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use as credenciais fornecidas pela equipe KlinSync.
            </p>
            {desafioMfa ? (
              <form onSubmit={validarCodigoMfa} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo-2fa">Código de verificação</Label>
                  <Input
                    id="codigo-2fa"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={codigoMfa}
                    onChange={(e) => setCodigoMfa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe o código de 6 dígitos do seu aplicativo autenticador.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={carregando || codigoMfa.length !== 6}
                >
                  {carregando ? "Verificando..." : "Confirmar acesso"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={carregando}
                  onClick={() => {
                    setDesafioMfa(null);
                    setCodigoMfa("");
                  }}
                >
                  Cancelar
                </Button>
              </form>
            ) : (
              <form onSubmit={entrar} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@hospital.com.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Todas as tentativas de acesso são registradas com IP e localização aproximada.
            </p>

            {!instalado && (podeInstalar || ios) && (
              <div className="mt-6 rounded-xl border border-border bg-[oklch(0.98_0.01_240)] p-4">
                <p className="text-sm font-medium text-foreground">
                  Instalar o KlinSync no seu dispositivo
                </p>
                {podeInstalar ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adicione o atalho na tela inicial e abra o sistema como um aplicativo, em tela
                      cheia.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => void instalar()}
                    >
                      <Download className="size-4" /> Instalar aplicativo
                    </Button>
                  </>
                ) : (
                  <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
                    <Share className="mt-0.5 size-4 shrink-0" />
                    No iPhone ou iPad: toque em Compartilhar no Safari e escolha “Adicionar à Tela
                    de Início”.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <RodapeTrizion />
    </div>
  );
}
