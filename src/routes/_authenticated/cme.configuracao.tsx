import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Maquinas } from "@/components/cme/maquinas";
import { Simulador } from "@/components/cme/simulador";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { acessoCme, salvarConfigCme, type ConfigCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme/configuracao")({
  head: () => ({ meta: [{ title: "Configuração do CME | KlinSync" }] }),
  component: Configuracao,
});

type CampoNumerico = Exclude<keyof ConfigCme, "permitirCrachaDigitado">;

const CAMPOS: { chave: CampoNumerico; rotulo: string; ajuda: string }[] = [
  {
    chave: "tamanhoPadraoMm",
    rotulo: "Tamanho padrão do código de itens e caixas (mm)",
    ajuda: "Usado ao abrir a tela de caixas. Pode ser alterado em cada impressão (3 a 15 mm).",
  },
  {
    chave: "tamanhoCrachaMm",
    rotulo: "Tamanho do código no crachá (mm)",
    ajuda: "O crachá tem espaço: um código maior é lido mais rápido (3 a 15 mm).",
  },
  {
    chave: "moduloMinimoMm",
    rotulo: "Menor quadradinho que o leitor lê (mm)",
    ajuda:
      "Abaixo deste valor, a impressão é bloqueada. Veja este número na ficha técnica do leitor.",
  },
  {
    chave: "moduloAvisoMm",
    rotulo: "Limite de aviso, com folga (mm)",
    ajuda: "Abaixo deste valor, a tela mostra um aviso em destaque.",
  },
  {
    chave: "matrizMaxima5mm",
    rotulo: "Maior matriz em códigos de até 5 mm (quadradinhos por lado)",
    ajuda: "Conteúdo que passar disso é bloqueado nesses tamanhos.",
  },
];

const texto = (v: number) => String(v).replace(".", ",");

function Configuracao() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  if (!acesso.data) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  return (
    <div className="space-y-6">
      <Maquinas />
      <Formulario inicial={acesso.data.config} />
      <Simulador tamanhoMm={acesso.data.config.tamanhoPadraoMm} />
    </div>
  );
}

function Formulario({ inicial }: { inicial: ConfigCme }) {
  const qc = useQueryClient();
  const [valores, setValores] = useState<Record<CampoNumerico, string>>({
    tamanhoPadraoMm: texto(inicial.tamanhoPadraoMm),
    tamanhoCrachaMm: texto(inicial.tamanhoCrachaMm),
    moduloMinimoMm: texto(inicial.moduloMinimoMm),
    moduloAvisoMm: texto(inicial.moduloAvisoMm),
    matrizMaxima5mm: String(inicial.matrizMaxima5mm),
  });
  const [digitarCracha, setDigitarCracha] = useState(inicial.permitirCrachaDigitado);

  const numero = (c: CampoNumerico) => Number(valores[c].replace(",", "."));

  const salvar = useMutation({
    mutationFn: () =>
      salvarConfigCme({
        tamanhoPadraoMm: numero("tamanhoPadraoMm"),
        tamanhoCrachaMm: numero("tamanhoCrachaMm"),
        moduloMinimoMm: numero("moduloMinimoMm"),
        moduloAvisoMm: numero("moduloAvisoMm"),
        matrizMaxima5mm: numero("matrizMaxima5mm"),
        permitirCrachaDigitado: digitarCracha,
      }),
    onSuccess: () => {
      toast.success("Configuração salva.");
      void qc.invalidateQueries({ queryKey: ["cme-acesso"] });
      void qc.invalidateQueries({ queryKey: ["cme-caixas"] });
      void qc.invalidateQueries({ queryKey: ["cme-colaboradores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Configuração do CME</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Se o hospital trocar de leitor, atualize os limites conforme a ficha técnica do novo
          aparelho. Toda alteração fica registrada na auditoria.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          {CAMPOS.map((c) => (
            <div key={c.chave} className="space-y-1.5">
              <Label htmlFor={c.chave}>{c.rotulo}</Label>
              <Input
                id={c.chave}
                required
                inputMode="decimal"
                className="max-w-40"
                value={valores[c.chave]}
                onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{c.ajuda}</p>
            </div>
          ))}

          <div
            className={`flex items-start gap-3 rounded-lg border-2 p-3 ${
              digitarCracha ? "border-amber-500 bg-amber-50" : ""
            }`}
          >
            <Switch
              id="digitar-cracha"
              checked={digitarCracha}
              onCheckedChange={setDigitarCracha}
            />
            <div>
              <Label htmlFor="digitar-cracha">
                Modo de teste: permitir digitar o número do crachá na sala
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Para testar sem leitor. No dia a dia, deixe desligado: assim o crachá só entra
                bipado no leitor.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={salvar.isPending}>
            Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
