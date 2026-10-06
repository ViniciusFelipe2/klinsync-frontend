import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  confirmarCadastroMfa,
  iniciarCadastroMfa,
  listarFatoresMfa,
  removerFatorMfa,
} from "@/lib/api/auth";
import { mensagemAmigavel } from "@/lib/erros";

export const Route = createFileRoute("/_authenticated/master/mfa")({
  head: () => ({
    meta: [
      { title: "Verificação em duas etapas | Painel Trizion" },
      {
        name: "description",
        content:
          "Ative a verificação em duas etapas (TOTP) da conta master_admin da Trizion no ecossistema KlinSync.",
      },
      { property: "og:title", content: "Verificação em duas etapas | Painel Trizion" },
      {
        property: "og:description",
        content: "Proteja o acesso master com autenticação de dois fatores por aplicativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaMfa,
});

type Fator = { id: string; status: string; friendly_name?: string | null };

function PaginaMfa() {
  const [fatores, setFatores] = useState<Fator[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      const lista = await listarFatoresMfa();
      setFatores(lista.filter((f) => f.status === "verified"));
    } catch (err) {
      toast.error(mensagemAmigavel(err));
      setFatores([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  async function iniciar() {
    setOcupado(true);
    try {
      const data = await iniciarCadastroMfa(`Trizion ${new Date().toLocaleDateString("pt-BR")}`);
      setEnroll({ id: data.id, qr: data.qr, secret: data.secret });
      setCodigo("");
    } catch (err) {
      toast.error(mensagemAmigavel(err));
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!enroll) return;
    setOcupado(true);
    try {
      await confirmarCadastroMfa(enroll.id, codigo.replace(/\D/g, ""));
      toast.success("Verificação em duas etapas ativada.");
      setEnroll(null);
      await recarregar();
    } catch (err) {
      toast.error("Código inválido ou expirado. Tente o código atual do aplicativo.");
      console.error("[mfa]", err);
    } finally {
      setOcupado(false);
    }
  }

  async function remover(id: string) {
    setOcupado(true);
    try {
      await removerFatorMfa(id);
      toast.success("Fator removido.");
      await recarregar();
    } catch (err) {
      toast.error(mensagemAmigavel(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Verificação em duas etapas (2FA)
            {carregando ? null : fatores.length > 0 ? (
              <Badge className="bg-emerald-600 text-white">Ativa</Badge>
            ) : (
              <Badge variant="destructive">Inativa</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Exigida para contas master_admin. Use um app autenticador (Google Authenticator,
            1Password, Authy) para gerar códigos de 6 dígitos a cada login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {fatores.length > 0 && (
            <ul className="space-y-2">
              {fatores.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
                >
                  <span className="text-foreground">
                    {f.friendly_name || "Aplicativo autenticador"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ocupado}
                    onClick={() => void remover(f.id)}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {!enroll ? (
            <Button onClick={() => void iniciar()} disabled={ocupado || carregando}>
              {fatores.length > 0
                ? "Adicionar outro aplicativo"
                : "Ativar verificação em duas etapas"}
            </Button>
          ) : (
            <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
              <img
                src={enroll.qr}
                alt="QR Code para configurar o aplicativo autenticador"
                width={200}
                height={200}
                className="rounded-lg border border-border bg-white p-2"
              />
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code no seu aplicativo autenticador ou informe a chave manualmente:
                </p>
                <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                  {enroll.secret}
                </code>
                <div className="space-y-2">
                  <Label htmlFor="codigo-mfa">Código de 6 dígitos</Label>
                  <Input
                    id="codigo-mfa"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => void confirmar()}
                    disabled={ocupado || codigo.length !== 6}
                  >
                    Confirmar e ativar
                  </Button>
                  <Button variant="ghost" onClick={() => setEnroll(null)} disabled={ocupado}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
