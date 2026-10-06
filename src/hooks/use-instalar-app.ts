import { useEffect, useState } from "react";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Instalação do KlinSync na tela inicial (atalho de aplicativo).
 * Captura o evento de instalação do navegador, indica quando o app já está
 * rodando instalado e sinaliza iPhone/iPad, onde a instalação é manual.
 */
export function useInstalarApp() {
  const [prompt, setPrompt] = useState<PromptInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIos(/iPad|iPhone|iPod/.test(window.navigator.userAgent));

    const aoCapturar = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptInstalacao);
    };
    const aoInstalar = () => {
      setInstalado(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", aoCapturar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoCapturar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  async function instalar() {
    if (!prompt) return false;
    await prompt.prompt();
    const escolha = await prompt.userChoice;
    if (escolha.outcome === "accepted") setInstalado(true);
    setPrompt(null);
    return escolha.outcome === "accepted";
  }

  return { podeInstalar: !!prompt && !instalado, instalado, ios, instalar };
}
