import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import {
  assinarTempoReal,
  estadoTempoReal,
  observarEstadoTempoReal,
  type EstadoTempoReal,
  type TipoAviso,
} from "@/lib/api/tempo-real";

/** Evento de janela para telas que não usam React Query (ex.: painel de check-in). */
export const EVENTO_TEMPO_REAL = "klinsync:tempo-real";

/** Consultas (primeiro item da chave) que um aviso torna desatualizadas. */
const AFETADAS: Record<Exclude<TipoAviso, "reconectado">, string[]> = {
  giro: [
    "salas",
    "eventos_giro",
    "eventos_parada",
    "hospital-resumo",
    "hospital-giro",
    "hospital-giro-stats",
    "hospital-paradas",
    "hospital-paradas-stats",
    "hospital-salas",
    "historico",
  ],
  reserva: ["sala_dispositivos"],
  checkin: ["hospital-checkins", "hospital-resumo"],
  salas: ["salas", "hospital-salas", "hospital-resumo", "sala_dispositivos"],
};

/**
 * Mantém as telas atualizadas na hora, sem F5: cada alteração feita por outro tablet/usuário do hospital
 * chega por um canal em tempo real e as consultas afetadas são buscadas de novo. Os intervalos de
 * atualização existentes continuam como rede de segurança.
 */
export function useTempoReal(ativo = true): EstadoTempoReal {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ativo) return;
    let pendentes = new Set<TipoAviso>();
    let timer: number | undefined;

    const aplicar = () => {
      timer = undefined;
      const tipos = pendentes;
      pendentes = new Set();
      if (tipos.has("reconectado")) {
        // Pode ter perdido avisos enquanto estava desconectado: rebusca tudo o que está em uso.
        void queryClient.invalidateQueries();
      } else {
        const chaves = new Set<string>();
        tipos.forEach((t) => {
          if (t !== "reconectado") AFETADAS[t].forEach((c) => chaves.add(c));
        });
        void queryClient.invalidateQueries({
          predicate: (q) => typeof q.queryKey[0] === "string" && chaves.has(q.queryKey[0]),
        });
      }
      tipos.forEach((t) => window.dispatchEvent(new CustomEvent(EVENTO_TEMPO_REAL, { detail: t })));
    };

    const parar = assinarTempoReal((tipo) => {
      pendentes.add(tipo);
      // Agrupa rajadas (ex.: várias salas mudando juntas) em uma única atualização.
      if (timer === undefined) timer = window.setTimeout(aplicar, 250);
    });
    return () => {
      parar();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [ativo, queryClient]);

  return useSyncExternalStore(
    observarEstadoTempoReal,
    estadoTempoReal,
    () => "conectando" as const,
  );
}

/** Só lê o estado da conexão (para indicadores), sem abrir conexão própria. */
export function useEstadoTempoReal(): EstadoTempoReal {
  return useSyncExternalStore(
    observarEstadoTempoReal,
    estadoTempoReal,
    () => "conectando" as const,
  );
}
