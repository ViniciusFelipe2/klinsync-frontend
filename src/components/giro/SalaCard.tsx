import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, CheckCircle2, CircleDot, Clock, Stethoscope } from "lucide-react";
import {
  finalizarEtapa as finalizarEtapaApi,
  finalizarParada,
  iniciarEtapa as iniciarEtapaApi,
  iniciarParada,
} from "@/lib/api/giro";
import { mensagemAmigavel } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cronometro } from "@/components/giro/Cronometro";
import {
  ETAPA_LABEL,
  formatDataHora,
  statusLabel,
  statusTone,
  type EventoGiro,
  type EventoParada,
  type Sala,
  type TipoEvento,
} from "@/lib/giro";

const toneClasses: Record<"livre" | "processo" | "parada", string> = {
  livre: "bg-livre text-livre-foreground",
  processo: "bg-processo text-processo-foreground",
  parada: "bg-parada text-parada-foreground",
};

export function SalaCard({
  sala,
  eventos,
  paradaAberta,
}: {
  sala: Sala;
  eventos: EventoGiro[];
  paradaAberta: EventoParada | null;
}) {
  const queryClient = useQueryClient();
  const [pendente, setPendente] = useState(false);
  const [proximaCirurgia, setProximaCirurgia] = useState("");
  const parada = paradaAberta !== null;
  const tone = statusTone(sala.status_atual, parada);

  const enfermagemAberta = eventos.find((e) => e.tipo_evento === "desmontagem" && !e.fim) ?? null;
  const limpezaAberta = eventos.find((e) => e.tipo_evento === "limpeza" && !e.fim) ?? null;
  const limpezaDoCicloFinalizada = enfermagemAberta
    ? eventos.some(
        (e) =>
          e.tipo_evento === "limpeza" &&
          e.fim !== null &&
          new Date(e.inicio).getTime() >= new Date(enfermagemAberta.inicio).getTime(),
      )
    : false;

  const executar = async (fn: () => Promise<unknown>, ok: string): Promise<boolean> => {
    setPendente(true);
    try {
      await fn();
    } catch (err) {
      toast.error(mensagemAmigavel(err));
      return false;
    } finally {
      setPendente(false);
    }
    toast.success(ok);
    void queryClient.invalidateQueries();
    return true;
  };

  // O servidor identifica o usuário pelo token e registra a cirurgia anterior da sala.
  const iniciarEtapa = (tipo: TipoEvento) =>
    executar(() => iniciarEtapaApi(sala.id, tipo), `${ETAPA_LABEL[tipo]} iniciada`);

  const finalizarEtapa = async (evento: EventoGiro) => {
    const proxima = proximaCirurgia.trim();
    if (evento.tipo_evento === "desmontagem" && proxima.length === 0) {
      toast.error("Informe a próxima cirurgia antes de finalizar a enfermagem");
      return;
    }
    const ok = await executar(
      () =>
        finalizarEtapaApi(evento.id, evento.tipo_evento === "desmontagem" ? proxima : undefined),
      `${ETAPA_LABEL[evento.tipo_evento]} finalizada`,
    );
    if (ok && evento.tipo_evento === "desmontagem") setProximaCirurgia("");
  };

  const alternarParada = () => {
    if (paradaAberta) {
      return executar(() => finalizarParada(paradaAberta.id), "Sala liberada");
    }
    return executar(() => iniciarParada(sala.id), "Sala marcada como parada");
  };

  // Regras:
  // - Enfermagem inicia com a sala livre.
  // - Limpeza pode iniciar assim que a enfermagem começar (correm em paralelo).
  // - Enfermagem só finaliza depois que a limpeza do ciclo for finalizada.
  const podeIniciarEnfermagem = !enfermagemAberta && sala.status_atual === "livre";
  const podeFinalizarEnfermagem = !!enfermagemAberta && limpezaDoCicloFinalizada;
  const podeIniciarLimpeza = !!enfermagemAberta && !limpezaAberta && !limpezaDoCicloFinalizada;
  const podeFinalizarLimpeza = !!limpezaAberta;

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:gap-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold sm:text-2xl">{sala.nome}</h3>
          <p className="text-xs text-muted-foreground">
            Atualizado em {formatDataHora(sala.updated_at)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide sm:px-4 sm:py-1.5 sm:text-sm ${toneClasses[tone]}`}
        >
          {statusLabel(sala.status_atual, parada)}
        </span>
      </div>

      <div className="grid gap-2 rounded-lg bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
          {enfermagemAberta ? (
            <p className="text-sm font-semibold text-enfermagem-strong">
              Enfermagem ·{" "}
              <Cronometro inicio={enfermagemAberta.inicio} className="tabular text-lg font-bold" />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Enfermagem não iniciada</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
          {limpezaAberta ? (
            <p className="text-sm font-semibold text-limpeza-strong">
              Limpeza ·{" "}
              <Cronometro inicio={limpezaAberta.inicio} className="tabular text-lg font-bold" />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {limpezaDoCicloFinalizada ? "Limpeza finalizada" : "Limpeza não iniciada"}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 rounded-lg border border-dashed px-4 py-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm">
            <span className="text-muted-foreground">Cirurgia montada na sala: </span>
            <span className="font-semibold">{sala.cirurgia_atual ?? "—"}</span>
          </p>
        </div>
        {enfermagemAberta ? (
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">
              Desmontando:{" "}
              <span className="font-semibold">{enfermagemAberta.cirurgia_anterior ?? "—"}</span>
            </p>
            <label className="text-xs font-semibold" htmlFor={`prox-${sala.id}`}>
              Próxima cirurgia (obrigatória para finalizar a enfermagem)
            </label>
            <Input
              id={`prox-${sala.id}`}
              value={proximaCirurgia}
              onChange={(e) => setProximaCirurgia(e.target.value)}
              placeholder="Ex.: Colecistectomia — Dr. Silva — 14h"
              disabled={pendente}
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="lg"
          className="h-14 whitespace-normal bg-enfermagem px-2 text-xs leading-tight font-semibold sm:h-16 text-enfermagem-foreground hover:bg-enfermagem/90 sm:text-base"
          disabled={pendente || !podeIniciarEnfermagem}
          onClick={() => void iniciarEtapa("desmontagem")}
        >
          <CircleDot className="size-5" aria-hidden="true" />
          Início Enfermagem
        </Button>
        <Button
          size="lg"
          className="h-14 whitespace-normal bg-enfermagem-strong px-2 text-xs leading-tight font-semibold sm:h-16 text-enfermagem-foreground hover:bg-enfermagem-strong/90 sm:text-base"
          disabled={pendente || !podeFinalizarEnfermagem}
          onClick={() => enfermagemAberta && void finalizarEtapa(enfermagemAberta)}
        >
          <CheckCircle2 className="size-5" aria-hidden="true" />
          Final Enfermagem
        </Button>
        <Button
          size="lg"
          className="h-14 whitespace-normal bg-limpeza px-2 text-xs leading-tight font-semibold sm:h-16 text-limpeza-foreground hover:bg-limpeza/90 sm:text-base"
          disabled={pendente || !podeIniciarLimpeza}
          onClick={() => void iniciarEtapa("limpeza")}
        >
          <CircleDot className="size-5" aria-hidden="true" />
          Início Limpeza
        </Button>
        <Button
          size="lg"
          className="h-14 whitespace-normal bg-limpeza-strong px-2 text-xs leading-tight font-semibold sm:h-16 text-limpeza-foreground hover:bg-limpeza-strong/90 sm:text-base"
          disabled={pendente || !podeFinalizarLimpeza}
          onClick={() => limpezaAberta && void finalizarEtapa(limpezaAberta)}
        >
          <CheckCircle2 className="size-5" aria-hidden="true" />
          Final Limpeza
        </Button>
      </div>

      <div className="border-t pt-4">
        <Button
          size="lg"
          variant={parada ? "destructive" : "outline"}
          className="min-h-14 h-auto w-full whitespace-normal px-3 py-3 text-center text-sm font-bold uppercase tracking-wide leading-tight sm:min-h-16 sm:text-base"
          disabled={pendente}
          onClick={() => void alternarParada()}
        >
          <Ban className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 whitespace-normal text-center">
            {parada ? "Sala Parada — clique para liberar" : "Sala Liberada — clique para parar"}
          </span>
        </Button>
        {paradaAberta ? (
          <p className="mt-2 text-center text-sm font-semibold text-parada">
            Parada há <Cronometro inicio={paradaAberta.inicio} className="tabular" />
          </p>
        ) : null}
      </div>
    </section>
  );
}
