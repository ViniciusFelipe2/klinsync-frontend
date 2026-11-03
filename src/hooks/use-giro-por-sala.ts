import { useQuery } from "@tanstack/react-query";

import { giroPorSalaHospital } from "@/lib/api/hospital";
import type { FiltroHospital } from "@/lib/periodo";

/** Resumo do período por sala, compartilhado pelos blocos da tela (uma consulta por filtro). */
export function useGiroPorSala(filtro: FiltroHospital) {
  return useQuery({
    queryKey: ["hospital-giro-por-sala", filtro.de, filtro.ate, filtro.sala],
    queryFn: () =>
      giroPorSalaHospital({ data: { de: filtro.de, ate: filtro.ate, salaId: filtro.sala } }),
    refetchInterval: 60_000, // rede de segurança; o canal em tempo real atualiza na hora
  });
}
