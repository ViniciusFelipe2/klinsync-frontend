import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Circle, CircleAlert, LogOut, Package, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  conferirItem,
  entrarComCracha,
  finalizarConferencia,
  renovarSessaoCracha,
  sairDaSala,
  type CaixaNaSala,
  type SessaoCracha,
  type SetorConferencia,
} from "@/lib/api/cme";
import { ApiError } from "@/lib/api/http";

/*
 * O que os computadores de crachá (sala cirúrgica e CME) têm em comum:
 * entrar pelo crachá, sair sozinho por falta de uso e conferir a caixa item a item.
 */

/** Quanto antes de sair sozinho a tela avisa. */
const AVISO_ANTES_DE_SAIR_MS = 2 * 60_000;

export type Logado = SessaoCracha & { token: string; ultimoUso: number };

export const sessaoEncerrada = (e: unknown) =>
  e instanceof ApiError && !!(e.data as { sessaoEncerrada?: boolean } | null)?.sessaoEncerrada;

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const duracaoTexto = (segundos: number) =>
  segundos < 60
    ? `${segundos} s`
    : `${Math.floor(segundos / 60)} min ${String(segundos % 60).padStart(2, "0")} s`;

/**
 * Sessão do crachá neste computador. `aoEncerrar` limpa o que a tela estava fazendo
 * sempre que alguém sai ou outra pessoa entra.
 */
export function useCracha(aoEncerrar: () => void) {
  const [logado, setLogado] = useState<Logado | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const token = useRef<string | null>(null);
  token.current = logado?.token ?? null;
  const limpar = useRef(aoEncerrar);
  limpar.current = aoEncerrar;

  const encerrarLocal = useCallback((mensagem?: string) => {
    setLogado(null);
    limpar.current();
    if (mensagem) toast.info(mensagem);
  }, []);

  /** Toda resposta do servidor renova o prazo; a contagem da tela segue o mesmo relógio. */
  const usou = useCallback(() => setLogado((l) => (l ? { ...l, ultimoUso: Date.now() } : l)), []);

  /**
   * Erro de uma chamada feita com o crachá. Se a sessão acabou, volta para a tela do crachá e devolve true;
   * senão a chamada conta como uso e quem chamou mostra o erro.
   */
  const tratarErro = useCallback(
    (e: unknown) => {
      if (sessaoEncerrada(e)) {
        encerrarLocal((e as Error).message);
        return true;
      }
      usou();
      return false;
    },
    [encerrarLocal, usou],
  );

  const entrar = useMutation({
    mutationFn: entrarComCracha,
    onSuccess: (r) => {
      limpar.current();
      setLogado({ ...r, ultimoUso: Date.now() });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const restanteMs = logado ? logado.ultimoUso + logado.inatividadeMin * 60_000 - agora : 0;
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

  return { logado, entrar, continuar, sair, usou, tratarErro, encerrarLocal, restanteMs };
}

export type Cracha = ReturnType<typeof useCracha>;

/** Tela inicial: bipar o crachá para entrar. */
export function TelaCracha({
  local,
  cracha,
  permitirDigitado,
}: {
  local: string;
  cracha: Cracha;
  permitirDigitado: boolean;
}) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {local}
        </p>
        <CardTitle className="text-3xl">Bipe o seu crachá para entrar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CampoLeitura
          ocupado={cracha.entrar.isPending}
          aoLer={(l: Leitura) =>
            cracha.entrar.mutate({
              cracha: l.texto,
              duracaoMs: l.duracaoMs,
              teclas: l.teclas,
              digitado: false,
            })
          }
          aoDigitar={(numero) => cracha.entrar.mutate({ cracha: numero, digitado: true })}
          permitirDigitacao={permitirDigitado}
          exigirMotivo={false}
          rotuloDigitacao="Digitar o número do crachá (modo de teste)"
          rotuloCampo="Número do crachá"
        />
        {permitirDigitado ? (
          <p className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
            Modo de teste ligado: o número do crachá pode ser digitado. Desligue em CME →
            Configuração antes de usar no dia a dia.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Quem está logado, o botão de sair e o aviso de saída automática. */
export function BarraColaborador({
  logado,
  local,
  cracha,
  children,
}: {
  logado: Logado;
  local: string;
  cracha: Cracha;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-emerald-500 bg-card p-4">
        <UserRound className="size-10 text-emerald-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold">{logado.colaborador.nome}</p>
          <p className="text-sm text-muted-foreground">
            Crachá {logado.colaborador.numeroCracha} · {ROTULO_PERFIL[logado.colaborador.perfil]} ·{" "}
            {local}
          </p>
        </div>
        {children}
        <Button
          size="lg"
          variant="outline"
          className="h-14 px-6 text-lg"
          onClick={() => cracha.sair("manual")}
        >
          <LogOut className="size-5" aria-hidden="true" /> Sair
        </Button>
      </div>

      {cracha.restanteMs <= AVISO_ANTES_DE_SAIR_MS ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-900"
        >
          <p className="text-lg font-medium">
            Sem uso: saída automática em {mmss(cracha.restanteMs)}
          </p>
          <Button
            size="lg"
            onClick={() => cracha.continuar.mutate()}
            disabled={cracha.continuar.isPending}
          >
            Continuar logado
          </Button>
        </div>
      ) : null}
    </>
  );
}

const PROXIMO_PASSO: Record<SetorConferencia, string> = {
  sala: "A caixa está pronta para a coleta do CME.",
  expurgo: "A caixa pode seguir para o preparo.",
  preparo: "A caixa pode seguir para a esterilização.",
};

const SE_FALTAR_PECA: Record<SetorConferencia, string> = {
  sala: "Não achou uma peça? Procure na sala (lixo, campo cirúrgico). O chamado do CME para item faltando chega na próxima etapa.",
  expurgo: "Não achou uma peça? Confira a cuba e a bancada do expurgo e avise o chefe do CME.",
  preparo: "Não achou uma peça? Confira a bancada do preparo e avise o chefe do CME.",
};

export type Concluida = {
  rotulo: string;
  itens: number;
  segundos: number;
  setor: SetorConferencia;
};

export function ConferenciaConcluida({
  concluida,
  aoContinuar,
}: {
  concluida: Concluida;
  aoContinuar: () => void;
}) {
  return (
    <Card className="border-2 border-emerald-500">
      <CardContent className="space-y-4 pt-6 text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-600" aria-hidden="true" />
        <p className="text-3xl font-semibold">Conferência concluída</p>
        <p className="text-lg text-muted-foreground">
          {concluida.rotulo}: {concluida.itens} {concluida.itens === 1 ? "item" : "itens"}{" "}
          conferidos em {duracaoTexto(concluida.segundos)}. {PROXIMO_PASSO[concluida.setor]}
        </p>
        <Button size="lg" className="h-14 px-8 text-lg" onClick={aoContinuar}>
          Conferir outra caixa
        </Button>
      </CardContent>
    </Card>
  );
}

type Aviso = { tipo: "ok" | "repetido" | "erro"; texto: string };

const COR_AVISO: Record<Aviso["tipo"], string> = {
  ok: "border-emerald-500 bg-emerald-50 text-emerald-900",
  repetido: "border-amber-500 bg-amber-50 text-amber-900",
  erro: "border-red-600 bg-red-50 text-red-900",
};

/** Aviso grande do resultado do último bip. */
export function AvisoDeLeitura({ aviso }: { aviso: Aviso | null }) {
  if (!aviso) return null;
  return (
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
  );
}

export type { Aviso };

/** Conferência da caixa aberta: cada peça bipada é marcada; só finaliza com todas conferidas. */
export function Conferencia({
  caixa,
  cracha,
  token,
  aoAtualizar,
  aoConcluir,
  aoTrocarCaixa,
}: {
  caixa: CaixaNaSala;
  cracha: Cracha;
  token: string;
  aoAtualizar: (itens: CaixaNaSala["itens"]) => void;
  aoConcluir: (concluida: Concluida) => void;
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
      cracha.usou();
      setAviso({ tipo: "ok", texto: `${r.item.rotulo}: conferido` });
      aoAtualizar(r.itens);
    },
    onError: (e: Error) => {
      if (cracha.tratarErro(e)) return;
      tocar("erro");
      const repetido = e instanceof ApiError && e.status === 409;
      setAviso({ tipo: repetido ? "repetido" : "erro", texto: e.message });
    },
  });

  const finalizar = useMutation({
    mutationFn: () => finalizarConferencia({ token, conferenciaId: caixa.conferenciaId }),
    onSuccess: (r) => {
      cracha.usou();
      aoConcluir({
        rotulo: caixa.caixa.rotulo,
        itens: r.itens,
        segundos: r.duracaoSegundos,
        setor: caixa.setor,
      });
    },
    onError: (e: Error) => {
      if (!cracha.tratarErro(e)) toast.error(e.message);
    },
  });

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
            <Package className="size-7 text-primary" aria-hidden="true" />
            {caixa.caixa.rotulo}
            <span className="text-base font-normal text-muted-foreground">
              {ROTULO_TIPO_CAIXA[caixa.caixa.tipoCaixa]}
              {caixa.caixa.medicoNome ? ` · Dr(a). ${caixa.caixa.medicoNome}` : ""}
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
        <AvisoDeLeitura aviso={aviso} />

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
          <p className="text-center text-sm text-muted-foreground">{SE_FALTAR_PECA[caixa.setor]}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Bipar a caixa e conferir os itens dela: o mesmo passo na sala, no expurgo e no preparo. */
export function FluxoConferencia({
  cracha,
  logado,
  setor,
}: {
  cracha: Cracha;
  logado: Logado;
  /** No computador da sala o servidor já sabe o setor; no do CME é o que o colaborador escolheu. */
  setor?: "expurgo" | "preparo";
}) {
  const [caixa, setCaixa] = useState<CaixaNaSala | null>(null);
  const [concluida, setConcluida] = useState<Concluida | null>(null);

  const lerCaixa = useMutation({
    mutationFn: abrirCaixaNaSala,
    onSuccess: (r) => {
      cracha.usou();
      setConcluida(null);
      setCaixa(r);
    },
    onError: (e: Error) => {
      if (!cracha.tratarErro(e)) toast.error(e.message);
    },
  });

  if (concluida) {
    return <ConferenciaConcluida concluida={concluida} aoContinuar={() => setConcluida(null)} />;
  }
  if (caixa) {
    return (
      <Conferencia
        caixa={caixa}
        cracha={cracha}
        token={logado.token}
        aoAtualizar={(itens) => setCaixa((c) => (c ? { ...c, itens } : c))}
        aoConcluir={(c) => {
          setConcluida(c);
          setCaixa(null);
        }}
        aoTrocarCaixa={() => setCaixa(null)}
      />
    );
  }
  return (
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
              ...(setor ? { setor } : {}),
            })
          }
          aoDigitar={(texto, motivo) =>
            lerCaixa.mutate({
              token: logado.token,
              texto,
              motivo,
              digitado: true,
              ...(setor ? { setor } : {}),
            })
          }
          rotuloCampo="Código da caixa"
        />
      </CardContent>
    </Card>
  );
}
