/**
 * Cliente reCAPTCHA v3: carrega o script sob demanda e devolve um token para
 * a ação informada. Sem VITE_RECAPTCHA_SITE_KEY configurada, devolve null e o
 * servidor simplesmente não exige captcha.
 */
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = import.meta.env["VITE_RECAPTCHA_SITE_KEY"] as string | undefined;
let carregando: Promise<void> | null = null;

function carregarScript(siteKey: string): Promise<void> {
  if (carregando) return carregando;
  carregando = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("recaptcha"));
    document.head.appendChild(el);
  });
  return carregando;
}

export async function obterTokenCaptcha(acao: string): Promise<string | null> {
  if (typeof window === "undefined" || !SITE_KEY) return null;
  try {
    await carregarScript(SITE_KEY);
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) return null;
    await new Promise<void>((resolve) => grecaptcha.ready(() => resolve()));
    return await grecaptcha.execute(SITE_KEY, { action: acao });
  } catch {
    return null;
  }
}
