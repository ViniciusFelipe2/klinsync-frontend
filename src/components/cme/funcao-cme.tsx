import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { definirFuncaoCme } from "@/lib/api/cme";
import { salasDoTenantMaster } from "@/lib/api/medsync";

const NENHUMA = "nenhuma";
const CHEFE = "chefe";
const ESTACAO_CME = "estacao_cme";
const PREFIXO_SALA = "sala:";

/**
 * Escolha, pela equipe master, do que um login do módulo CME faz:
 * chefe do CME, computador do CME, computador de uma sala cirúrgica, ou nada ainda.
 */
export function FuncaoCme({
  usuarioId,
  tenantId,
  tipo,
  salaId,
}: {
  usuarioId: string;
  tenantId: string;
  tipo: string | null;
  salaId: string | null;
}) {
  const qc = useQueryClient();
  const salas = useQuery({
    queryKey: ["master-salas", tenantId],
    queryFn: () => salasDoTenantMaster({ data: { tenantId } }),
  });

  const atual =
    tipo === "chefe"
      ? CHEFE
      : tipo === "estacao_cme"
        ? ESTACAO_CME
        : tipo === "estacao_sala" && salaId
          ? `${PREFIXO_SALA}${salaId}`
          : NENHUMA;

  const definir = useMutation({
    mutationFn: (valor: string) =>
      definirFuncaoCme(
        valor === CHEFE
          ? { usuarioId, funcao: "chefe" }
          : valor === ESTACAO_CME
            ? { usuarioId, funcao: "estacao_cme" }
            : valor.startsWith(PREFIXO_SALA)
              ? { usuarioId, funcao: "estacao_sala", salaId: valor.slice(PREFIXO_SALA.length) }
              : { usuarioId, funcao: null },
      ),
    onSuccess: () => {
      toast.success("Função no CME atualizada.");
      void qc.invalidateQueries({ queryKey: ["master-cme-contas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Select value={atual} onValueChange={(v) => definir.mutate(v)} disabled={definir.isPending}>
      <SelectTrigger className="h-8 w-64" aria-label="Função no CME">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUMA}>Sem função no CME</SelectItem>
        <SelectItem value={CHEFE}>Chefe do CME</SelectItem>
        <SelectItem value={ESTACAO_CME}>
          Computador do CME (expurgo, preparo, esterilização)
        </SelectItem>
        {(salas.data?.salas ?? [])
          .filter((s) => s.ativa)
          .map((s) => (
            <SelectItem key={s.id} value={`${PREFIXO_SALA}${s.id}`}>
              Computador da {s.nome}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
