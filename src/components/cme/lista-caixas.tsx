import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Package,
  Plus,
  Printer,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertaAvaliacao,
  SeloSituacao,
  baixarSvg,
  textoModulo,
} from "@/components/cme/data-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROTULO_TIPO_CAIXA,
  alterarSituacaoCodigo,
  criarCaixa,
  criarItem,
  editarCaixa,
  editarItem,
  exportarCodigos,
  listarCaixas,
  moverItem,
  type CaixaCme,
  type CodigoCme,
  type TipoCaixa,
} from "@/lib/api/cme";
import { baixarPlanilha } from "@/lib/exportar";

const TAMANHO_MIN = 3;
const TAMANHO_MAX = 15;

type CaixaEmEdicao = {
  id?: string;
  rotulo: string;
  tipoCaixa: TipoCaixa;
  descricao: string;
  /** Só na caixa médica. */
  medicoNome: string;
  totalItens: string;
};

const CAIXA_NOVA: CaixaEmEdicao = {
  rotulo: "",
  tipoCaixa: "casa",
  descricao: "",
  medicoNome: "",
  totalItens: "",
};

/** Cria ou edita uma caixa. Na criação, aceita o código que já esteja gravado na caixa. */
function DialogoCaixa({ caixa, aoFechar }: { caixa: CaixaEmEdicao | null; aoFechar: () => void }) {
  const qc = useQueryClient();
  const [dados, setDados] = useState<CaixaEmEdicao>(CAIXA_NOVA);
  const [jaGravado, setJaGravado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [aberta, setAberta] = useState<CaixaEmEdicao | null>(null);

  if (caixa !== aberta) {
    setAberta(caixa);
    if (caixa) setDados(caixa);
    setJaGravado(false);
    setCodigo("");
  }

  const salvar = useMutation({
    mutationFn: async (): Promise<void> => {
      const base = {
        rotulo: dados.rotulo,
        tipoCaixa: dados.tipoCaixa,
        ...(dados.descricao.trim() ? { descricao: dados.descricao.trim() } : {}),
        ...(dados.tipoCaixa === "medica"
          ? { medicoNome: dados.medicoNome.trim(), totalItens: Number(dados.totalItens) }
          : {}),
      };
      if (dados.id) await editarCaixa({ id: dados.id, ...base });
      else await criarCaixa({ ...base, ...(jaGravado ? { codigoGravado: codigo } : {}) });
    },
    onSuccess: () => {
      toast.success(dados.id ? "Caixa atualizada." : "Caixa criada.");
      void qc.invalidateQueries({ queryKey: ["cme-caixas"] });
      aoFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!caixa} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dados.id ? "Editar caixa" : "Nova caixa"}</DialogTitle>
          <DialogDescription>
            {dados.id
              ? "O código da caixa não muda."
              : "O sistema gera o código da caixa, a menos que ela já tenha um gravado."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="caixa-nome">Nome da caixa</Label>
            <Input
              id="caixa-nome"
              required
              minLength={2}
              placeholder="Ex.: Laparotomia"
              value={dados.rotulo}
              onChange={(e) => setDados((d) => ({ ...d, rotulo: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={dados.tipoCaixa}
              onValueChange={(v) => setDados((d) => ({ ...d, tipoCaixa: v as TipoCaixa }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casa">Da casa</SelectItem>
                <SelectItem value="consignada">De fora (consignada)</SelectItem>
                <SelectItem value="medica">Médica (do próprio médico)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dados.tipoCaixa === "medica" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <div className="space-y-1.5">
                <Label htmlFor="caixa-medico">Nome do médico</Label>
                <Input
                  id="caixa-medico"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="off"
                  value={dados.medicoNome}
                  onChange={(e) => setDados((d) => ({ ...d, medicoNome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caixa-total">Itens no total</Label>
                <Input
                  id="caixa-total"
                  required
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  value={dados.totalItens}
                  onChange={(e) => setDados((d) => ({ ...d, totalItens: e.target.value }))}
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="caixa-descricao">Descrição (opcional)</Label>
            <Input
              id="caixa-descricao"
              value={dados.descricao}
              onChange={(e) => setDados((d) => ({ ...d, descricao: e.target.value }))}
            />
          </div>
          {!dados.id ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={jaGravado} onCheckedChange={(v) => setJaGravado(v === true)} />A
                caixa já tem um código gravado
              </label>
              {jaGravado ? (
                <Input
                  aria-label="Código gravado na caixa"
                  required
                  autoComplete="off"
                  placeholder="Bipe ou digite o código"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              ) : null}
            </>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Formulário curto, dentro da caixa aberta, para acrescentar um item a ela. */
function NovoItem({ caixaId }: { caixaId: string }) {
  const qc = useQueryClient();
  const [rotulo, setRotulo] = useState("");
  const [jaGravado, setJaGravado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const criar = useMutation({
    mutationFn: () =>
      criarItem({ caixaId, rotulo, ...(jaGravado ? { codigoGravado: codigo } : {}) }),
    onSuccess: (c) => {
      toast.success(`${c.rotulo} incluído com o código ${c.codigo}.`);
      setRotulo("");
      setCodigo("");
      void qc.invalidateQueries({ queryKey: ["cme-caixas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3"
      onSubmit={(e) => {
        e.preventDefault();
        criar.mutate();
      }}
    >
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor={`item-${caixaId}`}>Novo item nesta caixa</Label>
        <Input
          id={`item-${caixaId}`}
          required
          minLength={2}
          placeholder="Ex.: Pinça Kelly reta"
          value={rotulo}
          onChange={(e) => setRotulo(e.target.value)}
        />
      </div>
      {jaGravado ? (
        <div className="min-w-40 space-y-1.5">
          <Label htmlFor={`item-codigo-${caixaId}`}>Código gravado</Label>
          <Input
            id={`item-codigo-${caixaId}`}
            required
            autoComplete="off"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>
      ) : null}
      <label className="flex h-9 items-center gap-2 text-sm">
        <Checkbox checked={jaGravado} onCheckedChange={(v) => setJaGravado(v === true)} />
        Já tem código gravado
      </label>
      <Button type="submit" disabled={criar.isPending}>
        <Plus className="size-4" aria-hidden="true" /> Incluir
      </Button>
    </form>
  );
}

/**
 * Caixas do CME em uma lista que abre: clicou na caixa, aparecem os itens dela.
 * Sem `podeEditar`, é a mesma lista em modo de consulta (administração do hospital).
 */
export function ListaCaixas({
  podeEditar,
  tamanhoPadraoMm,
}: {
  podeEditar: boolean;
  tamanhoPadraoMm: number;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [inativos, setInativos] = useState(false);
  const [tamanhoTexto, setTamanhoTexto] = useState<string | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<CaixaEmEdicao | null>(null);

  const digitado = Number((tamanhoTexto ?? "").replace(",", "."));
  const tamanhoMm =
    tamanhoTexto !== null && digitado >= TAMANHO_MIN && digitado <= TAMANHO_MAX
      ? digitado
      : tamanhoPadraoMm;

  const dados = useQuery({
    queryKey: ["cme-caixas", busca, tamanhoMm, inativos],
    queryFn: () => listarCaixas({ busca, tamanhoMm, inativos }),
  });
  const caixas = dados.data?.caixas ?? [];
  const semCaixa = dados.data?.semCaixa ?? [];
  const todos = [...caixas, ...caixas.flatMap((c) => c.itens), ...semCaixa];
  const marcados = todos.filter((c) => selecionados.has(c.id));
  const bloqueado = marcados.find((c) => c.avaliacao.situacao === "bloqueado");
  const comAviso = bloqueado ?? marcados.find((c) => c.avaliacao.situacao === "aviso");

  const alternarAberta = (id: string) =>
    setAbertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const alternarSelecao = (ids: string[], marcar: boolean) =>
    setSelecionados((s) => {
      const n = new Set(s);
      ids.forEach((id) => (marcar ? n.add(id) : n.delete(id)));
      return n;
    });

  const atualizar = () => void qc.invalidateQueries({ queryKey: ["cme-caixas"] });
  const situacao = useMutation({
    mutationFn: alterarSituacaoCodigo,
    onSuccess: (_r, v) => {
      toast.success(v.ativo ? "Reativado." : "Inativado. O histórico foi mantido.");
      alternarSelecao([v.id], false);
      atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const renomear = useMutation({
    mutationFn: editarItem,
    onSuccess: atualizar,
    onError: (e: Error) => toast.error(e.message),
  });
  const mover = useMutation({
    mutationFn: moverItem,
    onSuccess: () => {
      toast.success("Item colocado na caixa.");
      atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportar = useMutation({
    mutationFn: () => exportarCodigos({ ids: [...selecionados], tamanhoMm }),
    onSuccess: ({ linhas }) =>
      baixarPlanilha("cme-codigos-para-gravacao", "Códigos", [
        [
          "Nome",
          "Tipo",
          "Conteúdo do código",
          "Formato",
          "Tamanho do código (mm)",
          "Margem branca",
          "Matriz",
          "Quadradinho (mm)",
          "Quadradinho (mil)",
        ],
        ...linhas.map((c) => [
          c.rotulo,
          c.tipo === "item" ? "Item" : "Caixa",
          c.codigo,
          "Data Matrix ECC 200",
          c.avaliacao.tamanhoMm,
          "1 quadradinho, por fora do tamanho",
          `${c.avaliacao.modulosPorLado}x${c.avaliacao.modulosPorLado}`,
          c.avaliacao.moduloMm,
          c.avaliacao.moduloMil,
        ]),
      ]),
    onError: (e: Error) => toast.error(e.message),
  });
  const svg = useMutation({
    mutationFn: (id: string) => exportarCodigos({ ids: [id], tamanhoMm }),
    onSuccess: ({ linhas }) => {
      const c = linhas[0];
      if (c) baixarSvg(`data-matrix-${c.codigo}`, c.matriz, tamanhoMm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linhaItem = (i: CodigoCme, semCaixaAtual: boolean) => (
    <tr key={i.id} className={`border-b last:border-0 ${i.ativo ? "" : "text-muted-foreground"}`}>
      {podeEditar ? (
        <td className="w-8 px-2 py-2">
          <Checkbox
            aria-label={`Selecionar ${i.rotulo}`}
            checked={selecionados.has(i.id)}
            disabled={!i.ativo}
            onCheckedChange={(v) => alternarSelecao([i.id], v === true)}
          />
        </td>
      ) : null}
      <td className="px-2 py-2 font-medium">
        {i.rotulo}
        {i.origem === "existente" ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">já gravado</span>
        ) : null}
        {!i.ativo ? <span className="ml-2 text-xs font-normal">(inativo)</span> : null}
      </td>
      <td className="px-2 py-2 font-mono">{i.codigo}</td>
      <td className="px-2 py-2 whitespace-nowrap">{textoModulo(i.avaliacao)}</td>
      <td className="px-2 py-2 whitespace-nowrap">
        <SeloSituacao avaliacao={i.avaliacao} />
      </td>
      {podeEditar ? (
        <td className="px-2 py-2 text-right whitespace-nowrap">
          {semCaixaAtual && i.ativo ? (
            <Select onValueChange={(caixaId) => mover.mutate({ id: i.id, caixaId })}>
              <SelectTrigger className="inline-flex h-8 w-48" aria-label={`Caixa de ${i.rotulo}`}>
                <SelectValue placeholder="Colocar na caixa..." />
              </SelectTrigger>
              <SelectContent>
                {caixas
                  .filter((c) => c.ativo)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.rotulo}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : null}
          {i.origem === "gerado" && i.ativo ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={i.avaliacao.situacao === "bloqueado"}
              onClick={() => svg.mutate(i.id)}
            >
              <Download className="size-4" aria-hidden="true" /> SVG
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const novo = window.prompt("Novo nome do item:", i.rotulo)?.trim();
              if (novo && novo !== i.rotulo) renomear.mutate({ id: i.id, rotulo: novo });
            }}
          >
            Renomear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!i.ativo || window.confirm(`Inativar "${i.rotulo}"? O histórico é mantido.`)) {
                situacao.mutate({ id: i.id, ativo: !i.ativo });
              }
            }}
          >
            {i.ativo ? "Inativar" : "Reativar"}
          </Button>
        </td>
      ) : null}
    </tr>
  );

  const tabelaItens = (itens: CodigoCme[], semCaixaAtual = false) =>
    itens.length === 0 ? (
      <p className="py-2 text-sm text-muted-foreground">Nenhum item nesta caixa ainda.</p>
    ) : (
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            {podeEditar ? <th className="w-8 px-2 py-2" /> : null}
            <th className="px-2 py-2">Item</th>
            <th className="px-2 py-2">Código</th>
            <th className="px-2 py-2">Quadradinho</th>
            <th className="px-2 py-2">Situação</th>
            {podeEditar ? <th className="px-2 py-2" /> : null}
          </tr>
        </thead>
        <tbody>{itens.map((i) => linhaItem(i, semCaixaAtual))}</tbody>
      </table>
    );

  const blocoCaixa = (cx: CaixaCme) => {
    const aberta = abertas.has(cx.id);
    const ativos = cx.itens.filter((i) => i.ativo);
    return (
      <div key={cx.id} className={`rounded-xl border ${aberta ? "border-primary/40" : ""}`}>
        <div className="flex flex-wrap items-center gap-3 p-3">
          {podeEditar ? (
            <Checkbox
              aria-label={`Selecionar a etiqueta da caixa ${cx.rotulo}`}
              checked={selecionados.has(cx.id)}
              disabled={!cx.ativo}
              onCheckedChange={(v) => alternarSelecao([cx.id], v === true)}
            />
          ) : null}
          <button
            type="button"
            aria-expanded={aberta}
            onClick={() => alternarAberta(cx.id)}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
          >
            {aberta ? (
              <ChevronDown className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
            )}
            <Package className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-semibold">{cx.rotulo}</span>
            <span className="font-mono text-sm text-muted-foreground">{cx.codigo}</span>
            <Badge variant={cx.tipo_caixa === "casa" ? "secondary" : "default"}>
              {ROTULO_TIPO_CAIXA[cx.tipo_caixa]}
            </Badge>
            {cx.medico_nome ? <span className="text-sm">Dr(a). {cx.medico_nome}</span> : null}
            <span className="text-sm text-muted-foreground">
              {cx.total_itens !== null
                ? `${ativos.length} de ${cx.total_itens} itens cadastrados`
                : `${ativos.length} ${ativos.length === 1 ? "item" : "itens"}`}
            </span>
            {!cx.ativo ? <Badge variant="outline">Inativa</Badge> : null}
          </button>
        </div>

        {aberta ? (
          <div className="space-y-3 border-t px-3 pt-2 pb-3">
            {cx.descricao ? <p className="text-sm text-muted-foreground">{cx.descricao}</p> : null}
            <div className="overflow-x-auto">{tabelaItens(cx.itens)}</div>
            {podeEditar && cx.ativo ? (
              <>
                <NovoItem caixaId={cx.id} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={cx.avaliacao.situacao === "bloqueado"}
                    onClick={() =>
                      void navigate({
                        to: "/cme/impressao",
                        search: { ids: cx.id, tamanho: tamanhoMm },
                      })
                    }
                  >
                    <Printer className="size-4" aria-hidden="true" /> Etiqueta da caixa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ativos.length === 0}
                    onClick={() => alternarSelecao([cx.id, ...ativos.map((i) => i.id)], true)}
                  >
                    Marcar a caixa e todos os itens
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditando({
                        id: cx.id,
                        rotulo: cx.rotulo,
                        tipoCaixa: cx.tipo_caixa,
                        descricao: cx.descricao ?? "",
                        medicoNome: cx.medico_nome ?? "",
                        totalItens: cx.total_itens === null ? "" : String(cx.total_itens),
                      })
                    }
                  >
                    Editar caixa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        window.confirm(`Inativar a caixa "${cx.rotulo}"? O histórico é mantido.`)
                      ) {
                        situacao.mutate({ id: cx.id, ativo: false });
                      }
                    }}
                  >
                    Inativar caixa
                  </Button>
                </div>
              </>
            ) : null}
            {podeEditar && !cx.ativo ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => situacao.mutate({ id: cx.id, ativo: true })}
              >
                Reativar caixa
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const ids = [...selecionados];
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Caixas ({caixas.length})</CardTitle>
          {podeEditar ? (
            <Button onClick={() => setEditando(CAIXA_NOVA)}>
              <Plus className="size-4" aria-hidden="true" /> Nova caixa
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="busca-caixas">Buscar caixa ou item</Label>
            <Input id="busca-caixas" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="tamanho-codigo">Tamanho (3 a 15 mm)</Label>
            <Input
              id="tamanho-codigo"
              inputMode="decimal"
              value={tamanhoTexto ?? String(tamanhoMm).replace(".", ",")}
              onChange={(e) => setTamanhoTexto(e.target.value)}
            />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <Checkbox checked={inativos} onCheckedChange={(v) => setInativos(v === true)} />
            Mostrar inativos
          </label>
        </div>

        {podeEditar && ids.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary p-3">
            <span className="text-sm font-medium">
              {ids.length} {ids.length === 1 ? "código marcado" : "códigos marcados"}
            </span>
            <Button
              size="sm"
              disabled={!!bloqueado}
              onClick={() =>
                void navigate({
                  to: "/cme/impressao",
                  search: { ids: ids.join(","), tamanho: tamanhoMm },
                })
              }
            >
              <Printer className="size-4" aria-hidden="true" /> Imprimir etiquetas
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={ids.length !== 1}
              title={ids.length !== 1 ? "Marque só um código" : undefined}
              onClick={() =>
                void navigate({
                  to: "/cme/impressao",
                  search: { ids: ids[0] ?? "", tamanho: tamanhoMm, folhaTeste: true },
                })
              }
            >
              <FlaskConical className="size-4" aria-hidden="true" /> Folha de teste
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!!bloqueado || exportar.isPending}
              onClick={() => exportar.mutate()}
            >
              <FileSpreadsheet className="size-4" aria-hidden="true" /> Planilha para gravação
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
              Desmarcar
            </Button>
          </div>
        ) : null}
        {comAviso ? <AlertaAvaliacao avaliacao={comAviso.avaliacao} /> : null}
      </CardHeader>

      <CardContent className="space-y-3">
        {caixas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {dados.isLoading
              ? "Carregando..."
              : busca
                ? "Nenhuma caixa ou item encontrado."
                : podeEditar
                  ? 'Nenhuma caixa cadastrada. Comece por "Nova caixa".'
                  : "Nenhuma caixa cadastrada."}
          </p>
        ) : (
          caixas.map(blocoCaixa)
        )}

        {semCaixa.length > 0 ? (
          <div className="rounded-xl border border-dashed p-3">
            <p className="font-semibold">Itens sem caixa ({semCaixa.length})</p>
            <p className="mb-2 text-sm text-muted-foreground">
              Códigos criados antes do cadastro de caixas.{" "}
              {podeEditar ? "Escolha a caixa de cada um." : ""}
            </p>
            <div className="overflow-x-auto">{tabelaItens(semCaixa, true)}</div>
          </div>
        ) : null}
      </CardContent>

      <DialogoCaixa caixa={editando} aoFechar={() => setEditando(null)} />
    </Card>
  );
}
