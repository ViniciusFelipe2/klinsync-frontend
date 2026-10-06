import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CameraCapture } from "@/components/checkin/CameraCapture";
import { createCheckIn } from "@/lib/api/checkin";
import bg from "@/assets/sala-cirurgica.jpg";

export const Route = createFileRoute("/_authenticated/check-in/")({
  head: () => ({
    meta: [
      { title: "Check-in de Cirurgiões | Centro Cirúrgico" },
      {
        name: "description",
        content:
          "Registre a chegada ao Centro Cirúrgico com foto tirada na hora e horário oficial do servidor.",
      },
      { property: "og:title", content: "Check-in de Cirurgiões | Centro Cirúrgico" },
      {
        property: "og:description",
        content: "Comprovação de presença com selfie e horário registrado automaticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorCheckIn,
});

type Step = "idle" | "name" | "photo" | "success";

function DoctorCheckIn() {
  const [step, setStep] = useState<Step>("idle");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");
  const [seconds, setSeconds] = useState(20);
  const submit = createCheckIn;

  const nameValid = useMemo(() => name.trim().length >= 3, [name]);

  useEffect(() => {
    if (step !== "success") return;
    setSeconds(20);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          reset("idle");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function reset(next: Step) {
    setName("");
    setError(null);
    setStep(next);
  }

  async function handleConfirm(photoBase64: string) {
    setSaving(true);
    setError(null);
    try {
      const result = await submit({ data: { doctorName: name.trim(), photoBase64 } });
      setSavedName(result.doctor_name);
      setStep("success");
    } catch {
      setError("Não foi possível concluir o check-in. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-background/55" />
      <div className="relative">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          {step === "idle" && (
            <section className="space-y-8 text-center">
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Check-in de cirurgiões
                </h1>
                <p className="text-base text-muted-foreground">
                  Informe seu nome e registre uma foto no momento da chegada. O horário é gerado
                  automaticamente pelo sistema.
                </p>
              </div>
              <Button size="xl" className="w-full sm:w-auto" onClick={() => reset("name")}>
                Realizar novo check-in <ArrowRight />
              </Button>
            </section>
          )}

          {step === "name" && (
            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Identificação</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Digite seu nome completo como consta no registro profissional.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-name" className="text-sm">
                  Nome completo
                </Label>
                <Input
                  id="doctor-name"
                  value={name}
                  autoFocus
                  maxLength={120}
                  placeholder="Ex.: Dra. Ana Carolina Ribeiro"
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-base"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="xl" variant="outline" onClick={() => reset("idle")}>
                  Cancelar
                </Button>
                <Button size="xl" disabled={!nameValid} onClick={() => setStep("photo")}>
                  Continuar <ArrowRight />
                </Button>
              </div>
            </section>
          )}

          {step === "photo" && (
            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Foto de comprovação</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {name.trim()} — posicione o rosto no quadro e tire a foto. A imagem é obrigatória
                  e só pode ser capturada agora, pela câmera.
                </p>
              </div>
              <CameraCapture onConfirm={handleConfirm} disabled={saving} />
              {saving && (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Registrando check-in...
                </p>
              )}
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("name")}
                disabled={saving}
              >
                Voltar
              </Button>
            </section>
          )}

          {step === "success" && (
            <section className="space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto size-16 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                {savedName}, check-in realizado com sucesso
              </h1>
              <p className="text-sm text-muted-foreground">
                Voltando em {seconds}s para a tela inicial...
              </p>
              <Button size="xl" className="w-full" onClick={() => reset("name")}>
                Realizar novo check-in
              </Button>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
