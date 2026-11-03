import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { salasDoHospital } from "@/lib/api/hospital";
import {
  deslocarMes,
  ehMesAtual,
  intervaloDatas,
  mesAtual,
  mesDoPeriodo,
  rotuloPeriodo,
  type FiltroHospital,
} from "@/lib/periodo";

/**
 * Barra de filtro das telas do hospital: mês (anterior / próximo / atual), datas personalizadas e sala.
 * Fica fixa no topo ao rolar e vale para todos os blocos da tela.
 */
export function FiltroPeriodoSala({
  filtro,
  onChange,
}: {
  filtro: FiltroHospital;
  onChange: (f: FiltroHospital) => void;
}) {
  const salas = useQuery({ queryKey: ["hospital-salas"], queryFn: () => salasDoHospital() });
  const [personalizado, setPersonalizado] = useState(() => mesDoPeriodo(filtro) == null);
  const [de, setDe] = useState(filtro.de);
  const [ate, setAte] = useState(filtro.ate);

  const ehMes = mesDoPeriodo(filtro) != null;
  const noMesAtual = ehMesAtual(filtro);
  const proximoNoFuturo = deslocarMes(filtro, 1).de > mesAtual().de;
  const nomeSala =
    filtro.sala === "todas"
      ? "Todas as salas"
      : ((salas.data ?? []).find((s) => s.id === filtro.sala)?.nome ?? "Sala selecionada");

  const irPara = (p: { de: string; ate: string }) => {
    setDe(p.de);
    setAte(p.ate);
    onChange({ ...filtro, ...p });
  };

  return (
    <section
      aria-label="Filtro de período e sala"
      className="sticky top-0 z-20 -mx-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Período</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              aria-label="Mês anterior"
              onClick={() => irPara(deslocarMes(filtro, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p
              className="min-w-[11rem] px-2 text-center text-base font-semibold capitalize text-foreground"
              aria-live="polite"
            >
              {rotuloPeriodo(filtro)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              aria-label="Próximo mês"
              disabled={proximoNoFuturo}
              onClick={() => irPara(deslocarMes(filtro, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            {!noMesAtual ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-1"
                onClick={() => {
                  setPersonalizado(false);
                  irPara(mesAtual());
                }}
              >
                Voltar ao mês atual
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Sala</Label>
          <Select value={filtro.sala} onValueChange={(v) => onChange({ ...filtro, sala: v })}>
            <SelectTrigger className="h-9 w-52" aria-label="Sala">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as salas</SelectItem>
              {(salas.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                  {s.ativa ? "" : " (inativa)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant={personalizado ? "secondary" : "outline"}
          size="sm"
          className="h-9"
          aria-expanded={personalizado}
          onClick={() => setPersonalizado((v) => !v)}
        >
          <CalendarDays className="size-4" /> Escolher datas
        </Button>

        {personalizado ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (de && ate && de <= ate) irPara({ de, ate });
            }}
          >
            <div className="grid gap-1">
              <Label htmlFor="filtro-de" className="text-xs text-muted-foreground">
                De
              </Label>
              <Input
                id="filtro-de"
                type="date"
                value={de}
                max={ate}
                onChange={(e) => setDe(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="filtro-ate" className="text-xs text-muted-foreground">
                Até
              </Label>
              <Input
                id="filtro-ate"
                type="date"
                value={ate}
                min={de}
                onChange={(e) => setAte(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <Button type="submit" size="sm" className="h-9" disabled={!de || !ate || de > ate}>
              Aplicar datas
            </Button>
          </form>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Mostrando <strong className="font-semibold text-foreground">{nomeSala}</strong> ·{" "}
        {ehMes ? `mês inteiro (${intervaloDatas(filtro)})` : intervaloDatas(filtro)}. Todos os
        blocos abaixo usam este filtro.
      </p>
    </section>
  );
}
