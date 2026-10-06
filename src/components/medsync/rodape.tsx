/** Rodapé institucional padrão exibido em todas as áreas do sistema. */
export function RodapeTrizion({ variante = "claro" }: { variante?: "claro" | "escuro" }) {
  const base =
    variante === "escuro"
      ? "border-white/10 text-brand-foreground/60"
      : "border-border text-muted-foreground";
  return (
    <footer className={`mt-10 border-t px-6 py-6 text-xs ${base}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Sistema desenvolvido por: Trizion Technology LTDA — todos os direitos reservados.
        </span>
        <span>© {new Date().getFullYear()} · Ecossistema KlinSync</span>
      </div>
    </footer>
  );
}
