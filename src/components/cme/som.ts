let contexto: AudioContext | null = null;

/**
 * Bipe curto de acerto e bipe grave duplo de erro, gerados na hora (sem arquivo de áudio).
 * O navegador só libera som depois de alguma interação com a página; até lá, fica em silêncio sem erro.
 */
export function tocar(tipo: "ok" | "erro") {
  try {
    contexto ??= new AudioContext();
    const notas: [number, number][] =
      tipo === "ok"
        ? [[880, 0.12]]
        : [
            [220, 0.18],
            [220, 0.18],
          ];
    let inicio = contexto.currentTime;
    for (const [frequencia, duracao] of notas) {
      const oscilador = contexto.createOscillator();
      const volume = contexto.createGain();
      oscilador.type = "square";
      oscilador.frequency.value = frequencia;
      volume.gain.value = 0.12;
      oscilador.connect(volume).connect(contexto.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + duracao);
      inicio += duracao + 0.08;
    }
  } catch {
    /* sem áudio disponível: o aviso na tela continua valendo */
  }
}
