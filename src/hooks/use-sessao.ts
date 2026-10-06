import { useQuery } from "@tanstack/react-query";
import { getSessaoAtual } from "@/lib/api/medsync";

export function useSessao() {
  const fetcher = getSessaoAtual;
  return useQuery({
    queryKey: ["sessao"],
    queryFn: () => fetcher(),
    staleTime: 30_000,
  });
}
