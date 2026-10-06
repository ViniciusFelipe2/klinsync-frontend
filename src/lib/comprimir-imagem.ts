// Compressão de fotos do check-in: reduz resolução e busca a maior qualidade
// possível dentro de um teto de bytes, mantendo o rosto legível para auditoria.

const MAX_SIDE = 720;
const TARGET_BYTES = 120_000; // ~120 KB por foto
const MIN_QUALITY = 0.45;

function bytesDeDataUrl(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4);
}

function suportaWebp() {
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/** Desenha o frame do vídeo (espelhado) em um canvas já redimensionado. */
export function canvasDoVideo(video: HTMLVideoElement, maxSide = MAX_SIDE) {
  const sw = video.videoWidth;
  const sh = video.videoHeight;
  if (!sw || !sh) return null;
  const escala = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * escala);
  canvas.height = Math.round(sh * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export type FotoComprimida = { dataUrl: string; bytes: number; tipo: string };

/**
 * Comprime o canvas em WebP (fallback JPEG), reduzindo a qualidade em passos
 * até caber no teto de bytes. Nunca desce abaixo de MIN_QUALITY para não
 * borrar o rosto.
 */
export function comprimirCanvas(
  canvas: HTMLCanvasElement,
  alvoBytes = TARGET_BYTES,
): FotoComprimida {
  const tipo = suportaWebp() ? "image/webp" : "image/jpeg";
  let qualidade = tipo === "image/webp" ? 0.82 : 0.78;
  let dataUrl = canvas.toDataURL(tipo, qualidade);
  let bytes = bytesDeDataUrl(dataUrl);

  while (bytes > alvoBytes && qualidade > MIN_QUALITY) {
    qualidade = Math.max(MIN_QUALITY, qualidade - 0.08);
    dataUrl = canvas.toDataURL(tipo, qualidade);
    bytes = bytesDeDataUrl(dataUrl);
  }

  return { dataUrl, bytes, tipo };
}
