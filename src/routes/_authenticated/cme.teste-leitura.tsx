import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CampoLeitura } from "@/components/cme/campo-leitura";
import { ResumoTestes } from "@/components/cme/relatorios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Leitura } from "@/hooks/use-leitor";
import {
  ROTULO_PECA,
  listarCodigos,
  registrarTeste,
  type OrigemLeitura,
  type ResultadoTeste,
  type TipoPeca,
} from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme/teste-leitura")({
  head: () => ({ meta: [{ title: "Teste de leitura | KlinSync" }] }),
  component: TesteLeitura,
});

type Registro = {
  id: number;
  hora: string;
  origem: OrigemLeitura;
  visivel: string;
  duracaoMs: number | null;
  pareceLeitor: boolean | null;
  tentativas: number;
  tipoPeca: TipoPeca;
  motivo: string | null;
  r: ResultadoTeste;
};

const MAX_HISTORICO = 20;
const NENHUM = "nenhum";

function Identificacao({ r, origem }: { r: ResultadoTeste; origem: OrigemLeitura }) {
  if (origem === "nao_leu") return <>Peça não leu{r.codigo ? `: ${r.codigo.rotulo}` : ""}</>;
  if (!r.codigo) return <>Desconhecido</>;
  return (
    <>
      {r.codigo.rotulo}
      {r.codigo.ativo ? "" : " (inativo)"}
    </>
  );
}

function TesteLeitura() {
  const qc = useQueryClient();
  const [tipoPeca, setTipoPeca] = useState<TipoPeca>("papel");
  const [tamanho, setTamanho] = useState("");
  const [observacao, setObservacao] = useState("");
  const [tentativas, setTentativas] = useState(1);
  const [pecaTestada, setPecaTestada] = useState(NENHUM);
  const [historico, setHistorico] = useState<Registro[]>([]);

  const codigos = useQuery({
    queryKey: ["cme-codigos", "teste"],
    queryFn: () => listarCodigos({}),
  });

  const registrar = useMutation({
    mutationFn: async (d: {
      origem: OrigemLeitura;
      visivel: string;
      texto?: string;
      duracaoMs?: number;
      pareceLeitor?: boolean;
      motivo?: string;
    }) => {
      const tamanhoMm = Number(tamanho.replace(",", "."));
      const r = await registrarTeste({
        origem: d.origem,
        tipoPeca,
        tentativas,
        ...(d.texto !== undefined ? { texto: d.texto, textoVisivel: d.visivel } : {}),
        ...(d.duracaoMs !== undefined ? { duracaoMs: d.duracaoMs } : {}),
        ...(d.motivo ? { motivo: d.motivo } : {}),
        ...(d.origem === "nao_leu" && pecaTestada !== NENHUM ? { codigoId: pecaTestada } : {}),
        ...(tamanhoMm >= 3 && tamanhoMm <= 15 ? { tamanhoMm } : {}),
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
      });
      return { r, d, tentativas, tipoPeca };
    },
    onSuccess: ({ r, d, tentativas: t, tipoPeca: tp }) => {
      setHistorico((h) =>
        [
          {
            id: Date.now(),
            hora: new Date().toLocaleTimeString("pt-BR"),
            origem: d.origem,
            visivel: d.visivel,
            duracaoMs: d.duracaoMs ?? null,
            pareceLeitor: d.pareceLeitor ?? null,
            tentativas: t,
            tipoPeca: tp,
            motivo: d.motivo ?? null,
            r,
          },
          ...h,
        ].slice(0, MAX_HISTORICO),
      );
      setTentativas(1);
      void qc.invalidateQueries({ queryKey: ["cme-resumo-testes"] });
      void qc.invalidateQueries({ queryKey: ["cme-falhas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aoLer = (l: Leitura) =>
    registrar.mutate({
      origem: "leitor",
      visivel: l.visivel,
      texto: l.texto,
      duracaoMs: l.duracaoMs,
      pareceLeitor: l.pareceLeitor,
    });

  const ultima = historico[0];
  const sucessos = historico.filter((h) => h.r.resultado === "sucesso").length;
  const falhas = historico.length - sucessos;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. O que está sendo testado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de peça</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ROTULO_PECA) as TipoPeca[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={tipoPeca === t ? "default" : "outline"}
                    aria-pressed={tipoPeca === t}
                    onClick={() => setTipoPeca(t)}
                  >
                    {ROTULO_PECA[t]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="teste-tamanho">Tamanho do código (mm)</Label>
                <Input
                  id="teste-tamanho"
                  inputMode="decimal"
                  placeholder="Opcional"
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teste-obs">Observação</Label>
                <Input
                  id="teste-obs"
                  placeholder="Opcional"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Bipe a peça</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CampoLeitura
              aoLer={aoLer}
              ocupado={registrar.isPending}
              aoDigitar={(texto, motivo) =>
                registrar.mutate({ origem: "manual", visivel: texto, texto, motivo })
              }
            />
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">
                Não leu? O leitor não avisa o sistema, então marque aqui.
              </p>
              <Select value={pecaTestada} onValueChange={setPecaTestada}>
                <SelectTrigger aria-label="Peça que não leu">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Peça não identificada</SelectItem>
                  {(codigos.data?.linhas ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.rotulo} · {c.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => setTentativas((t) => t + 1)}>
                  Tentei e não leu (+1)
                </Button>
                <Button
                  variant="destructive"
                  disabled={registrar.isPending}
                  onClick={() =>
                    registrar.mutate({ origem: "nao_leu", visivel: "(nada recebido)" })
                  }
                >
                  Desisti: esta peça não lê
                </Button>
                <span className="text-sm">
                  Esta é a tentativa nº <strong>{tentativas}</strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {ultima ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {ultima.r.resultado === "sucesso" && ultima.r.reconhecido ? (
                <CheckCircle2 className="size-6 text-emerald-600" aria-hidden="true" />
              ) : ultima.r.resultado === "sucesso" ? (
                <CircleAlert className="size-6 text-amber-600" aria-hidden="true" />
              ) : (
                <XCircle className="size-6 text-red-600" aria-hidden="true" />
              )}
              <Identificacao r={ultima.r} origem={ultima.origem} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Texto bruto recebido, com os caracteres invisíveis entre colchetes
              </p>
              <p className="mt-1 rounded-lg bg-secondary p-3 font-mono text-lg break-all">
                {ultima.visivel}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Código considerado</dt>
                <dd className="font-mono">{ultima.r.normalizado || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tempo da leitura</dt>
                <dd>{ultima.duracaoMs === null ? "—" : `${ultima.duracaoMs} ms`}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Veio de</dt>
                <dd>
                  {ultima.origem === "manual"
                    ? "Digitação manual"
                    : ultima.origem === "nao_leu"
                      ? "Registro de falha"
                      : ultima.pareceLeitor
                        ? "Leitor"
                        : "Parece digitação: lento para um leitor"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tentativas</dt>
                <dd>{ultima.tentativas}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>
            Últimas leituras: {sucessos} com sucesso, {falhas} com falha
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={historico.length === 0}
            onClick={() => setHistorico([])}
          >
            Limpar a tela
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma leitura nesta sessão.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Hora</th>
                  <th className="px-2 py-2">Peça</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Texto bruto</th>
                  <th className="px-2 py-2">Tempo</th>
                  <th className="px-2 py-2">Tentativas</th>
                  <th className="px-2 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{h.hora}</td>
                    <td className="px-2 py-2">
                      <Identificacao r={h.r} origem={h.origem} />
                    </td>
                    <td className="px-2 py-2">{ROTULO_PECA[h.tipoPeca]}</td>
                    <td className="px-2 py-2 font-mono break-all">{h.visivel}</td>
                    <td className="px-2 py-2">
                      {h.duracaoMs === null ? "—" : `${h.duracaoMs} ms`}
                    </td>
                    <td className="px-2 py-2">{h.tentativas}</td>
                    <td className="px-2 py-2">{h.motivo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Limpar a tela não apaga nada: todas as leituras continuam registradas no sistema.
          </p>
        </CardContent>
      </Card>

      <ResumoTestes />
    </div>
  );
}
