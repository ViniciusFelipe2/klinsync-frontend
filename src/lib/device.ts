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
 * Ambiente de desenvolvimento/visualização (localhost ou dentro de iframe).
 * Nesses casos o app entra em modo visualização e não reserva sala.
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const emIframe = window.self !== window.top;
  const host = window.location.hostname;
  const hostPreview = host === "localhost" || host === "127.0.0.1";
  return emIframe || hostPreview;
}
