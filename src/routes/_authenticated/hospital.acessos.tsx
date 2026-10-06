import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { HospitalShell } from "@/components/medsync/hospital-shell";
import { TabelaDados, type Coluna } from "@/components/medsync/tabela-dados";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acessosDoHospital } from "@/lib/api/hospital";

export const Route = createFileRoute("/_authenticated/hospital/acessos")({
  head: () => ({
    meta: [
      { title: "Acessos do Hospital | KlinSync" },
      { name: "description", content: "Registro de tentativas de login dos logins do hospital." },
      { property: "og:title", content: "Acessos do Hospital | KlinSync" },
      {
        property: "og:description",
        content: "Registro de tentativas de login dos logins do hospital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcessosHospital,
});

type Linha = {
  id: string;
  email_tentado: string | null;
  sucesso: boolean;
  created_at: string;
};

const COLUNAS: Coluna<Linha>[] = [
  { chave: "email", titulo: "Quem acessou", valor: (l) => l.email_tentado ?? "—" },
  { chave: "status", titulo: "Resultado", valor: (l) => (l.sucesso ? "sucesso" : "falha") },
  {
    chave: "dia",
    titulo: "Dia",
    valor: (l) => new Date(l.created_at).toLocaleDateString("pt-BR"),
  },
  {
    chave: "hora",
    titulo: "Hora",
    valor: (l) => new Date(l.created_at).toLocaleTimeString("pt-BR"),
  },
];

const POR_PAGINA = 25;

function AcessosHospital() {
  const fetcher = acessosDoHospital;
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);

  const q = useQuery({
    queryKey: ["hospital-acessos", de, ate, pagina],
    queryFn: () =>
      fetcher({
        data: { de: de || undefined, ate: ate || undefined, pagina, porPagina: POR_PAGINA },
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <HospitalShell titulo="Acessos" subtitulo="Auditoria de login dos usuários do hospital">
      <TabelaDados
        titulo="Tentativas de acesso"
        nomeArquivo="medsync-acessos"
        colunas={COLUNAS}
        linhas={(q.data?.linhas ?? []) as Linha[]}
        total={q.data?.total ?? 0}
        pagina={pagina}
        porPagina={POR_PAGINA}
        onPagina={setPagina}
        carregando={q.isLoading}
        filtros={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="ade">De</Label>
              <Input
                id="ade"
                type="date"
                value={de}
                onChange={(e) => {
                  setDe(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aate">Até</Label>
              <Input
                id="aate"
                type="date"
                value={ate}
                onChange={(e) => {
                  setAte(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </>
        }
      />
    </HospitalShell>
  );
}
