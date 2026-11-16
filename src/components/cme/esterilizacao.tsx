import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Hourglass,
  Package,
  Play,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CampoLeitura } from "@/components/cme/campo-leitura";
import {
  AvisoDeLeitura,
  mmss,
  type Aviso,
  type Cracha,
  type Logado,
} from "@/components/cme/estacao";
import { tocar } from "@/components/cme/som";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Leitura } from "@/hooks/use-leitor";
import { useTempoReal } from "@/hooks/use-tempo-real";
import {
  ROTULO_TIPO_CAIXA,
  abrirCarga,
  biparCaixaNaCarga,
  cancelarCarga,
  confirmarArsenal,
  iniciarCiclo,
  maquinasDaEsterilizacao,
  retirarCaixaDaCarga,
  type CargaDetalhe,
  type MaquinaCme,
} from "@/lib/api/cme";
import { ApiError } from "@/lib/api/http";

/**
 * Hora atual pelo relógio do servidor, atualizada a cada segundo.
 * A contagem do ciclo não pode depender da hora (às vezes errada) do computador do setor.
 */
export function useAgoraDoServidor(agora: string | undefined) {
  const desvio = useRef(0);
  const ultimo = useRef<string | undefined>(undefined);
  const [, bater] = useState(0);
  if (agora && ultimo.current !== agora) {
    ultimo.current = agora;
    desvio.current = Date.parse(agora) - Date.now();
  }
  useEffect(() => {
    const id = window.setInterval(() => bater((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Date.now() + desvio.current;
}

/** 12:05 ou, passando de uma hora, 1:12:05. */
export const tempoRestante = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 3600) return mmss(ms);
  const m = Math.floor((s % 3600) / 60);
  return `${Math.floor(s / 3600)}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const duracaoCiclo = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/**
 * Busca os dados de novo no instante em que o próximo ciclo termina. O fim do ciclo é só a hora chegando:
 * o servidor não manda aviso, então a tela mesma marca o despertador.
 */
export function useAtualizarNoFimDoCiclo(
  maquinas: MaquinaCme[] | undefined,
  agora: string | undefined,
  recebidoEm: number,
  atualizar: () => void,
) {
  const fn = useRef(atualizar);
  fn.current = atualizar;
  const proximo = Math.min(
    ...(maquinas ?? []).map((m) =>
      m.carga?.status === "em_ciclo" && m.carga.terminaEm
        ? Date.parse(m.carga.terminaEm)
        : Infinity,
    ),
  );
  useEffect(() => {
    if (!agora || !Number.isFinite(proximo)) return;
    // Tempo que falta pelo relógio do servidor, descontado o que já passou desde a resposta. +1 s de folga.
    const falta = proximo - Date.parse(agora) - (Date.now() - recebidoEm) + 1000;
    const id = window.setTimeout(() => fn.current(), Math.max(0, falta));
    return () => window.clearTimeout(id);
  }, [proximo, agora, recebidoEm]);
}

type Situacao = "livre" | "montando" | "em_ciclo" | "retirar";

/** O que a máquina está fazendo agora. Ciclo cujo tempo já passou conta como terminado, mesmo antes de a lista atualizar. */
const situacaoDe = (m: MaquinaCme, agoraMs: number): Situacao => {
  if (m.carga?.status === "montando") return "montando";
  if (m.carga?.status === "aguardando_retirada") return "retirar";
  if (m.carga?.status === "em_ciclo" && m.carga.terminaEm)
    return Date.parse(m.carga.terminaEm) > agoraMs ? "em_ciclo" : "retirar";
  return "livre";
};

/** Cartão de uma máquina: nome, o que ela está fazendo e, em ciclo, o tempo que falta. */
export function CartaoMaquina({
  maquina: m,
  agoraMs,
  children,
}: {
  maquina: MaquinaCme;
  agoraMs: number;
  children?: ReactNode;
}) {
  const situacao = situacaoDe(m, agoraMs);
  const carga = m.carga;
  const terminou = situacao === "livre" ? m.ultimoCiclo : null;
  const restante = carga?.terminaEm ? Date.parse(carga.terminaEm) - agoraMs : 0;
  const total = (carga?.duracaoMin ?? 0) * 60_000;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border-2 bg-card p-4 ${
        situacao === "em_ciclo"
          ? "border-orange-500"
          : situacao === "montando"
            ? "border-violet-500"
            : situacao === "retirar"
              ? "border-emerald-500"
              : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-semibold">{m.nome}</p>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {situacao === "em_ciclo" ? (
            <>
              <Flame className="size-4 text-orange-600" aria-hidden="true" /> Em ciclo
            </>
          ) : situacao === "montando" ? (
            <>
              <Hourglass className="size-4 text-violet-600" aria-hidden="true" /> Carregando
            </>
          ) : situacao === "retirar" ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> Ciclo
              concluído
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> Livre
            </>
          )}
        </span>
      </div>

      {situacao === "em_ciclo" && carga ? (
        <div>
          <p className="font-mono text-3xl font-bold tabular-nums">{tempoRestante(restante)}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${total ? Math.min(100, (1 - restante / total) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Ciclo {carga.cicloNome} · {carga.caixas} {carga.caixas === 1 ? "caixa" : "caixas"} ·
            termina às {carga.terminaEm ? hora(carga.terminaEm) : ""}
          </p>
        </div>
      ) : situacao === "montando" && carga ? (
        <p className="text-sm text-muted-foreground">
          Ciclo {carga.cicloNome} ({duracaoCiclo(carga.duracaoMin)}) · {carga.caixas}{" "}
          {carga.caixas === 1 ? "caixa bipada" : "caixas bipadas"} · ciclo ainda não iniciado
        </p>
      ) : situacao === "retirar" && carga ? (
        <p className="text-sm text-muted-foreground">
          Ciclo {carga.cicloNome} terminou às {carga.terminaEm ? hora(carga.terminaEm) : ""} ·{" "}
          {carga.caixas} {carga.caixas === 1 ? "caixa esperando" : "caixas esperando"} ir para o
          arsenal
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {terminou?.terminaEm
            ? `Último ciclo (${terminou.cicloNome}) terminou às ${hora(terminou.terminaEm)}.`
            : "Nenhum ciclo registrado ainda."}
        </p>
      )}
      {children}
    </div>
  );
}

/** Setor de esterilização: escolher a máquina e o ciclo, bipar as caixas e dar a partida. */
export function Esterilizacao({
  cracha,
  logado,
  modoTeste,
}: {
  cracha: Cracha;
  logado: Logado;
  /** Com o modo de teste ligado na configuração, a carga ganha o botão de cancelar. */
  modoTeste: boolean;
}) {
  const qc = useQueryClient();
  const [carga, setCarga] = useState<CargaDetalhe | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["cme-esterilizacao-maquinas"],
    queryFn: maquinasDaEsterilizacao,
    refetchInterval: 15_000,
  });
  const agoraMs = useAgoraDoServidor(q.data?.agora);
  // Outro computador do CME mexeu em uma máquina: a lista atualiza na hora.
  useTempoReal();
  useAtualizarNoFimDoCiclo(
    q.data?.maquinas,
    q.data?.agora,
    q.dataUpdatedAt,
    () => void q.refetch(),
  );

  const abrir = useMutation({
    mutationFn: abrirCarga,
    onSuccess: (r) => {
      cracha.usou();
      setEscolhendo(null);
      setCarga(r);
    },
    onError: (e: Error) => {
      if (!cracha.tratarErro(e)) toast.error(e.message);
    },
  });

  if (carga) {
    return (
      <Carga
        carga={carga}
        cracha={cracha}
        token={logado.token}
        modoTeste={modoTeste}
        aoAtualizar={setCarga}
        aoVoltar={() => {
          setCarga(null);
          void qc.invalidateQueries({ queryKey: ["cme-esterilizacao-maquinas"] });
        }}
      />
    );
  }

  const maquinas = q.data?.maquinas ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Escolha a máquina</CardTitle>
      </CardHeader>
      <CardContent>
        {maquinas.length === 0 ? (
          <p className="text-muted-foreground">
            {q.isLoading
              ? "Carregando..."
              : "Nenhuma máquina cadastrada. O chefe do CME cadastra as máquinas e os ciclos em CME → Configuração."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {maquinas.map((m) => {
              const situacao = situacaoDe(m, agoraMs);
              return (
                <CartaoMaquina key={m.id} maquina={m} agoraMs={agoraMs}>
                  {situacao !== "livre" ? (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 text-lg"
                      disabled={abrir.isPending}
                      onClick={() => abrir.mutate({ token: logado.token, maquinaId: m.id })}
                    >
                      {situacao === "montando"
                        ? "Continuar a carga"
                        : situacao === "retirar"
                          ? "Confirmar ida ao arsenal"
                          : "Ver o ciclo"}
                    </Button>
                  ) : escolhendo === m.id ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Qual ciclo?</p>
                      {m.ciclos.map((c) => (
                        <Button
                          key={c.id}
                          size="lg"
                          className="h-14 w-full justify-between text-lg"
                          disabled={abrir.isPending}
                          onClick={() =>
                            abrir.mutate({ token: logado.token, maquinaId: m.id, cicloId: c.id })
                          }
                        >
                          {c.nome} <span className="font-normal">{duracaoCiclo(c.duracaoMin)}</span>
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setEscolhendo(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="h-14 text-lg"
                      disabled={m.ciclos.length === 0}
                      onClick={() => setEscolhendo(m.id)}
                    >
                      {m.ciclos.length === 0 ? "Sem ciclo cadastrado" : "Carregar esta máquina"}
                    </Button>
                  )}
                </CartaoMaquina>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Carga({
  carga,
  cracha,
  token,
  modoTeste,
  aoAtualizar,
  aoVoltar,
}: {
  carga: CargaDetalhe;
  cracha: Cracha;
  token: string;
  modoTeste: boolean;
  aoAtualizar: (c: CargaDetalhe) => void;
  aoVoltar: () => void;
}) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const agoraMs = useAgoraDoServidor(carga.agora);
  const montando = carga.status === "montando";
  const restante = carga.terminaEm ? Date.parse(carga.terminaEm) - agoraMs : 0;
  const pronto = !montando && restante <= 0;
  const total = carga.duracaoMin * 60_000;

  // Um bipe quando o ciclo termina com a tela aberta.
  const avisou = useRef(false);
  useEffect(() => {
    if (pronto && !avisou.current) {
      avisou.current = true;
      tocar("ok");
    }
  }, [pronto]);

  const erro = (e: Error) => {
    if (!cracha.tratarErro(e)) toast.error(e.message);
  };
  const bipar = useMutation({
    mutationFn: biparCaixaNaCarga,
    onSuccess: (r) => {
      tocar("ok");
      cracha.usou();
      setAviso({ tipo: "ok", texto: `${r.caixa.rotulo}: na carga` });
      aoAtualizar(r.carga);
    },
    onError: (e: Error) => {
      if (cracha.tratarErro(e)) return;
      tocar("erro");
      const repetido = e instanceof ApiError && e.status === 409;
      setAviso({ tipo: repetido ? "repetido" : "erro", texto: e.message });
    },
  });
  const retirar = useMutation({
    mutationFn: retirarCaixaDaCarga,
    onSuccess: (r) => {
      cracha.usou();
      setAviso(null);
      aoAtualizar(r);
    },
    onError: erro,
  });
  const iniciar = useMutation({
    mutationFn: () => iniciarCiclo({ token, cargaId: carga.id }),
    onSuccess: (r) => {
      cracha.usou();
      setAviso(null);
      aoAtualizar(r);
    },
    onError: erro,
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarCarga({ token, cargaId: carga.id }),
    onSuccess: () => {
      cracha.usou();
      toast.success("Carga cancelada. A máquina está livre.");
      aoVoltar();
    },
    onError: erro,
  });

  const arsenal = useMutation({
    mutationFn: () => confirmarArsenal({ token, cargaId: carga.id }),
    onSuccess: (r) => {
      cracha.usou();
      toast.success(
        r.caixas === 1 ? "1 caixa no arsenal." : `${r.caixas} caixas no arsenal. Máquina livre.`,
      );
      aoVoltar();
    },
    onError: erro,
  });

  const n = carga.caixas.length;
  return (
    <Card className={pronto ? "border-2 border-emerald-500" : ""}>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-2xl">
            {carga.maquina.nome}
            <span className="ml-3 text-base font-normal text-muted-foreground">
              Ciclo {carga.cicloNome} · {duracaoCiclo(carga.duracaoMin)}
            </span>
          </CardTitle>
          <Button variant="outline" onClick={aoVoltar}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Máquinas
          </Button>
        </div>

        {montando ? (
          <p className="text-4xl font-bold" aria-live="polite">
            {n}
            <span className="ml-3 text-lg font-normal text-muted-foreground">
              {n === 1 ? "caixa nesta carga" : "caixas nesta carga"}
            </span>
          </p>
        ) : pronto ? (
          <div className="flex items-center gap-4">
            <CheckCircle2 className="size-14 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-3xl font-semibold">Ciclo concluído</p>
              <p className="text-muted-foreground">
                {n} {n === 1 ? "caixa esterilizada" : "caixas esterilizadas"}
                {carga.terminaEm ? `. Terminou às ${hora(carga.terminaEm)}.` : "."} Leve as caixas
                para o arsenal e confirme abaixo.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tempo restante</p>
            <p className="font-mono text-7xl font-bold tabular-nums" aria-live="off">
              {tempoRestante(restante)}
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${total ? Math.min(100, (1 - restante / total) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-2 text-muted-foreground">
              {n} {n === 1 ? "caixa" : "caixas"} · termina às{" "}
              {carga.terminaEm ? hora(carga.terminaEm) : ""}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {montando ? (
          <>
            <AvisoDeLeitura aviso={aviso} />
            <CampoLeitura
              ocupado={bipar.isPending}
              aoLer={(l: Leitura) =>
                bipar.mutate({
                  token,
                  cargaId: carga.id,
                  texto: l.texto,
                  textoVisivel: l.visivel,
                  duracaoMs: l.duracaoMs,
                  teclas: l.teclas,
                  digitado: false,
                })
              }
              aoDigitar={(texto, motivo) =>
                bipar.mutate({ token, cargaId: carga.id, texto, motivo, digitado: true })
              }
              rotuloCampo="Código da caixa"
            />
          </>
        ) : null}

        {n === 0 ? (
          <p className="text-muted-foreground">Bipe as caixas que vão nesta máquina.</p>
        ) : (
          <ol className="divide-y rounded-lg border text-lg">
            {carga.caixas.map((c, i) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-8 text-right text-muted-foreground">{i + 1}</span>
                <Package className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1 font-medium">
                  {c.rotulo}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {ROTULO_TIPO_CAIXA[c.tipoCaixa]}
                    {c.medicoNome ? ` · Dr(a). ${c.medicoNome}` : ""}
                  </span>
                </span>
                {montando ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={retirar.isPending}
                    onClick={() => retirar.mutate({ token, cargaId: carga.id, caixaId: c.id })}
                  >
                    <X className="size-4" aria-hidden="true" /> Retirar
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        {montando ? (
          <Button
            size="lg"
            className="h-16 w-full text-xl"
            disabled={n === 0 || iniciar.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Iniciar o ciclo ${carga.cicloNome} (${duracaoCiclo(carga.duracaoMin)}) na ${carga.maquina.nome} com ${n} ${n === 1 ? "caixa" : "caixas"}? Depois de iniciar, não dá para incluir nem retirar caixas.`,
                )
              ) {
                iniciar.mutate();
              }
            }}
          >
            <Play className="size-6" aria-hidden="true" /> Iniciar ciclo
          </Button>
        ) : pronto ? (
          <Button
            size="lg"
            className="h-16 w-full text-xl"
            disabled={arsenal.isPending}
            onClick={() => arsenal.mutate()}
          >
            <Warehouse className="size-6" aria-hidden="true" />
            {n === 1
              ? "Confirmar: a caixa foi para o arsenal"
              : `Confirmar: as ${n} caixas foram para o arsenal`}
          </Button>
        ) : null}

        {modoTeste ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
            <p>Modo de teste: cancelar apaga esta carga e libera a máquina.</p>
            <Button
              variant="outline"
              disabled={cancelar.isPending}
              onClick={() => {
                if (window.confirm("Cancelar e apagar esta carga? Use só para teste.")) {
                  cancelar.mutate();
                }
              }}
            >
              Cancelar ciclo (teste)
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
