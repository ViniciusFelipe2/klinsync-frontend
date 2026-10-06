import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarEventosAbertos,
  listarEventosRecentes,
  listarParadasAbertas,
  listarSalasAtivas,
} from "@/lib/api/giro";

const INTERVALO_ATUALIZACAO_MS = 10_000;

/**
 * Mantém as telas do giro atualizadas. O backend não expõe canal em tempo real
 * (WebSocket/SSE), então as consultas são renovadas por polling enquanto a aba está visível.
 */
export function useRealtimeGiro() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState !== "visible") return;
      void queryClient.invalidateQueries({ queryKey: ["salas"] });
      void queryClient.invalidateQueries({ queryKey: ["eventos_giro"] });
      void queryClient.invalidateQueries({ queryKey: ["eventos_parada"] });
    };
    const id = window.setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    return () => window.clearInterval(id);
  }, [queryClient]);
}

export function useSalas() {
  return useQuery({
    queryKey: ["salas"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: listarSalasAtivas,
  });
}

export function useEventosAbertos() {
  return useQuery({
    queryKey: ["eventos_giro", "abertos"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: listarEventosAbertos,
  });
}

// Eventos das últimas 48h: necessários para saber se a limpeza do ciclo atual já terminou.
export function useEventosRecentes() {
  return useQuery({
    queryKey: ["eventos_giro", "recentes"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: () => listarEventosRecentes(48),
  });
}

export function useParadasAbertas() {
  return useQuery({
    queryKey: ["eventos_parada", "abertos"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: listarParadasAbertas,
  });
}
