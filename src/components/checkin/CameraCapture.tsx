import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Check, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canvasDoVideo, comprimirCanvas } from "@/lib/comprimir-imagem";

type Props = {
  onConfirm: (dataUrl: string) => void;
  disabled?: boolean;
};

export function CameraCapture({ onConfirm, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [peso, setPeso] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (e) {
      const name = (e as Error & { name?: string }).name;
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Acesso à câmera negado. A foto é obrigatória para concluir o check-in — libere a câmera nas permissões do navegador e tente novamente."
          : "Não foi possível acessar a câmera deste dispositivo. A câmera é obrigatória para concluir o check-in.",
      );
    }
  }, []);

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = canvasDoVideo(video);
    if (!canvas) return;
    const { dataUrl, bytes } = comprimirCanvas(canvas);
    setShot(dataUrl);
    setPeso(bytes);
    stop();
  };

  const retake = () => {
    setShot(null);
    setPeso(null);
    void start();
  };

  if (error) {
    return (
      <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto size-10 text-destructive" />
        <p className="text-base text-foreground">{error}</p>
        <Button size="lg" variant="outline" onClick={() => void start()}>
          <RefreshCw /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted aspect-4/3">
        {shot ? (
          <img
            src={shot}
            alt="Pré-visualização da selfie do check-in"
            className="size-full object-cover"
          />
        ) : (
          <video ref={videoRef} playsInline muted className="size-full scale-x-[-1] object-cover" />
        )}
      </div>

      {shot ? (
        <>
          {peso !== null ? (
            <p className="text-center text-xs text-muted-foreground">
              Foto otimizada: {(peso / 1024).toFixed(0)} KB
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="xl" variant="outline" onClick={retake} disabled={disabled}>
              <RefreshCw /> Tirar novamente
            </Button>
            <Button size="xl" onClick={() => onConfirm(shot)} disabled={disabled}>
              <Check /> Confirmar
            </Button>
          </div>
        </>
      ) : (
        <Button size="xl" className="w-full" onClick={capture} disabled={!ready || disabled}>
          <Camera /> {ready ? "Tirar foto" : "Iniciando câmera..."}
        </Button>
      )}
    </div>
  );
}
