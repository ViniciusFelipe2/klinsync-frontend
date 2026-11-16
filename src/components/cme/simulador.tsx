import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AlertaAvaliacao, DataMatrixSvg, MedidasCodigo } from "@/components/cme/data-matrix";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { previaCodigo } from "@/lib/api/cme";

/** Mostra a matriz e o quadradinho que um conteúdo daria, antes de decidir usá-lo. */
export function Simulador({ tamanhoMm }: { tamanhoMm: number }) {
  const [conteudo, setConteudo] = useState("");
  const previa = useMutation({
    mutationFn: () => previaCodigo({ conteudo, tamanhoMm }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Simular um conteúdo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Veja o tamanho da matriz e do quadradinho que um conteúdo daria em {tamanhoMm} mm.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            previa.mutate();
          }}
        >
          <Input
            aria-label="Conteúdo do código"
            required
            placeholder="Ex.: 20481357"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={previa.isPending}>
            Simular
          </Button>
        </form>
        {previa.data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {previa.data.matriz ? (
                <DataMatrixSvg matriz={previa.data.matriz} tamanhoMm={tamanhoMm} />
              ) : null}
              <MedidasCodigo avaliacao={previa.data.avaliacao} />
            </div>
            <AlertaAvaliacao avaliacao={previa.data.avaliacao} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
