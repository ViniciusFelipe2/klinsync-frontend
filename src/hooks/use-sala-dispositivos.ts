import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { garantirSessaoValida } from "@/lib/api/http";
import {
  heartbeatSala,
  liberarSala,
  listarReservas,
  reservarSala,
  type ReservaSala,
} from "@/lib/api/giro";

export type { ReservaSala };

/** Vínculo permanente: a reserva só some quando alguém libera a sala. */
export function reservaAtiva(reserva: ReservaSala | undefined | null) {
  return Boolean(reserva);
}

export function useReservas() {
  return useQuery({
    queryKey: ["sala_dispositivos"],
    refetchInterval: 15_000,
    queryFn: listarReservas,
  });
}

export function useReservarSala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ salaId, deviceId }: { salaId: string; deviceId: string }) => {
      const r = await reservarSala(salaId, deviceId);
      return Boolean(r.reservada);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sala_dispositivos"] });
    },
  });
}

export function useLiberarSala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ salaId, deviceId }: { salaId: string; deviceId: string }) => {
      await liberarSala(salaId, deviceId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sala_dispositivos"] });
    },
  });
}

/** Mantém a reserva viva: por intervalo e sempre que o tablet "acorda". */
export function useHeartbeatSala(salaId: string, deviceId: string) {
  useEffect(() => {
    if (!salaId || !deviceId) return;
    let ultimo = 0;
    const bater = () => {
      if (Date.now() - ultimo < 20_000) return;
      ultimo = Date.now();
      void heartbeatSala(salaId, deviceId).catch(() => undefined);
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") bater();
    };
    bater();
    const id = window.setInterval(bater, 60_000);
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", bater);
    window.addEventListener("online", bater);
    window.addEventListener("pointerdown", bater);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", bater);
      window.removeEventListener("online", bater);
      window.removeEventListener("pointerdown", bater);
    };
  }, [salaId, deviceId]);
}

/**
 * Modo quiosque: renova a sessão periodicamente e ao acordar a tela,
 * e força nova busca de dados quando o tablet volta da suspensão.
 */
export function useKioskKeepAlive(onWake: () => void) {
  useEffect(() => {
    const renovar = () => garantirSessaoValida(15 * 60 * 1000);
    const acordar = () => {
      if (document.visibilityState !== "visible") return;
      void renovar().finally(onWake);
    };
    void renovar();
    const id = window.setInterval(() => void renovar(), 5 * 60 * 1000);
    document.addEventListener("visibilitychange", acordar);
    window.addEventListener("focus", acordar);
    window.addEventListener("online", acordar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", acordar);
      window.removeEventListener("focus", acordar);
      window.removeEventListener("online", acordar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
