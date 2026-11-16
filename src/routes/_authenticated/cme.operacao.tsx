import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Droplets, Flame, PackageOpen, type LucideIcon } from "lucide-react";
import { useCallback, useState } from "react";

import {
  BarraColaborador,
  FluxoConferencia,
  TelaCracha,
  useCracha,
} from "@/components/cme/estacao";
import { Esterilizacao } from "@/components/cme/esterilizacao";
import { Button } from "@/components/ui/button";
import { acessoCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme/operacao")({
  head: () => ({ meta: [{ title: "Operação do CME | KlinSync" }] }),
  component: Operacao,
});

type Setor = "expurgo" | "preparo" | "esterilizacao";

const SETORES: { chave: Setor; nome: string; oQueFaz: string; icone: LucideIcon; cor: string }[] = [
  {
    chave: "expurgo",
    nome: "Expurgo",
    oQueFaz: "Bipar a caixa que chegou da sala e conferir os itens.",
    icone: Droplets,
    cor: "text-rose-600",
  },
  {
    chave: "preparo",
    nome: "Preparo",
    oQueFaz: "Bipar a caixa limpa e conferir os itens antes de embalar.",
    icone: PackageOpen,
    cor: "text-amber-600",
  },
  {
    chave: "esterilizacao",
    nome: "Esterilização",
    oQueFaz: "Escolher a máquina e o ciclo, bipar as caixas e iniciar.",
    icone: Flame,
    cor: "text-orange-600",
  },
];

/** Computador do CME: crachá, escolha do setor e o trabalho daquele setor. */
function Operacao() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  const [setor, setSetor] = useState<Setor | null>(null);
  // Saiu (ou entrou outra pessoa): a próxima escolhe o setor de novo.
  const cracha = useCracha(useCallback(() => setSetor(null), []));

  if (!acesso.data) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (acesso.data.tipo !== "estacao_cme") {
    return (
      <p className="text-sm text-muted-foreground">
        Esta tela abre só no computador do CME, com o login criado pela equipe KlinSync.
      </p>
    );
  }

  if (!cracha.logado) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="mx-auto max-w-xl">
          <TelaCracha
            local="CME"
            cracha={cracha}
            permitirDigitado={acesso.data.config.permitirCrachaDigitado}
          />
        </div>
      </div>
    );
  }

  const atual = SETORES.find((s) => s.chave === setor);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BarraColaborador
        logado={cracha.logado}
        local={atual ? `CME · ${atual.nome}` : "CME"}
        cracha={cracha}
      >
        {atual ? (
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-6 text-lg"
            onClick={() => setSetor(null)}
          >
            <ArrowLeft className="size-5" aria-hidden="true" /> Trocar de setor
          </Button>
        ) : null}
      </BarraColaborador>

      {!setor ? (
        <div>
          <h1 className="mb-4 text-2xl font-semibold">Em qual setor você está?</h1>
          <div className="grid gap-4 sm:grid-cols-3">
            {SETORES.map((s) => (
              <button
                key={s.chave}
                type="button"
                onClick={() => {
                  cracha.usou();
                  setSetor(s.chave);
                }}
                className="flex flex-col items-center gap-3 rounded-xl border-2 bg-card p-8 text-center transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none"
              >
                <s.icone className={`size-14 ${s.cor}`} aria-hidden="true" />
                <span className="text-2xl font-semibold">{s.nome}</span>
                <span className="text-sm text-muted-foreground">{s.oQueFaz}</span>
              </button>
            ))}
          </div>
        </div>
      ) : setor === "esterilizacao" ? (
        <Esterilizacao
          cracha={cracha}
          logado={cracha.logado}
          modoTeste={acesso.data.config.permitirCrachaDigitado}
        />
      ) : (
        // A chave recomeça a tela ao trocar de setor.
        <FluxoConferencia key={setor} cracha={cracha} logado={cracha.logado} setor={setor} />
      )}
    </div>
  );
}
