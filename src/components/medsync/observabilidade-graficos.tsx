import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Ponto } from "@/lib/api/observabilidade";

export const COR = {
  azul: "#2563eb",
  verde: "#059669",
  ambar: "#d97706",
  vermelho: "#e11d48",
  roxo: "#7c3aed",
  cinza: "#94a3b8",
} as const;

export const fmtBytes = (n: number) => {
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${Math.round(n)} B`;
};

export const fmtUsd = (n: number) =>
  `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtHora = (t: number, curto = true) =>
  new Date(t).toLocaleString(
    "pt-BR",
    curto
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" },
  );

const estiloEixo = { fontSize: 11, fill: "currentColor", opacity: 0.6 } as const;
const estiloTooltip = {
  contentStyle: { borderRadius: 8, fontSize: 12, border: "1px solid rgba(148,163,184,.4)" },
  labelStyle: { fontWeight: 600 },
} as const;

type Props = { altura?: number };

/** Linha/área simples de uma métrica no tempo. `max` fixa o teto do eixo (ex.: 100 para porcentagem). */
export function GraficoSerie({
  dados,
  cor,
  unidade = "%",
  max,
  altura = 120,
  formatar,
  longo = false,
}: Props & {
  dados: Ponto[];
  cor: string;
  unidade?: string;
  max?: number;
  formatar?: (v: number) => string;
  longo?: boolean;
}) {
  if (dados.length < 2) {
    return (
      <p
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height: altura }}
      >
        Sem dados no período
      </p>
    );
  }
  const id = `g${cor.replace("#", "")}`;
  return (
    <div style={{ height: altura }} role="img" aria-label="Gráfico da métrica no tempo">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.35} />
              <stop offset="95%" stopColor={cor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => fmtHora(t, !longo)}
            tick={estiloEixo}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={estiloEixo}
            domain={[0, max ?? "auto"]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              formatar ? formatar(v) : `${Math.round(v)}${unidade === "%" ? "" : ""}`
            }
            width={46}
          />
          <Tooltip
            {...estiloTooltip}
            labelFormatter={(t: number) => fmtHora(t, false)}
            formatter={(v: number) => [formatar ? formatar(v) : `${v.toFixed(1)}${unidade}`, ""]}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={cor}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Duas séries sobrepostas (ex.: rede de entrada e saída). */
export function GraficoDuplo({
  a,
  b,
  nomeA,
  nomeB,
  altura = 120,
}: Props & { a: Ponto[]; b: Ponto[]; nomeA: string; nomeB: string }) {
  const mapa = new Map<number, { t: number; a?: number; b?: number }>();
  for (const p of a) mapa.set(p.t, { t: p.t, a: p.v });
  for (const p of b) mapa.set(p.t, { ...(mapa.get(p.t) ?? { t: p.t }), b: p.v });
  const dados = [...mapa.values()].sort((x, y) => x.t - y.t);
  if (dados.length < 2) {
    return (
      <p
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height: altura }}
      >
        Sem dados no período
      </p>
    );
  }
  return (
    <div style={{ height: altura }} role="img" aria-label={`Gráfico de ${nomeA} e ${nomeB}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => fmtHora(t)}
            tick={estiloEixo}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={estiloEixo}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtBytes}
            width={56}
          />
          <Tooltip
            {...estiloTooltip}
            labelFormatter={(t: number) => fmtHora(t, false)}
            formatter={(v: number, n: string) => [fmtBytes(v), n]}
          />
          <Area
            type="monotone"
            dataKey="a"
            name={nomeA}
            stroke={COR.azul}
            fill={COR.azul}
            fillOpacity={0.15}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="b"
            name={nomeB}
            stroke={COR.roxo}
            fill={COR.roxo}
            fillOpacity={0.15}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Requisições (barras) com a linha de erros 5xx. */
export function GraficoRequisicoes({
  dados,
  altura = 200,
}: Props & { dados: { t: number; requisicoes: number; erros4xx: number; erros5xx: number }[] }) {
  if (dados.length === 0) {
    return (
      <p
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height: altura }}
      >
        Ainda sem requisições registradas neste período
      </p>
    );
  }
  return (
    <div style={{ height: altura }} role="img" aria-label="Requisições e erros no tempo">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => fmtHora(t)}
            tick={estiloEixo}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={estiloEixo}
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip {...estiloTooltip} labelFormatter={(t: number) => fmtHora(t, false)} />
          <Bar
            dataKey="requisicoes"
            name="Requisições"
            fill={COR.azul}
            fillOpacity={0.5}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="erros4xx"
            name="Erros 4xx (cliente)"
            stroke={COR.ambar}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="erros5xx"
            name="Erros 5xx (servidor)"
            stroke={COR.vermelho}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoLatencia({
  dados,
  altura = 200,
}: Props & { dados: { t: number; latenciaMediaMs: number; latenciaMaxMs: number }[] }) {
  if (dados.length === 0) {
    return (
      <p
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height: altura }}
      >
        Sem dados
      </p>
    );
  }
  return (
    <div style={{ height: altura }} role="img" aria-label="Latência da API no tempo">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => fmtHora(t)}
            tick={estiloEixo}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={estiloEixo}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v} ms`}
            width={56}
          />
          <Tooltip
            {...estiloTooltip}
            labelFormatter={(t: number) => fmtHora(t, false)}
            formatter={(v: number, n: string) => [`${v} ms`, n]}
          />
          <Line
            type="monotone"
            dataKey="latenciaMaxMs"
            name="Máxima"
            stroke={COR.ambar}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="latenciaMediaMs"
            name="Média"
            stroke={COR.verde}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoCustoDiario({
  dados,
  altura = 220,
}: Props & { dados: { dia: string; valor: number }[] }) {
  return (
    <div style={{ height: altura }} role="img" aria-label="Custo diário dos últimos 30 dias">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="dia"
            tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
            tick={estiloEixo}
            minTickGap={24}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={estiloEixo}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={48}
          />
          <Tooltip
            {...estiloTooltip}
            labelFormatter={(d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR")}
            formatter={(v: number) => [fmtUsd(v), "Custo"]}
          />
          <Bar dataKey="valor" fill={COR.azul} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
