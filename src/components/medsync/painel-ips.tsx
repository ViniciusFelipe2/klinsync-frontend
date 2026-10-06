import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Ban, ShieldOff, Trash2, Timer } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bloquearIp, desbloquearIp, painelIps, purgarLogsAntigos } from "@/lib/api/seguranca";

const DURACOES = [
  { valor: "60", nome: "1 hora" },
  { valor: "360", nome: "6 horas" },
  { valor: "1440", nome: "24 horas" },
  { valor: "10080", nome: "7 dias" },
  { valor: "permanente", nome: "Permanente" },
];

function quando(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export function PainelIps({ dias }: { dias: number }) {
  const qc = useQueryClient();
  const carregar = painelIps;
  const bloquear = bloquearIp;
  const liberar = desbloquearIp;
  const purgar = purgarLogsAntigos;

  const [ip, setIp] = useState("");
  const [motivo, setMotivo] = useState("");
  const [duracao, setDuracao] = useState("1440");
  const [retencao, setRetencao] = useState("180");

  const { data, isLoading } = useQuery({
    queryKey: ["painel-ips", Math.min(dias, 90)],
    queryFn: () => carregar({ data: { dias: Math.min(dias, 90) } }),
  });

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["painel-ips"] });
    void qc.invalidateQueries({ queryKey: ["auditoria"] });
  };

  const mBloquear = useMutation({
    mutationFn: (v: { ip: string; motivo: string; duracao: string }) =>
      bloquear({
        data: {
          ip: v.ip,
          motivo: v.motivo,
          permanente: v.duracao === "permanente",
          minutos: v.duracao === "permanente" ? null : Number(v.duracao),
        },
      }),
    onSuccess: () => {
      toast.success("IP bloqueado.");
      setIp("");
      setMotivo("");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mLiberar = useMutation({
    mutationFn: (alvo: string) => liberar({ data: { ip: alvo } }),
    onSuccess: () => {
      toast.success("Bloqueio removido.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mPurgar = useMutation({
    mutationFn: () => purgar({ data: { dias: Number(retencao) } }),
    onSuccess: (r) =>
      toast.success(
        `Expurgo concluído: ${r["acessos"] ?? 0} acessos, ${r["acoes"] ?? 0} ações, ${r["auditoria"] ?? 0} registros.`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const suspeitos = useMemo(
    () => (data?.ips ?? []).filter((i) => i.falhas > 0).slice(0, 25),
    [data],
  );

  return (
    <div className="space-y-6">
      <Card className="border-rose-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="size-5 text-rose-400" /> Gestão de IPs — timeout e bloqueio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="grid gap-3 md:grid-cols-[1fr_1.4fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ip.trim()) return;
              mBloquear.mutate({ ip: ip.trim(), motivo, duracao });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ip">Endereço IP</Label>
              <Input
                id="ip"
                placeholder="200.145.10.3"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                placeholder="Tentativas repetidas de login"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração</Label>
              <Select value={duracao} onValueChange={setDuracao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURACOES.map((d) => (
                    <SelectItem key={d.valor} value={d.valor}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="destructive" disabled={mBloquear.isPending}>
                <Ban className="size-4" /> Bloquear
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Bloqueios registrados ({data?.bloqueios.length ?? 0})
            </p>
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
            {!isLoading && !data?.bloqueios.length ? (
              <p className="text-sm text-muted-foreground">Nenhum IP bloqueado no momento.</p>
            ) : null}
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {(data?.bloqueios ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{b.ip}</span>
                      <Badge variant={b.ativo ? "destructive" : "outline"}>
                        {b.permanente ? "permanente" : b.ativo ? "em timeout" : "expirado"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.motivo} · desde {quando(b.created_at)}
                      {b.permanente ? "" : ` · libera em ${quando(b.bloqueado_ate)}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={mLiberar.isPending}
                    onClick={() => mLiberar.mutate(b.ip)}
                  >
                    <Trash2 className="size-4" /> Liberar
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">IPs com falhas no período ({suspeitos.length})</p>
            {!suspeitos.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma falha de login registrada no período.
              </p>
            ) : null}
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {suspeitos.map((s) => (
                <div
                  key={s.ip}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{s.ip}</span>
                      <Badge variant={s.falhas >= 5 ? "destructive" : "secondary"}>
                        {s.falhas} falha{s.falhas > 1 ? "s" : ""}
                      </Badge>
                      {s.sucessos ? <Badge variant="outline">{s.sucessos} sucesso(s)</Badge> : null}
                      {s.bloqueado ? <Badge variant="destructive">bloqueado</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.regiao ?? "região desconhecida"} · última tentativa{" "}
                      {quando(s.ultimaTentativa)} · {s.emails.join(", ") || "sem e-mail"}
                    </p>
                  </div>
                  {!s.bloqueado ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mBloquear.mutate({
                          ip: s.ip,
                          motivo: `${s.falhas} falhas de login em ${dias} dia(s)`,
                          duracao: "1440",
                        })
                      }
                    >
                      <Timer className="size-4" /> Timeout 24h
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retenção de dados (LGPD)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[200px_auto_1fr] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="retencao">Manter logs por (dias)</Label>
            <Input
              id="retencao"
              type="number"
              min={30}
              value={retencao}
              onChange={(e) => setRetencao(e.target.value)}
            />
          </div>
          <Button variant="outline" disabled={mPurgar.isPending} onClick={() => mPurgar.mutate()}>
            Expurgar registros mais antigos
          </Button>
          <p className="text-xs text-muted-foreground">
            Remove logs de acesso, ações administrativas e auditoria além do prazo definido,
            atendendo ao princípio da necessidade e da retenção mínima.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function useIndicadoresSeguranca(dias: number) {
  const carregar = painelIps;
  return useQuery({
    queryKey: ["painel-ips", Math.min(dias, 90)],
    queryFn: () => carregar({ data: { dias: Math.min(dias, 90) } }),
  });
}
