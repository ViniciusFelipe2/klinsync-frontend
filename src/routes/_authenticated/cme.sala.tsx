import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, CircleAlert, LogOut, Package, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CampoLeitura } from "@/components/cme/campo-leitura";
import { tocar } from "@/components/cme/som";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Leitura } from "@/hooks/use-leitor";
import {
  ROTULO_PERFIL,
  ROTULO_TIPO_CAIXA,
  abrirCaixaNaSala,
  acessoCme,
  conferirItem,
  entrarComCracha,
  finalizarConferencia,
  renovarSessaoCracha,
  sairDaSala,
  type CaixaNaSala,
  type SessaoCracha,
} from "@/lib/api/cme";
import { ApiError } from "@/lib/api/http";

export const Route = createFileRoute("/_authenticated/cme/sala")({
  head: () => ({ meta: [{ title: "Sala cirúrgica | KlinSync" }] }),
  component: Sala,
});

/** Quanto antes de sair sozinho a tela avisa. */
const AVISO_ANTES_DE_SAIR_MS = 2 * 60_000;

type Logado = SessaoCracha & { token: string; ultimoUso: number };

const sessaoEncerrada = (e: unknown) =>
  e instanceof ApiError && !!(e.data as { sessaoEncerrada?: boolean } | null)?.sessaoEncerrada;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Sala() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  const [logado, setLogado] = useState<Logado | null>(null);
  const [caixa, setCaixa] = useState<CaixaNaSala | null>(null);
  const [concluida, setConcluida] = useState<{
    rotulo: string;
    itens: number;
    segundos: number;
  } | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const token = useRef<string | null>(null);
  token.current = logado?.token ?? null;

  const encerrarLocal = useCallback((mensagem?: string) => {
    setLogado(null);
    setCaixa(null);
    setConcluida(null);
    if (mensagem) toast.info(mensagem);
  }, []);

  /** Toda resposta do servidor renova o prazo; a contagem da tela segue o mesmo relógio. */
  const usou = () => setLogado((l) => (l ? { ...l, ultimoUso: Date.now() } : l));

  const entrar = useMutation({
    mutationFn: entrarComCracha,
    onSuccess: (r) => {
      setCaixa(null);
      setLogado({ ...r, ultimoUso: Date.now() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lerCaixa = useMutation({
    mutationFn: abrirCaixaNaSala,
    onSuccess: (r) => {
      usou();
      setConcluida(null);
      setCaixa(r);
    },
    onError: (e: Error) => {
      if (sessaoEncerrada(e)) encerrarLocal(e.message);
      else {
        usou();
        toast.error(e.message);
      }
    },
  });

  const continuar = useMutation({
    mutationFn: () => renovarSessaoCracha(token.current ?? ""),
    onSuccess: usou,
    onError: (e: Error) => encerrarLocal(e.message),
  });

  const sair = useCallback(
    (motivo: "manual" | "inatividade") => {
      const t = token.current;
      encerrarLocal(
        motivo === "inatividade"
          ? "Saída automática por falta de uso. Bipe o crachá de novo."
          : undefined,
      );
      if (t) void sairDaSala(t, motivo).catch(() => undefined);
    },
    [encerrarLocal],
  );

  // Relógio da saída automática.
  useEffect(() => {
    if (!logado) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [logado]);

  const limiteMs = logado ? logado.inatividadeMin * 60_000 : 0;
  const restanteMs = logado ? logado.ultimoUso + limiteMs - agora : 0;
  useEffect(() => {
    if (logado && restanteMs <= 0) sair("inatividade");
  }, [logado, restanteMs, sair]);

  // Saiu da tela (fechou a aba, trocou de página): encerra o crachá também.
  useEffect(
    () => () => {
      if (token.current) void sairDaSala(token.current).catch(() => undefined);
    },
    [],
  );

  if (!acesso.data) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (acesso.data.tipo !== "estacao_sala" || !acesso.data.sala) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta tela abre só no computador da sala cirúrgica, com o login criado pela equipe KlinSync.
      </p>
    );
  }
  const { sala, config } = acesso.data;

  if (!logado) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <Card>
          <CardHeader className="items-center text-center">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {sala.nome}
            </p>
            <CardTitle className="text-3xl">Bipe o seu crachá para entrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CampoLeitura
              ocupado={entrar.isPending}
              aoLer={(l: Leitura) =>
                entrar.mutate({
                  cracha: l.texto,
                  duracaoMs: l.duracaoMs,
                  teclas: l.teclas,
                  digitado: false,
                })
              }
              aoDigitar={(cracha) => entrar.mutate({ cracha, digitado: true })}
              permitirDigitacao={config.permitirCrachaDigitado}
              exigirMotivo={false}
              rotuloDigitacao="Digitar o número do crachá (modo de teste)"
              rotuloCampo="Número do crachá"
            />
            {config.permitirCrachaDigitado ? (
              <p className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
                Modo de teste ligado: o número do crachá pode ser digitado. Desligue em CME →
                Configuração antes de usar no dia a dia.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-emerald-500 bg-card p-4">
        <UserRound className="size-10 text-emerald-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold">{logado.colaborador.nome}</p>
          <p className="text-sm text-muted-foreground">
            Crachá {logado.colaborador.numeroCracha} · {ROTULO_PERFIL[logado.colaborador.perfil]} ·{" "}
            {sala.nome}
          </p>
        </div>
        <Button
          size="lg"
          variant="outline"
          className="h-14 px-6 text-lg"
          onClick={() => sair("manual")}
        >
          <LogOut className="size-5" aria-hidden="true" /> Sair
        </Button>
      </div>

      {restanteMs <= AVISO_ANTES_DE_SAIR_MS ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-900"
        >
          <p className="text-lg font-medium">Sem uso: saída automática em {mmss(restanteMs)}</p>
          <Button size="lg" onClick={() => continuar.mutate()} disabled={continuar.isPending}>
            Continuar logado
          </Button>
        </div>
      ) : null}

      {concluida ? (
        <Card className="border-2 border-emerald-500">
          <CardContent className="space-y-4 pt-6 text-center">
            <CheckCircle2 className="mx-auto size-16 text-emerald-600" aria-hidden="true" />
            <p className="text-3xl font-semibold">Conferência concluída</p>
            <p className="text-lg text-muted-foreground">
              {concluida.rotulo}: {concluida.itens} {concluida.itens === 1 ? "item" : "itens"}{" "}
              conferidos em {duracaoTexto(concluida.segundos)}. A caixa está pronta para a coleta do
              CME.
            </p>
            <Button size="lg" className="h-14 px-8 text-lg" onClick={() => setConcluida(null)}>
              Conferir outra caixa
            </Button>
          </CardContent>
        </Card>
      ) : !caixa ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bipe a caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <CampoLeitura
              ocupado={lerCaixa.isPending}
              aoLer={(l: Leitura) =>
                lerCaixa.mutate({
                  token: logado.token,
                  texto: l.texto,
                  textoVisivel: l.visivel,
                  duracaoMs: l.duracaoMs,
                  teclas: l.teclas,
                  digitado: false,
                })
              }
              aoDigitar={(texto, motivo) =>
                lerCaixa.mutate({ token: logado.token, texto, motivo, digitado: true })
              }
              rotuloCampo="Código da caixa"
            />
          </CardContent>
        </Card>
      ) : (
        <Conferencia
          caixa={caixa}
          token={logado.token}
          aoAtualizar={(itens) => {
            usou();
            setCaixa((c) => (c ? { ...c, itens } : c));
          }}
          aoErroDeSessao={encerrarLocal}
          aoConcluir={(itens, segundos) => {
            usou();
            setConcluida({ rotulo: caixa.caixa.rotulo, itens, segundos });
            setCaixa(null);
          }}
          aoTrocarCaixa={() => setCaixa(null)}
        />
      )}
    </div>
  );
}

const duracaoTexto = (segundos: number) =>
  segundos < 60
    ? `${segundos} s`
    : `${Math.floor(segundos / 60)} min ${String(segundos % 60).padStart(2, "0")} s`;

type Aviso = { tipo: "ok" | "repetido" | "erro"; texto: string };

const COR_AVISO: Record<Aviso["tipo"], string> = {
  ok: "border-emerald-500 bg-emerald-50 text-emerald-900",
  repetido: "border-amber-500 bg-amber-50 text-amber-900",
  erro: "border-red-600 bg-red-50 text-red-900",
};

/** Conferência da caixa aberta: cada peça bipada é marcada; só finaliza com todas conferidas. */
function Conferencia({
  caixa,
  token,
  aoAtualizar,
  aoErroDeSessao,
  aoConcluir,
  aoTrocarCaixa,
}: {
  caixa: CaixaNaSala;
  token: string;
  aoAtualizar: (itens: CaixaNaSala["itens"]) => void;
  aoErroDeSessao: (mensagem: string) => void;
  aoConcluir: (itens: number, segundos: number) => void;
  aoTrocarCaixa: () => void;
}) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const conferidos = caixa.itens.filter((i) => i.conferido).length;
  const total = caixa.itens.length;
  const completa = total > 0 && conferidos === total;

  const bipar = useMutation({
    mutationFn: conferirItem,
    onSuccess: (r) => {
      tocar("ok");
      setAviso({ tipo: "ok", texto: `${r.item.rotulo}: conferido` });
      aoAtualizar(r.itens);
    },
    onError: (e: Error) => {
      if (sessaoEncerrada(e)) {
        aoErroDeSessao(e.message);
        return;
      }
      tocar("erro");
      const repetido = e instanceof ApiError && e.status === 409;
      setAviso({ tipo: repetido ? "repetido" : "erro", texto: e.message });
    },
  });

  const finalizar = useMutation({
    mutationFn: () => finalizarConferencia({ token, conferenciaId: caixa.conferenciaId }),
    onSuccess: (r) => aoConcluir(r.itens, r.duracaoSegundos),
    onError: (e: Error) => {
      if (sessaoEncerrada(e)) aoErroDeSessao(e.message);
      else toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
              <Package className="size-7 text-primary" aria-hidden="true" />
              {caixa.caixa.rotulo}
              <span className="text-base font-normal text-muted-foreground">
                {ROTULO_TIPO_CAIXA[caixa.caixa.tipoCaixa]}
              </span>
            </CardTitle>
            <Button variant="outline" onClick={aoTrocarCaixa}>
              Bipar outra caixa
            </Button>
          </div>
          <div>
            <p className="text-4xl font-bold" aria-live="polite">
              {conferidos} de {total}
              <span className="ml-3 text-lg font-normal text-muted-foreground">
                {total === 1 ? "item conferido" : "itens conferidos"}
              </span>
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${total ? (conferidos / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {aviso ? (
            <div
              role="alert"
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-xl font-semibold ${COR_AVISO[aviso.tipo]}`}
            >
              {aviso.tipo === "ok" ? (
                <CheckCircle2 className="size-7 shrink-0" aria-hidden="true" />
              ) : (
                <CircleAlert className="size-7 shrink-0" aria-hidden="true" />
              )}
              {aviso.texto}
            </div>
          ) : null}

          {!completa ? (
            <CampoLeitura
              ocupado={bipar.isPending}
              aoLer={(l: Leitura) =>
                bipar.mutate({
                  token,
                  conferenciaId: caixa.conferenciaId,
                  texto: l.texto,
                  textoVisivel: l.visivel,
                  duracaoMs: l.duracaoMs,
                  teclas: l.teclas,
                  digitado: false,
                })
              }
              aoDigitar={(texto, motivo) =>
                bipar.mutate({
                  token,
                  conferenciaId: caixa.conferenciaId,
                  texto,
                  motivo,
                  digitado: true,
                })
              }
            />
          ) : null}

          {total === 0 ? (
            <p className="text-muted-foreground">
              Esta caixa ainda não tem itens cadastrados. Fale com o chefe do CME.
            </p>
          ) : (
            <ol className="divide-y rounded-lg border text-lg">
              {caixa.itens.map((i, n) => (
                <li
                  key={i.id}
                  className={`flex items-center gap-4 px-4 py-3 ${i.conferido ? "bg-emerald-50" : ""}`}
                >
                  <span className="w-8 text-right text-muted-foreground">{n + 1}</span>
                  {i.conferido ? (
                    <CheckCircle2
                      className="size-6 shrink-0 text-emerald-600"
                      aria-label="Conferido"
                    />
                  ) : (
                    <Circle
                      className="size-6 shrink-0 text-muted-foreground"
                      aria-label="Falta conferir"
                    />
                  )}
                  <span className={`flex-1 font-medium ${i.conferido ? "text-emerald-900" : ""}`}>
                    {i.rotulo}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{i.codigo}</span>
                </li>
              ))}
            </ol>
          )}

          <Button
            size="lg"
            className="h-16 w-full text-xl"
            disabled={!completa || finalizar.isPending}
            onClick={() => finalizar.mutate()}
          >
            {completa
              ? "Finalizar conferência"
              : `Faltam ${total - conferidos} ${total - conferidos === 1 ? "item" : "itens"}`}
          </Button>
          {!completa && total > 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Não achou uma peça? Procure na sala (lixo, campo cirúrgico). O chamado do CME para
              item faltando chega na próxima etapa.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
