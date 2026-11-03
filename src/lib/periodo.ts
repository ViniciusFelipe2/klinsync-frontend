/**
 * Período dos painéis do hospital. O padrão é o mês atual; datas sempre no formato "YYYY-MM-DD"
 * (o mesmo que o backend recebe em `de`/`ate`, interpretado no fuso do hospital).
 */

export type Periodo = { de: string; ate: string };

/** Filtro compartilhado pelas telas do hospital (vai na URL: ?de=&ate=&sala=). */
export type FiltroHospital = Periodo & { sala: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ehData = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Converte "YYYY-MM-DD" em data local (sem o deslocamento de fuso do `new Date("YYYY-MM-DD")`). */
export const dataDe = (v: string) => {
  const [a, m, d] = v.split("-").map(Number);
  return new Date(a!, m! - 1, d!);
};

export function periodoDoMes(ano: number, mes: number): Periodo {
  return { de: iso(new Date(ano, mes, 1)), ate: iso(new Date(ano, mes + 1, 0)) };
}

export function mesAtual(): Periodo {
  const hoje = new Date();
  return periodoDoMes(hoje.getFullYear(), hoje.getMonth());
}

/** Se o período é exatamente um mês inteiro, devolve ano/mês; senão null. */
export function mesDoPeriodo(p: Periodo): { ano: number; mes: number } | null {
  const de = dataDe(p.de);
  const mes = periodoDoMes(de.getFullYear(), de.getMonth());
  return mes.de === p.de && mes.ate === p.ate
    ? { ano: de.getFullYear(), mes: de.getMonth() }
    : null;
}

/** Mês anterior/próximo a partir do início do período atual. */
export function deslocarMes(p: Periodo, delta: number): Periodo {
  const de = dataDe(p.de);
  return periodoDoMes(de.getFullYear(), de.getMonth() + delta);
}

export const ehMesAtual = (p: Periodo) => {
  const m = mesAtual();
  return m.de === p.de && m.ate === p.ate;
};

const dataCurta = (v: string) => dataDe(v).toLocaleDateString("pt-BR");

/** "outubro de 2026" para um mês inteiro; "01/10/2026 a 15/10/2026" para datas personalizadas. */
export function rotuloPeriodo(p: Periodo): string {
  const m = mesDoPeriodo(p);
  if (m)
    return new Date(m.ano, m.mes, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  return p.de === p.ate ? dataCurta(p.de) : `${dataCurta(p.de)} a ${dataCurta(p.ate)}`;
}

/** Versão curta para rótulos de indicadores: "out/2026" ou "01/10 a 15/10/2026". */
export function rotuloPeriodoCurto(p: Periodo): string {
  const m = mesDoPeriodo(p);
  if (m) {
    const nome = new Date(m.ano, m.mes, 1).toLocaleDateString("pt-BR", { month: "short" });
    return `${nome.replace(".", "")}/${m.ano}`;
  }
  return rotuloPeriodo(p);
}

export const intervaloDatas = (p: Periodo) => `${dataCurta(p.de)} a ${dataCurta(p.ate)}`;

/** Lê e valida os parâmetros da URL; o que faltar ou for inválido cai no mês atual / todas as salas. */
export function lerFiltroHospital(search: Record<string, unknown>): Partial<FiltroHospital> {
  const { de, ate, sala } = search as { de?: unknown; ate?: unknown; sala?: unknown };
  const out: Partial<FiltroHospital> = {};
  if (ehData(de) && ehData(ate) && de <= ate) {
    out.de = de;
    out.ate = ate;
  }
  if (typeof sala === "string" && sala.length <= 40) out.sala = sala;
  return out;
}

export function filtroComPadrao(f: Partial<FiltroHospital>): FiltroHospital {
  const mes = mesAtual();
  return { de: f.de ?? mes.de, ate: f.ate ?? mes.ate, sala: f.sala ?? "todas" };
}
