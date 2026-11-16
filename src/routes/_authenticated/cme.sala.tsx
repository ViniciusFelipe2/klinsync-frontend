import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  BarraColaborador,
  FluxoConferencia,
  TelaCracha,
  useCracha,
} from "@/components/cme/estacao";
import { acessoCme } from "@/lib/api/cme";

export const Route = createFileRoute("/_authenticated/cme/sala")({
  head: () => ({ meta: [{ title: "Sala cirúrgica | KlinSync" }] }),
  component: Sala,
});

const nada = () => undefined;

function Sala() {
  const acesso = useQuery({ queryKey: ["cme-acesso"], queryFn: acessoCme, retry: false });
  const cracha = useCracha(nada);

  if (!acesso.data) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (acesso.data.tipo !== "estacao_sala" || !acesso.data.sala) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta tela abre só no computador da sala cirúrgica, com o login criado pela equipe KlinSync.
      </p>
    );
  }
  const { sala, config } = acesso.data;

  if (!cracha.logado) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <TelaCracha
          local={sala.nome}
          cracha={cracha}
          permitirDigitado={config.permitirCrachaDigitado}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BarraColaborador logado={cracha.logado} local={sala.nome} cracha={cracha} />
      <FluxoConferencia cracha={cracha} logado={cracha.logado} />
    </div>
  );
}
