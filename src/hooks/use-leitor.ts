import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

export type Leitura = {
  /** O texto com os caracteres de controle reais: é o que vai para o servidor. */
  texto: string;
  /** O mesmo texto com os invisíveis escritos por extenso, para diagnóstico na tela. */
  visivel: string;
  /** Da primeira à última tecla, sem contar o Enter final. */
  duracaoMs: number;
  /** Quantas teclas chegaram (o servidor refaz a conta de velocidade com este número). */
  teclas: number;
  /** Leitor "digita" muito mais rápido que uma pessoa. */
  pareceLeitor: boolean;
};

/** Média por tecla abaixo disto não é digitação humana. */
const MS_POR_TECLA_DO_LEITOR = 30;
const MIN_TECLAS_PARA_MEDIR = 4;
/** Texto parado sem Enter por este tempo significa que o leitor não está enviando o Enter no final. */
const ESPERA_DO_ENTER_MS = 800;

const TECLAS_IGNORADAS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock"]);
const NOMES_DE_TECLA: Record<string, [string, string]> = {
  Tab: ["[TAB]", "\t"],
  Escape: ["[ESC]", "\u001b"],
  Backspace: ["[BACKSPACE]", ""],
};

/** Um caractere comum, com o espaço visível; Ctrl+tecla vira o caractere de controle que ela representa (Ctrl+] = GS). */
function traduzirTecla(
  e: KeyboardEvent<HTMLInputElement>,
): { visivel: string; texto: string } | null {
  if (TECLAS_IGNORADAS.has(e.key)) return null;
  const nomeada = NOMES_DE_TECLA[e.key];
  if (nomeada) return { visivel: nomeada[0], texto: nomeada[1] };
  if (e.ctrlKey && e.key.length === 1) {
    const codigo = e.key.toUpperCase().charCodeAt(0) - 64;
    if (codigo === 29) return { visivel: "[GS]", texto: "\u001d" };
    if (codigo > 0 && codigo < 32) {
      return { visivel: `[CTRL+${e.key.toUpperCase()}]`, texto: String.fromCharCode(codigo) };
    }
    return { visivel: `[CTRL+${e.key}]`, texto: "" };
  }
  if (e.key === " ") return { visivel: "[ESPAÇO]", texto: " " };
  if (e.key.length === 1) return { visivel: e.key, texto: e.key };
  return { visivel: `[${e.key.toUpperCase()}]`, texto: "" };
}

/**
 * O leitor é tratado só como um teclado que envia texto e Enter: nada aqui depende de um modelo específico.
 * Lê tecla a tecla, e não o valor do campo, porque o campo descarta os caracteres invisíveis que o diagnóstico precisa mostrar.
 */
export function useLeitor(aoLer: (leitura: Leitura) => void) {
  const texto = useRef("");
  const visivel = useRef("");
  const teclas = useRef(0);
  const primeira = useRef(0);
  const ultima = useRef(0);
  const espera = useRef<number | undefined>(undefined);
  const [recebendo, setRecebendo] = useState("");
  const [semEnter, setSemEnter] = useState(false);

  const limpar = useCallback(() => {
    texto.current = "";
    visivel.current = "";
    teclas.current = 0;
    window.clearTimeout(espera.current);
    setRecebendo("");
    setSemEnter(false);
  }, []);

  useEffect(() => () => window.clearTimeout(espera.current), []);

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (teclas.current === 0) return;
      const duracaoMs = Math.round(ultima.current - primeira.current);
      const leitura: Leitura = {
        texto: texto.current,
        visivel: `${visivel.current}[ENTER]`,
        duracaoMs,
        teclas: teclas.current,
        pareceLeitor:
          teclas.current >= MIN_TECLAS_PARA_MEDIR &&
          duracaoMs / (teclas.current - 1) < MS_POR_TECLA_DO_LEITOR,
      };
      limpar();
      aoLer(leitura);
      return;
    }
    const tecla = traduzirTecla(e);
    if (!tecla) return;
    e.preventDefault();
    const agora = performance.now();
    if (teclas.current === 0) primeira.current = agora;
    ultima.current = agora;
    teclas.current += 1;
    texto.current += tecla.texto;
    visivel.current += tecla.visivel;
    setRecebendo(visivel.current);
    setSemEnter(false);
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => setSemEnter(true), ESPERA_DO_ENTER_MS);
  };

  return { aoTeclar, recebendo, semEnter, limpar };
}
