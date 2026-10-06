import { useEffect, useState } from "react";
import { formatDuracao, segundosDesde } from "@/lib/giro";

export function Cronometro({ inicio, className }: { inicio: string; className?: string }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className={className}>{formatDuracao(segundosDesde(inicio, agora))}</span>;
}
