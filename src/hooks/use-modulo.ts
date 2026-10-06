import { useQuery } from "@tanstack/react-query";
import { getAcessoModulo } from "@/lib/api/modulos";

export function useModulo(chave: string) {
  const fetcher = getAcessoModulo;
  return useQuery({
    queryKey: ["acesso-modulo", chave],
    queryFn: () => fetcher({ data: { chave } }),
    staleTime: 30_000,
  });
}
