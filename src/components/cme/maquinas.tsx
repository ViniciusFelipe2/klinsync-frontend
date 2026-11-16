import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { duracaoCiclo } from "@/components/cme/esterilizacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listarMaquinas, salvarMaquina, type MaquinaCme } from "@/lib/api/cme";

type CicloEmEdicao = { id?: string; nome: string; minutos: string };
type MaquinaEmEdicao = { id?: string; nome: string; ativo: boolean; ciclos: CicloEmEdicao[] };

const MAQUINA_NOVA: MaquinaEmEdicao = {
  nome: "",
  ativo: true,
  ciclos: [{ nome: "", minutos: "" }],
};

function DialogoMaquina({
  maquina,
  aoFechar,
}: {
  maquina: MaquinaEmEdicao | null;
  aoFechar: () => void;
}) {
  const qc = useQueryClient();
  const [dados, setDados] = useState<MaquinaEmEdicao>(MAQUINA_NOVA);
  const [aberta, setAberta] = useState<MaquinaEmEdicao | null>(null);
  if (maquina !== aberta) {
    setAberta(maquina);
    if (maquina) setDados(maquina);
  }

  const mudarCiclo = (i: number, campo: Partial<CicloEmEdicao>) =>
    setDados((d) => ({ ...d, ciclos: d.ciclos.map((c, n) => (n === i ? { ...c, ...campo } : c)) }));

  const salvar = useMutation({
    mutationFn: () =>
      salvarMaquina({
        ...(dados.id ? { id: dados.id } : {}),
        nome: dados.nome,
        ativo: dados.ativo,
        ciclos: dados.ciclos.map((c) => ({
          ...(c.id ? { id: c.id } : {}),
          nome: c.nome,
          duracaoMin: Number(c.minutos),
        })),
      }),
    onSuccess: () => {
      toast.success(dados.id ? "Máquina atualizada." : "Máquina cadastrada.");
      void qc.invalidateQueries({ queryKey: ["cme-maquinas"] });
      void qc.invalidateQueries({ queryKey: ["cme-painel"] });
      aoFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!maquina} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dados.id ? "Editar máquina" : "Nova máquina"}</DialogTitle>
          <DialogDescription>
            Cada ciclo tem um nome e o tempo em minutos. É esse tempo que a tela da esterilização
            conta até a carga ficar pronta.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="maquina-nome">Nome da máquina</Label>
            <Input
              id="maquina-nome"
              required
              minLength={2}
              maxLength={60}
              placeholder="Ex.: Autoclave 1"
              value={dados.nome}
              onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Ciclos</legend>
            {dados.ciclos.map((c, i) => (
              <div key={c.id ?? `novo-${i}`} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  {i === 0 ? <Label htmlFor="ciclo-nome-0">Nome</Label> : null}
                  <Input
                    id={`ciclo-nome-${i}`}
                    aria-label={`Nome do ciclo ${i + 1}`}
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="Ex.: Leve"
                    value={c.nome}
                    onChange={(e) => mudarCiclo(i, { nome: e.target.value })}
                  />
                </div>
                <div className="w-28 space-y-1">
                  {i === 0 ? <Label htmlFor="ciclo-min-0">Minutos</Label> : null}
                  <Input
                    id={`ciclo-min-${i}`}
                    aria-label={`Minutos do ciclo ${i + 1}`}
                    required
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1440}
                    value={c.minutos}
                    onChange={(e) => mudarCiclo(i, { minutos: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover o ciclo ${i + 1}`}
                  disabled={dados.ciclos.length === 1}
                  onClick={() =>
                    setDados((d) => ({ ...d, ciclos: d.ciclos.filter((_, n) => n !== i) }))
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDados((d) => ({ ...d, ciclos: [...d.ciclos, { nome: "", minutos: "" }] }))
              }
            >
              <Plus className="size-4" aria-hidden="true" /> Outro ciclo
            </Button>
          </fieldset>

          {dados.id ? (
            <div className="flex items-center gap-3">
              <Switch
                id="maquina-ativa"
                checked={dados.ativo}
                onCheckedChange={(v) => setDados((d) => ({ ...d, ativo: v }))}
              />
              <Label htmlFor="maquina-ativa">
                Máquina em uso (desligue se ela saiu de operação; o histórico fica)
              </Label>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const paraEdicao = (m: MaquinaCme): MaquinaEmEdicao => ({
  id: m.id,
  nome: m.nome,
  ativo: m.ativo,
  ciclos: m.ciclos.map((c) => ({ id: c.id, nome: c.nome, minutos: String(c.duracaoMin) })),
});

/** Máquinas de esterilização e os ciclos de cada uma. Só o chefe do CME altera. */
export function Maquinas() {
  const q = useQuery({ queryKey: ["cme-maquinas"], queryFn: listarMaquinas });
  const [editando, setEditando] = useState<MaquinaEmEdicao | null>(null);
  const maquinas = q.data?.maquinas ?? [];

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Máquinas de esterilização</CardTitle>
        <Button onClick={() => setEditando(MAQUINA_NOVA)}>
          <Plus className="size-4" aria-hidden="true" /> Nova máquina
        </Button>
      </CardHeader>
      <CardContent>
        {maquinas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {q.isLoading
              ? "Carregando..."
              : "Nenhuma máquina cadastrada. Cadastre as autoclaves e o tempo de cada ciclo para a equipe usar a tela de esterilização."}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {maquinas.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.nome}
                    {!m.ativo ? (
                      <Badge variant="outline" className="ml-2">
                        Fora de uso
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.ciclos.length === 0
                      ? "Sem ciclos"
                      : m.ciclos
                          .map((c) => `${c.nome} (${duracaoCiclo(c.duracaoMin)})`)
                          .join(" · ")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditando(paraEdicao(m))}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <DialogoMaquina maquina={editando} aoFechar={() => setEditando(null)} />
    </Card>
  );
}
