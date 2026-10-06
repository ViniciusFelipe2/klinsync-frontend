import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SalaCard } from "@/components/giro/SalaCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventosRecentes, useParadasAbertas, useRealtimeGiro, useSalas } from "@/hooks/use-giro";
import {
  reservaAtiva,
  useHeartbeatSala,
  useKioskKeepAlive,
  useLiberarSala,
  useReservarSala,
  useReservas,
} from "@/hooks/use-sala-dispositivos";
import type { ReservaSala } from "@/hooks/use-sala-dispositivos";
import { getDeviceId, isPreviewEnvironment } from "@/lib/device";

const STORAGE_KEY = "giro:sala-tablet";

export const Route = createFileRoute("/_authenticated/giro-sala/")({
  head: () => ({
    meta: [
      { title: "Tela Operacional | Giro de Sala" },
      {
        name: "description",
        content:
          "Registre desmontagem, limpeza e remontagem de cada sala cirúrgica com cronômetro ao vivo.",
      },
      { property: "og:title", content: "Tela Operacional | Giro de Sala" },
      {
        property: "og:description",
        content: "Botões de giro por sala cirúrgica com cronômetro em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Operacional,
});

function Operacional() {
  useRealtimeGiro();
  const queryClient = useQueryClient();
  useKioskKeepAlive(() => void queryClient.invalidateQueries());
  const salas = useSalas();
  const eventos = useEventosRecentes();
  const paradas = useParadasAbertas();
  const reservas = useReservas();
  const reservar = useReservarSala();
  const liberar = useLiberarSala();

  const [salaSelecionada, setSalaSelecionada] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [modoPreview, setModoPreview] = useState(false);

  useEffect(() => {
    const preview = isPreviewEnvironment();
    setModoPreview(preview);
    if (!preview) setDeviceId(getDeviceId());
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    if (salvo) setSalaSelecionada(salvo);
  }, []);

  const lista = salas.data ?? [];

  const reservaPorSala = useMemo(() => {
    const mapa = new Map<string, ReservaSala>();
    for (const r of reservas.data ?? []) mapa.set(r.sala_id, r);
    return mapa;
  }, [reservas.data]);

  const ocupadaPorOutro = (salaId: string) => {
    if (modoPreview) return false;
    const r = reservaPorSala.get(salaId);
    return Boolean(r && r.device_id !== deviceId && reservaAtiva(r));
  };

  // Se a sala salva foi desativada/removida, exige uma nova escolha.
  useEffect(() => {
    if (!salaSelecionada || lista.length === 0) return;
    if (!lista.some((s) => s.id === salaSelecionada)) {
      setSalaSelecionada("");
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [lista, salaSelecionada]);

  // Reconfirma a reserva ao abrir a tela (e libera se outro tablet assumiu).
  useEffect(() => {
    if (modoPreview || !salaSelecionada || !deviceId) return;
    let cancelado = false;
    void reservar
      .mutateAsync({ salaId: salaSelecionada, deviceId })
      .then((ok) => {
        if (cancelado || ok) return;
        toast.error("Esta sala está em uso em outro tablet. Escolha outra sala.");
        setSalaSelecionada("");
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaSelecionada, deviceId, modoPreview]);

  useHeartbeatSala(modoPreview ? "" : salaSelecionada, deviceId);

  const escolher = async (valor: string) => {
    if (modoPreview) {
      setSalaSelecionada(valor);
      window.localStorage.setItem(STORAGE_KEY, valor);
      return;
    }
    if (!deviceId) return;
    try {
      const ok = await reservar.mutateAsync({ salaId: valor, deviceId });
      if (!ok) {
        toast.error("Esta sala já está em uso em outro tablet.");
        return;
      }
      setSalaSelecionada(valor);
      window.localStorage.setItem(STORAGE_KEY, valor);
    } catch {
      toast.error("Não foi possível reservar a sala. Tente novamente.");
    }
  };

  const liberarEsta = async () => {
    if (!salaSelecionada) return;
    if (!modoPreview && deviceId) {
      await liberar.mutateAsync({ salaId: salaSelecionada, deviceId });
    }
    setSalaSelecionada("");
    window.localStorage.removeItem(STORAGE_KEY);
    toast.success("Sala liberada para outro tablet.");
  };

  const visiveis = salaSelecionada ? lista.filter((s) => s.id === salaSelecionada) : [];

  return (
    <div className="min-h-screen bg-surface">
      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 grid justify-items-center gap-3 sm:mb-6">
          <h1 className="font-display text-center text-2xl font-bold sm:text-3xl">
            Salas Cirúrgicas
          </h1>
          <div className="grid w-full max-w-sm gap-1">
            <label
              className="text-center text-xs font-semibold text-muted-foreground"
              htmlFor="seletor-sala"
            >
              Sala deste tablet
            </label>
            <Select value={salaSelecionada} onValueChange={(v) => void escolher(v)}>
              <SelectTrigger id="seletor-sala" className="h-12 w-full text-base">
                <SelectValue placeholder="Selecione a sala" />
              </SelectTrigger>
              <SelectContent>
                {lista.map((sala) => {
                  const bloqueada = ocupadaPorOutro(sala.id);
                  return (
                    <SelectItem key={sala.id} value={sala.id} disabled={bloqueada}>
                      {sala.nome}
                      {bloqueada ? " — em uso em outro tablet" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {modoPreview ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Modo visualização (editor): esta tela não reserva sala.
              </p>
            ) : null}
          </div>
        </div>
        {salas.isLoading ? (
          <p className="text-muted-foreground">Carregando salas...</p>
        ) : !salaSelecionada ? (
          <p className="text-center text-muted-foreground">
            Selecione a sala deste tablet para continuar.
          </p>
        ) : (
          <div className="mx-auto grid max-w-2xl gap-4">
            {visiveis.map((sala) => (
              <SalaCard
                key={sala.id}
                sala={sala}
                eventos={(eventos.data ?? []).filter((e) => e.sala_id === sala.id)}
                paradaAberta={(paradas.data ?? []).find((p) => p.sala_id === sala.id) ?? null}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              className="mx-auto h-11 w-full max-w-xs"
              onClick={() => void liberarEsta()}
              disabled={liberar.isPending}
            >
              Liberar esta sala deste tablet
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
