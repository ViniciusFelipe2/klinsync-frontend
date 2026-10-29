import { useEffect } from "react";

import { garantirSessaoValida } from "@/lib/api/http";

/**
 * Mantém o login vivo em qualquer tela autenticada (tablets e TV ficam dias abertos). Renova o token com folga,
 * a cada minuto e sempre que o aparelho acorda ou a rede volta. Falha de rede nunca encerra a sessão:
 * só o servidor recusando o token a encerra.
 */
export function useManterSessao() {
  useEffect(() => {
    const renovar = () => void garantirSessaoValida(5 * 60_000);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") renovar();
    };
    renovar();
    const id = window.setInterval(renovar, 60_000);
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", renovar);
    window.addEventListener("online", renovar);
    window.addEventListener("pageshow", renovar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", renovar);
      window.removeEventListener("online", renovar);
      window.removeEventListener("pageshow", renovar);
    };
  }, []);
}

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (t: string, f: () => void) => void;
};

/** Impede a tela de apagar (tablet de sala e TV da diretoria). Reativa sozinho ao voltar para a aba. */
export function useTelaSempreLigada(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const wl = (
      navigator as unknown as {
        wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!wl) return;
    let trava: WakeLockSentinelLike | null = null;
    let desmontado = false;
    const pedir = async () => {
      if (desmontado || document.visibilityState !== "visible" || trava) return;
      try {
        const t = await wl.request("screen");
        if (desmontado) {
          void t.release();
          return;
        }
        trava = t;
        t.addEventListener?.("release", () => {
          trava = null;
        });
      } catch {
        /* sem permissão (ex.: economia de bateria): segue sem a trava */
      }
    };
    const aoVoltar = () => void pedir();
    void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      desmontado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      void trava?.release();
    };
  }, [ativo]);
}
