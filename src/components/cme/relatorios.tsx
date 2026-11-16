import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROTULO_PECA, relatorioFalhas, resumoTestes } from "@/lib/api/cme";
import { baixarPlanilha } from "@/lib/exportar";

const dataHora = (v: string) => new Date(v).toLocaleString("pt-BR");
const celula = "px-3 py-2 text-left";

/** Itens que mais precisaram de digitação manual ou não leram: é daqui que sai a decisão de remarcar a peça. */
export function RelatorioFalhas() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const q = useQuery({
    queryKey: ["cme-falhas", de, ate],
    queryFn: () => relatorioFalhas({ de, ate }),
  });
  const itens = q.data?.itens ?? [];
  const desconhecidos = q.data?.desconhecidos ?? [];
  const manuais = q.data?.manuais ?? [];

  const exportar = () =>
    void baixarPlanilha("cme-itens-com-falhas", "Falhas", [
      ["Peça", "Código", "Falhas", "Digitações manuais", "Não leu", "Leituras", "Última falha"],
      ...itens.map((i) => [
        i.rotulo,
        i.codigo,
        i.falhas,
        i.manuais,
        i.nao_leu,
        i.leituras,
        dataHora(i.ultima_falha),
      ]),
    ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Peças com mais falhas</CardTitle>
            <Button variant="outline" size="sm" disabled={itens.length === 0} onClick={exportar}>
              <FileSpreadsheet className="size-4" aria-hidden="true" /> Excel
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="falhas-de">De</Label>
              <Input
                id="falhas-de"
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="falhas-ate">Até</Label>
              <Input
                id="falhas-ate"
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma falha registrada no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className={celula}>Peça</th>
                  <th className={celula}>Código</th>
                  <th className={celula}>Falhas</th>
                  <th className={celula}>Digitações manuais</th>
                  <th className={celula}>Não leu</th>
                  <th className={celula}>Leituras</th>
                  <th className={celula}>Última falha</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className={`${celula} font-medium`}>{i.rotulo}</td>
                    <td className={`${celula} font-mono`}>{i.codigo}</td>
                    <td className={`${celula} font-semibold`}>{i.falhas}</td>
                    <td className={celula}>{i.manuais}</td>
                    <td className={celula}>{i.nao_leu}</td>
                    <td className={celula}>{i.leituras}</td>
                    <td className={celula}>{dataHora(i.ultima_falha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Quando um código não lê, o leitor não envia nada ao sistema. Por isso, as falhas vêm da
            digitação manual e do botão "não leu".
          </p>
        </CardContent>
      </Card>

      {manuais.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Digitações manuais recentes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className={celula}>Quando</th>
                  <th className={celula}>Quem</th>
                  <th className={celula}>Peça</th>
                  <th className={celula}>Código</th>
                  <th className={celula}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {manuais.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className={celula}>{dataHora(m.created_at)}</td>
                    <td className={celula}>{m.quem ?? "—"}</td>
                    <td className={`${celula} font-medium`}>{m.rotulo ?? "Desconhecida"}</td>
                    <td className={`${celula} font-mono`}>{m.texto}</td>
                    <td className={celula}>{m.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {desconhecidos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Códigos lidos que não estão no cadastro</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className={celula}>Texto lido</th>
                  <th className={celula}>Vezes</th>
                  <th className={celula}>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {desconhecidos.map((d) => (
                  <tr key={d.texto} className="border-b last:border-0">
                    <td className={`${celula} font-mono`}>{d.texto}</td>
                    <td className={celula}>{d.vezes}</td>
                    <td className={celula}>{dataHora(d.ultima)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Taxa de sucesso por tipo de peça, somando todos os testes já anotados. */
export function ResumoTestes() {
  const q = useQuery({ queryKey: ["cme-resumo-testes"], queryFn: resumoTestes });
  const linhas = q.data ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado por tipo de peça</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum teste anotado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className={celula}>Tipo de peça</th>
                <th className={celula}>Testes</th>
                <th className={celula}>Taxa de sucesso</th>
                <th className={celula}>De primeira</th>
                <th className={celula}>Média de tentativas</th>
                <th className={celula}>Tempo médio de leitura</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.tipo_peca} className="border-b last:border-0">
                  <td className={`${celula} font-medium`}>{ROTULO_PECA[l.tipo_peca]}</td>
                  <td className={celula}>{l.total}</td>
                  <td className={`${celula} font-semibold`}>
                    {Math.round((l.sucessos / l.total) * 100)}%
                  </td>
                  <td className={celula}>{l.de_primeira}</td>
                  <td className={celula}>{l.media_tentativas.toLocaleString("pt-BR")}</td>
                  <td className={celula}>{l.media_ms === null ? "—" : `${l.media_ms} ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
