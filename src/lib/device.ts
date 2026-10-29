const DEVICE_KEY = "giro:device-id";

/** Identificador único e persistente deste aparelho (tablet). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * Modo visualização: só dentro de iframe (ex.: painel embutido). Em localhost o app
 * reserva a sala normalmente, para que o vínculo sala/tablet possa ser testado.
 * O servidor exige o tablet vinculado de qualquer forma.
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return window.self !== window.top;
}
