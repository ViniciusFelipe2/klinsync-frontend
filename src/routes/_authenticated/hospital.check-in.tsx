import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { HospitalShell } from "@/components/medsync/hospital-shell";
import { TabelaDados, type Coluna } from "@/components/medsync/tabela-dados";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCheckInPhotoUrl } from "@/lib/api/checkin";
import { checkinsDoHospital } from "@/lib/api/hospital";

export const Route = createFileRoute("/_authenticated/hospital/check-in")({
  head: () => ({
    meta: [
      { title: "Relatório de Check-in | KlinSync" },
      {
        name: "description",
        content: "Histórico de check-ins de cirurgiões do hospital, com filtros e exportação.",
      },
      { property: "og:title", content: "Relatório de Check-in | KlinSync" },
      {
        property: "og:description",
        content: "Histórico de check-ins de cirurgiões do hospital, com filtros e exportação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatorioCheckIn,
});

type Linha = { id: string; doctor_name: string; checked_in_at: string };

const POR_PAGINA = 20;

function RelatorioCheckIn() {
  const fetcher = checkinsDoHospital;
  const buscarFoto = getCheckInPhotoUrl;
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);
  const [foto, setFoto] = useState<{ nome: string; quando: string; url: string | null } | null>(
    null,
  );

  async function abrirFoto(l: Linha) {
    setFoto({
      nome: l.doctor_name,
      quando: new Date(l.checked_in_at).toLocaleString("pt-BR"),
      url: null,
    });
    try {
      const { url } = await buscarFoto({ data: { id: l.id } });
      setFoto((f) => (f ? { ...f, url } : f));
    } catch {
      setFoto((f) => (f ? { ...f, url: "" } : f));
    }
  }

  const COLUNAS: Coluna<Linha>[] = [
    { chave: "medico", titulo: "Cirurgião", valor: (l) => l.doctor_name },
    {
      chave: "data",
      titulo: "Data",
      valor: (l) => new Date(l.checked_in_at).toLocaleDateString("pt-BR"),
    },
    {
      chave: "hora",
      titulo: "Horário",
      valor: (l) => new Date(l.checked_in_at).toLocaleTimeString("pt-BR"),
    },
    {
      chave: "foto",
      titulo: "Foto",
      valor: () => "",
      render: (l) => (
        <Button variant="outline" size="sm" onClick={() => void abrirFoto(l)}>
          <ImageIcon className="size-4" /> Ver foto
        </Button>
      ),
    },
  ];

  const q = useQuery({
    queryKey: ["hospital-checkins", busca, de, ate, pagina],
    queryFn: () =>
      fetcher({
        data: {
          busca: busca || undefined,
          de: de || undefined,
          ate: ate || undefined,
          pagina,
          porPagina: POR_PAGINA,
        },
      }),
    placeholderData: keepPreviousData,
  });

  function alterar(fn: () => void) {
    fn();
    setPagina(1);
  }

  return (
    <HospitalShell titulo="Check-in de cirurgiões" subtitulo="Relatório completo do módulo">
      <TabelaDados
        titulo="Check-ins registrados"
        nomeArquivo="medsync-check-ins"
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
              <Label htmlFor="busca">Cirurgião</Label>
              <Input
                id="busca"
                placeholder="Buscar por nome"
                value={busca}
                onChange={(e) => alterar(() => setBusca(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="de">De</Label>
              <Input
                id="de"
                type="date"
                value={de}
                onChange={(e) => alterar(() => setDe(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ate">Até</Label>
              <Input
                id="ate"
                type="date"
                value={ate}
                onChange={(e) => alterar(() => setAte(e.target.value))}
              />
            </div>
          </>
        }
      />
      <Dialog open={foto !== null} onOpenChange={(o) => !o && setFoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{foto?.nome}</DialogTitle>
            <DialogDescription>Check-in em {foto?.quando}</DialogDescription>
          </DialogHeader>
          {foto?.url === null ? (
            <p className="py-10 text-center text-muted-foreground">Carregando foto...</p>
          ) : foto?.url ? (
            <img
              src={foto.url}
              alt={`Foto do check-in de ${foto.nome}`}
              className="w-full rounded-xl border border-border object-contain"
            />
          ) : (
            <p className="py-10 text-center text-muted-foreground">
              Não foi possível carregar a foto deste check-in.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
