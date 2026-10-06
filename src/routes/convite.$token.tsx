import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandShell } from "@/components/medsync/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGRA_SENHA, senhaEhForte } from "@/lib/senha";
import { mensagemAmigavel } from "@/lib/erros";
import { entrar } from "@/lib/api/auth";
import { aceitarConvite, validarConvite } from "@/lib/api/convites";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Ativar acesso | KlinSync — Trizion Tech" },
      {
        name: "description",
        content:
          "Ative seu acesso ao ecossistema KlinSync definindo uma senha pessoal para o hospital e o módulo liberados pela Trizion Tech.",
      },
      { property: "og:title", content: "Ativar acesso | KlinSync — Trizion Tech" },
      {
        property: "og:description",
        content: "Convite de acesso ao ecossistema KlinSync da Trizion Tech.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Convite,
});

// Anti-enumeração: uma única mensagem, sem revelar se o convite existe,
// foi revogado, já foi usado ou expirou.
const MENSAGEM_INDISPONIVEL =
  "Este link de ativação não está disponível. Se você já ativou seu acesso, entre com seu e-mail e senha; caso contrário, peça um novo link à equipe Trizion Tech.";

const ROTULO_ROLE: Record<string, string> = {
  master_admin: "Equipe Trizion (master)",
  hospital_admin: "Admin do hospital",
  operador: "Acesso operacional",
};

function Convite() {
  const { token } = useParams({ from: "/convite/$token" });
  const navigate = useNavigate();
  const validar = validarConvite;
  const aceitar = aceitarConvite;

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["convite", token],
    queryFn: () => validar({ data: { token } }),
    retry: false,
  });

  useEffect(() => {
    if (data?.valido) setNome(data.nome);
  }, [data]);

  async function ativar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (!senhaEhForte(senha)) {
      toast.error(REGRA_SENHA);
      return;
    }
    setEnviando(true);
    try {
      const r = await aceitar({ data: { token, nome, senha } });
      const login = await entrar(r.email, senha, null).catch(() => null);
      if (login?.status !== "ok") {
        toast.success("Acesso criado. Faça login para continuar.");
        navigate({ to: "/entrar" });
        return;
      }
      toast.success("Acesso ativado. Bem-vindo ao KlinSync.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(mensagemAmigavel(err, "Não foi possível ativar o acesso."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <BrandShell>
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/95 p-8 text-foreground shadow-elev">
        {isLoading ? <p className="text-sm text-muted-foreground">Validando convite...</p> : null}

        {!isLoading && data && !data.valido ? (
          <>
            <h1 className="text-2xl font-semibold">Convite indisponível</h1>
            <p className="mt-3 text-sm text-muted-foreground">{MENSAGEM_INDISPONIVEL}</p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/entrar" })}>
              Ir para o login
            </Button>
          </>
        ) : null}

        {!isLoading && data?.valido ? (
          <>
            <h1 className="text-2xl font-semibold">Ative seu acesso</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Convite para <span className="font-medium text-foreground">{data.email}</span>
            </p>
            <ul className="mt-4 space-y-1 rounded-lg border p-3 text-xs text-muted-foreground">
              <li>Tipo de acesso: {ROTULO_ROLE[data.role] ?? data.role}</li>
              <li>Hospital: {data.hospital ?? "Plataforma Trizion"}</li>
              {data.feature ? <li>Módulo liberado: {data.feature}</li> : null}
            </ul>

            <form onSubmit={ativar} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Crie uma senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{REGRA_SENHA}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirme a senha</Label>
                <Input
                  id="confirmacao"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? "Ativando..." : "Ativar acesso"}
              </Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              O link é de uso único e todas as ativações ficam registradas na auditoria.
            </p>
          </>
        ) : null}
      </div>
    </BrandShell>
  );
}
