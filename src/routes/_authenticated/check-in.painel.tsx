import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Image as ImageIcon,
  Loader2,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteCheckIn,
  getCheckInPhotoUrl,
  getCheckInPhotoUrls,
  exportarCheckIns,
  getUsageStats,
  listarCheckIns,
} from "@/lib/api/checkin";

const PAGE_SIZE = 20;

type Row = {
  id: string;
  doctor_name: string;
  checked_in_at: string;
};

export const Route = createFileRoute("/_authenticated/check-in/painel")({
  head: () => ({
    meta: [
      { title: "Painel de check-ins | Centro Cirúrgico" },
      {
        name: "description",
        content: "Acompanhe em tempo real os check-ins dos cirurgiões, com filtros e fotos.",
      },
      { property: "og:title", content: "Painel de check-ins | Centro Cirúrgico" },
      { property: "og:description", content: "Registros de presença em tempo real com foto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPanel,
});

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function AdminPanel() {
  const [nameFilter, setNameFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fetchPhoto = getCheckInPhotoUrl;
  const fetchPhotoUrls = getCheckInPhotoUrls;
  const removeCheckIn = deleteCheckIn;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarCheckIns({
        data: {
          pagina: page + 1,
          porPagina: PAGE_SIZE,
          ...(nameFilter.trim() ? { busca: nameFilter.trim() } : {}),
          ...(from ? { de: from } : {}),
          ...(to ? { ate: to } : {}),
        },
      });
      setRows(res.linhas);
      setTotal(res.total);
      setTodayCount(res.hoje);
    } catch {
      toast.error("Não foi possível carregar os check-ins.");
    } finally {
      setLoading(false);
    }
  }, [nameFilter, from, to, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const fetchUsage = getUsageStats;
  const [usage, setUsage] = useState<{
    usedBytes: number;
    totalBytes: number;
    isEstimate: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void fetchUsage({})
      .then((u) => {
        if (active)
          setUsage({
            usedBytes: u.usedBytes,
            totalBytes: u.totalBytes,
            isEstimate: u.isEstimate,
          });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [fetchUsage]);

  useEffect(() => {
    // Sem canal em tempo real: o painel se atualiza por polling enquanto a aba está visível.
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function openPhoto(row: Row) {
    setPhotoName(row.doctor_name);
    setPhotoUrl(null);
    setPhotoLoading(true);
    try {
      const res = await fetchPhoto({ data: { id: row.id } });
      setPhotoUrl(res.url);
    } finally {
      setPhotoLoading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await removeCheckIn({ data: { id: pendingDelete.id } });
      toast.success("Registro excluído.");
      setPendingDelete(null);
      await load();
    } catch {
      toast.error("Não foi possível excluir o registro.");
    } finally {
      setDeleting(false);
    }
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const { linhas: data } = await exportarCheckIns({
        data: {
          ...(nameFilter.trim() ? { busca: nameFilter.trim() } : {}),
          ...(from ? { de: from } : {}),
          ...(to ? { ate: to } : {}),
        },
      });
      if (data.length === 0) {
        toast.error("Nenhum registro para exportar.");
        return;
      }

      let urls: Record<string, string> = {};
      try {
        const res = await fetchPhotoUrls({ data: { ids: data.map((d) => d.id) } });
        urls = res.urls;
      } catch {
        toast.error("Não foi possível gerar os links das fotos.");
      }

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Check-ins");
      sheet.columns = [
        { header: "Nome", key: "nome", width: 38 },
        { header: "Data", key: "data", width: 14 },
        { header: "Hora", key: "hora", width: 12 },
        { header: "Foto", key: "foto", width: 22 },
      ];
      sheet.getRow(1).font = { bold: true };
      for (const item of data) {
        const dt = new Date(item.checked_in_at);
        const row = sheet.addRow({
          nome: item.doctor_name,
          data: dt.toLocaleDateString("pt-BR"),
          hora: dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          foto: urls[item.id] ? "Abrir foto" : "Indisponível",
        });
        const url = urls[item.id];
        if (url) {
          const cell = row.getCell("foto");
          cell.value = { text: "Abrir foto", hyperlink: url };
          cell.font = { color: { argb: "FF0563C1" }, underline: true };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `check-ins-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Falha ao gerar a planilha.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Painel de check-ins</h1>
            <p className="text-xs text-muted-foreground">Centro Cirúrgico — tempo real</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void exportExcel()} disabled={exporting}>
              {exporting ? <Loader2 className="animate-spin" /> : <Download />} Exportar Excel
            </Button>
            <Button variant="outline" asChild>
              <Link to="/check-in">
                <ArrowLeft /> Voltar ao check-in
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{todayCount}</p>
              <p className="text-sm text-muted-foreground">Check-ins hoje</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
            <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{total}</p>
              <p className="text-sm text-muted-foreground">Resultados do filtro atual</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="f-name">Nome do médico</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="f-name"
                value={nameFilter}
                placeholder="Buscar por nome"
                className="pl-9"
                onChange={(e) => {
                  setPage(0);
                  setNameFilter(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-from">De</Label>
            <Input
              id="f-from"
              type="date"
              value={from}
              onChange={(e) => {
                setPage(0);
                setFrom(e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-to">Até</Label>
            <Input
              id="f-to"
              type="date"
              value={to}
              onChange={(e) => {
                setPage(0);
                setTo(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="max-h-[60vh] divide-y divide-border overflow-y-auto scroll-smooth">
            {loading && (
              <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando registros...
              </p>
            )}
            {!loading && rows.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhum check-in encontrado para os filtros selecionados.
              </p>
            )}
            {!loading &&
              rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6"
                >
                  <div>
                    <p className="font-medium text-foreground">{row.doctor_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(row.checked_in_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void openPhoto(row)}>
                      <ImageIcon /> Visualizar imagem
                    </Button>
                    <Button
                      variant="outline"
                      aria-label={`Excluir check-in de ${row.doctor_name}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(row)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
            <p className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={photoName !== ""} onOpenChange={(open) => !open && setPhotoName("")}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{photoName}</DialogTitle>
          </DialogHeader>
          {photoLoading || !photoUrl ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando imagem...
            </p>
          ) : (
            <img
              src={photoUrl}
              alt={`Selfie do check-in de ${photoName}`}
              className="w-full rounded-lg border border-border"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este check-in?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro de <strong>{pendingDelete?.doctor_name}</strong> e a foto correspondente
              serão apagados permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 className="animate-spin" /> : null} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {usage ? (
        <footer
          className={`pb-6 text-center text-[11px] ${
            usage.usedBytes / usage.totalBytes > 0.8
              ? "text-destructive/70"
              : "text-muted-foreground/50"
          }`}
        >
          Armazenamento: {formatBytes(usage.usedBytes)} de {formatBytes(usage.totalBytes)}
          {usage.isEstimate ? " (aprox.)" : ""} usados (
          {((usage.usedBytes / usage.totalBytes) * 100).toFixed(1)}%) ·{" "}
          {formatBytes(Math.max(0, usage.totalBytes - usage.usedBytes))} disponíveis
        </footer>
      ) : null}
    </main>
  );
}
