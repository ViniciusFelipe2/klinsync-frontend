import { useQuery } from "@tanstack/react-query";
import {
  Biohazard,
  CircleDashed,
  Droplets,
  Flame,
  Package,
  PackageOpen,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  CartaoMaquina,
  tempoRestante,
  useAgoraDoServidor,
  useAtualizarNoFimDoCiclo,
} from "@/components/cme/esterilizacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTempoReal } from "@/hooks/use-tempo-real";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROTULO_STATUS_CAIXA,
  ROTULO_TIPO_CAIXA,
  painelCme,
  type CaixaNoPainel,
  type MaquinaCme,
  type StatusCaixa,
} from "@/lib/api/cme";

/** Na ordem do caminho da caixa: contaminada (na sala), expurgo, preparo, esterilização, arsenal. */
const STATUS: { chave: StatusCaixa; icone: LucideIcon; cor: string }[] = [
  { chave: "sala", icone: Biohazard, cor: "text-red-700" },
  { chave: "expurgo", icone: Droplets, cor: "text-sky-600" },
  { chave: "preparo", icone: PackageOpen, cor: "text-amber-600" },
  { chave: "esterilizacao", icone: Flame, cor: "text-orange-600" },
  { chave: "arsenal", icone: Warehouse, cor: "text-emerald-600" },
  { chave: "sem_movimento", icone: CircleDashed, cor: "text-muted-foreground" },
];
const POR_CHAVE = Object.fromEntries(STATUS.map((s) => [s.chave, s])) as Record<
  StatusCaixa,
  (typeof STATUS)[number]
>;

const POR_PAGINA = 50;
const INTERVALO_MS = 30_000;

/** "agora", "35 min", "3 h 10 min", "2 dias". */
const haQuanto = (ms: number) => {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  return `${Math.floor(h / 24)} dias`;
};

function Selo({ status }: { status: StatusCaixa }) {
  const s = POR_CHAVE[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <s.icone className={`size-4 shrink-0 ${s.cor}`} aria-hidden="true" />
      {ROTULO_STATUS_CAIXA[status]}
    </span>
  );
}

/** Máquinas com a contagem ao vivo. Fica separado para o relógio de 1 segundo não redesenhar a tabela de caixas. */
function Maquinas({ maquinas, agora }: { maquinas: MaquinaCme[]; agora: string }) {
  const agoraMs = useAgoraDoServidor(agora);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {maquinas.map((m) => (
        <CartaoMaquina key={m.id} maquina={m} agoraMs={agoraMs} />
      ))}
    </div>
  );
}

/**
 * Painel do CME: onde está cada caixa agora. Os números do topo são o resumo e também o filtro;
 * a tabela começa pelas caixas há mais tempo no mesmo status, que são as que podem estar paradas.
 */
export function PainelCme() {
  const q = useQuery({
    queryKey: ["cme-painel"],
    queryFn: painelCme,
    refetchInterval: INTERVALO_MS,
  });
  // Cada bip de caixa, em qualquer computador do hospital, atualiza o painel na hora; o intervalo é só rede de segurança.
  useTempoReal();
  useAtualizarNoFimDoCiclo(
    q.data?.maquinas,
    q.data?.agora,
    q.dataUpdatedAt,
    () => void q.refetch(),
  );
  const [filtro, setFiltro] = useState<StatusCaixa | null>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"tempo" | "nome">("tempo");
  const [pagina, setPagina] = useState(0);

  const dados = q.data;
  const agoraMs = dados ? Date.parse(dados.agora) : 0;

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = (dados?.caixas ?? []).filter(
      (c) =>
        (!filtro || c.status === filtro) &&
        (!termo ||
          c.rotulo.toLowerCase().includes(termo) ||
          !!c.medicoNome?.toLowerCase().includes(termo) ||
          !!c.salaNome?.toLowerCase().includes(termo) ||
          !!c.maquinaNome?.toLowerCase().includes(termo)),
    );
    if (ordem === "tempo") {
      // Mais antigas primeiro; as que nunca foram bipadas ficam no fim. A lista já chega em ordem de nome.
      const t = (c: CaixaNoPainel) => (c.desde ? Date.parse(c.desde) : Infinity);
      return [...filtradas].sort((a, b) => t(a) - t(b));
    }
    return filtradas;
  }, [dados, filtro, busca, ordem]);

  if (q.isError) return <p className="text-sm text-muted-foreground">{q.error.message}</p>;
  if (!dados) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const total = dados.caixas.length;
  const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas - 1);
  const visiveis = linhas.slice(atual * POR_PAGINA, (atual + 1) * POR_PAGINA);
  const filtrar = (s: StatusCaixa | null) => {
    setFiltro(s);
    setPagina(0);
  };

  const cartao = (ativo: boolean) =>
    `rounded-xl border-2 bg-card p-3 text-left transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none ${
      ativo ? "border-primary" : "border-border"
    }`;

  const onde = (c: CaixaNoPainel) =>
    c.status === "sala"
      ? (c.salaNome ?? "")
      : c.maquinaNome
        ? `${c.maquinaNome}${c.cicloNome ? ` · ciclo ${c.cicloNome}` : ""}`
        : "";

  const tempo = (c: CaixaNoPainel) =>
    c.status === "esterilizacao" && c.terminaEm
      ? Date.parse(c.terminaEm) > agoraMs
        ? `faltam ${tempoRestante(Date.parse(c.terminaEm) - agoraMs)}`
        : "ciclo concluído"
      : c.desde
        ? `há ${haQuanto(agoraMs - Date.parse(c.desde))}`.replace("há agora", "agora")
        : "";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <button
          type="button"
          aria-pressed={filtro === null}
          onClick={() => filtrar(null)}
          className={cartao(filtro === null)}
        >
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="size-4 text-primary" aria-hidden="true" /> Todas as caixas
          </span>
          <span className="mt-1 block text-3xl font-bold tabular-nums">{total}</span>
        </button>
        {STATUS.map((s) => (
          <button
            key={s.chave}
            type="button"
            aria-pressed={filtro === s.chave}
            onClick={() => filtrar(filtro === s.chave ? null : s.chave)}
            className={cartao(filtro === s.chave)}
          >
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <s.icone className={`size-4 shrink-0 ${s.cor}`} aria-hidden="true" />
              {ROTULO_STATUS_CAIXA[s.chave]}
            </span>
            <span className="mt-1 block text-3xl font-bold tabular-nums">
              {dados.resumo[s.chave]}
            </span>
          </button>
        ))}
      </div>

      {dados.maquinas.length > 0 ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Máquinas</h2>
            <p className="text-sm text-muted-foreground">
              Últimas 24 horas: {dados.ultimas24h.ciclos}{" "}
              {dados.ultimas24h.ciclos === 1 ? "ciclo" : "ciclos"} ·{" "}
              {dados.ultimas24h.caixasEsterilizadas}{" "}
              {dados.ultimas24h.caixasEsterilizadas === 1 ? "caixa" : "caixas"}
            </p>
          </div>
          <Maquinas maquinas={dados.maquinas} agora={dados.agora} />
        </section>
      ) : null}

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>
            {filtro ? ROTULO_STATUS_CAIXA[filtro] : "Todas as caixas"} ({linhas.length})
          </CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="painel-busca">Buscar caixa, médico, sala ou máquina</Label>
              <Input
                id="painel-busca"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(0);
                }}
              />
            </div>
            <div className="w-56 space-y-1.5">
              <Label>Ordenar por</Label>
              <Select value={ordem} onValueChange={(v) => setOrdem(v as "tempo" | "nome")}>
                <SelectTrigger aria-label="Ordenar por">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tempo">Há mais tempo no status</SelectItem>
                  <SelectItem value="nome">Nome da caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {total === 0 ? "Nenhuma caixa cadastrada." : "Nenhuma caixa com este filtro."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Caixa</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Onde</th>
                    <th className="px-2 py-2">Tempo</th>
                    <th className="px-2 py-2 text-right">Itens</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <span className="font-medium">{c.rotulo}</span>
                        {c.tipoCaixa !== "casa" ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {ROTULO_TIPO_CAIXA[c.tipoCaixa]}
                            {c.medicoNome ? ` · Dr(a). ${c.medicoNome}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <Selo status={c.status} />
                      </td>
                      <td className="px-2 py-2">{onde(c)}</td>
                      <td className="px-2 py-2 whitespace-nowrap tabular-nums">{tempo(c)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.itens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {paginas > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Página {atual + 1} de {paginas}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={atual === 0}
                  onClick={() => setPagina(atual - 1)}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={atual >= paginas - 1}
                  onClick={() => setPagina(atual + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
