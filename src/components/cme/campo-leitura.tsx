import { Keyboard, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLeitor, type Leitura } from "@/hooks/use-leitor";

const INTERVALO_DO_FOCO_MS = 200;

/**
 * Campo de leitura das telas do CME: fica sempre em foco para receber o leitor e
 * oferece a digitação manual de contingência (com motivo, salvo quando exigirMotivo for falso).
 */
export function CampoLeitura({
  aoLer,
  aoDigitar,
  ocupado = false,
  permitirDigitacao = true,
  exigirMotivo = true,
  rotuloDigitacao = "Digitar o código à mão",
  rotuloCampo = "Código da peça",
}: {
  aoLer: (leitura: Leitura) => void;
  aoDigitar: (codigo: string, motivo: string) => void;
  ocupado?: boolean;
  permitirDigitacao?: boolean;
  exigirMotivo?: boolean;
  rotuloDigitacao?: string;
  rotuloCampo?: string;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [emFoco, setEmFoco] = useState(false);
  const [manual, setManual] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [motivo, setMotivo] = useState("");
  const { aoTeclar, recebendo, semEnter, limpar } = useLeitor(aoLer);

  // O foco não pode ficar em um botão: o Enter do leitor "apertaria" o botão. Só cede a quem está preenchendo outro campo.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (manual) return;
      const ativo = document.activeElement;
      if (ativo === campo.current) return;
      const preenchendo =
        ativo instanceof HTMLInputElement ||
        ativo instanceof HTMLTextAreaElement ||
        ativo?.closest('[role="listbox"], [role="dialog"]');
      if (!preenchendo) campo.current?.focus();
    }, INTERVALO_DO_FOCO_MS);
    return () => window.clearInterval(id);
  }, [manual]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="campo-leitura" className="flex items-center gap-2">
          <ScanLine className="size-4" aria-hidden="true" />
          {emFoco ? "Pronto: pode bipar" : "Clique aqui antes de bipar"}
        </Label>
        <input
          id="campo-leitura"
          ref={campo}
          autoFocus
          readOnly
          autoComplete="off"
          value={recebendo}
          onKeyDown={aoTeclar}
          onFocus={() => setEmFoco(true)}
          onBlur={() => setEmFoco(false)}
          placeholder="Aguardando leitura..."
          className={`mt-2 h-14 w-full rounded-lg border-2 bg-card px-4 font-mono text-lg outline-none ${
            emFoco ? "border-emerald-500" : "border-amber-500"
          }`}
        />
      </div>

      {semEnter ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            O código chegou, mas sem o Enter no final. Configure o leitor para enviar Enter depois
            de cada leitura.
          </p>
          <Button size="sm" variant="outline" onClick={limpar}>
            Limpar
          </Button>
        </div>
      ) : null}

      {manual ? (
        <form
          className="space-y-3 rounded-lg border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (ocupado) return;
            if (exigirMotivo && motivo.trim().length < 3) {
              toast.error("Informe o motivo da digitação manual.");
              return;
            }
            aoDigitar(codigo, motivo.trim());
            setCodigo("");
            setMotivo("");
            setManual(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="manual-codigo">{rotuloCampo}</Label>
            <Input
              id="manual-codigo"
              required
              autoFocus
              autoComplete="off"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          {exigirMotivo ? (
            <div className="space-y-1.5">
              <Label htmlFor="manual-motivo">Motivo</Label>
              <Input
                id="manual-motivo"
                required
                placeholder="Ex.: a peça não leu, código gasto"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={ocupado}>
              Registrar
            </Button>
            <Button type="button" variant="outline" onClick={() => setManual(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : permitirDigitacao ? (
        <Button variant="outline" size="sm" onClick={() => setManual(true)}>
          <Keyboard className="size-4" aria-hidden="true" /> {rotuloDigitacao}
        </Button>
      ) : null}
    </div>
  );
}
