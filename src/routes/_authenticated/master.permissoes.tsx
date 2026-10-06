import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAPEIS, RECURSOS, ROTULO_NIVEL, type Nivel } from "@/lib/permissoes";

export const Route = createFileRoute("/_authenticated/master/permissoes")({
  component: Permissoes,
});

function Celula({ nivel, obs }: { nivel: Nivel; obs?: string | undefined }) {
  const variante =
    nivel === "sim" ? "default" : nivel === "nao" ? "outline" : ("secondary" as const);
  return (
    <div className="space-y-1">
      <Badge variant={variante} className={nivel === "nao" ? "text-muted-foreground" : ""}>
        {ROTULO_NIVEL[nivel]}
      </Badge>
      {obs ? <p className="text-xs text-muted-foreground">{obs}</p> : null}
    </div>
  );
}

function Permissoes() {
  const grupos = ["Plataforma", "Hospital", "Módulos"] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {PAPEIS.map((p) => (
          <Card key={p.valor}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.nome}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.descricao}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{p.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {grupos.map((g) => (
        <Card key={g}>
          <CardHeader>
            <CardTitle>{g}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Recurso</th>
                  {PAPEIS.map((p) => (
                    <th key={p.valor} className="py-2 pr-4 font-medium">
                      {p.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECURSOS.filter((r) => r.grupo === g).map((r) => (
                  <tr key={r.chave} className="border-b last:border-0 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">{r.descricao}</p>
                    </td>
                    {PAPEIS.map((p) => (
                      <td key={p.valor} className="py-3 pr-4">
                        <Celula nivel={r.niveis[p.valor]} obs={r.observacao?.[p.valor]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
