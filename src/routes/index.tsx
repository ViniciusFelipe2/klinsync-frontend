import { createFileRoute, Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import mark from "@/assets/trizion-mark.png";
import hero from "@/assets/hero-abstract.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trizion Technology | Sites, Plataformas e Agentes de IA" },
      {
        name: "description",
        content:
          "Desenvolvemos sites, plataformas web e agentes de inteligência artificial com engenharia de alto padrão. Conheça a Trizion Technology.",
      },
      {
        property: "og:title",
        content: "Trizion Technology | Sites, Plataformas e Agentes de IA",
      },
      {
        property: "og:description",
        content:
          "Tecnologia, conexão e resultados: soluções digitais sob medida para empresas que querem escalar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const services = [
  {
    title: "Sites & Landing Pages",
    text: "Presença digital rápida, responsiva e com design de alto padrão, pensada para converter.",
  },
  {
    title: "Plataformas Web",
    text: "Sistemas sob medida, dashboards e portais com arquitetura escalável e segura.",
  },
  {
    title: "Agentes de IA",
    text: "Atendimento, vendas e operações automatizadas com agentes inteligentes integrados ao seu negócio.",
  },
  {
    title: "Integrações & Automação",
    text: "Conectamos APIs, CRMs e ferramentas internas para eliminar trabalho manual.",
  },
];

const pillars = [
  { title: "Tecnologia", text: "Soluções inteligentes e inovação contínua." },
  { title: "Conexão", text: "Integração que transforma dados em resultados." },
  { title: "Inovação", text: "Criamos o novo para impulsionar o futuro." },
  { title: "Confiança", text: "Compromisso com a segurança e a excelência." },
  { title: "Resultados", text: "Estratégia e tecnologia gerando valor real." },
];

const steps = [
  {
    n: "01",
    title: "Diagnóstico",
    text: "Entendemos o negócio, o público e o objetivo real do projeto.",
  },
  {
    n: "02",
    title: "Arquitetura",
    text: "Definimos design, stack e fluxo de dados antes da primeira linha de código.",
  },
  {
    n: "03",
    title: "Construção",
    text: "Entregas semanais, ambiente de teste e revisão contínua com você.",
  },
  {
    n: "04",
    title: "Evolução",
    text: "Monitoramento, melhorias e novas funcionalidades depois do lançamento.",
  },
];

function Index() {
  const [menuAberto, setMenuAberto] = useState(false);
  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-3">
            <img src={mark} alt="Logo Trizion Technology" className="h-7 w-auto" />
            <span className="font-display text-sm font-semibold tracking-[0.28em]">TRIZION</span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#solucoes" className="transition-colors hover:text-foreground">
              Soluções
            </a>
            <a href="#processo" className="transition-colors hover:text-foreground">
              Processo
            </a>
            <a href="#valores" className="transition-colors hover:text-foreground">
              Valores
            </a>
            <Link to="/entrar" className="transition-colors hover:text-foreground">
              KlinSync
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="#contato" className="btn-primary hidden !px-5 !py-2 !text-sm sm:inline-flex">
              Falar com a Trizion
            </a>
            <button
              type="button"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((v) => !v)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 text-foreground transition-colors hover:bg-foreground/5 md:hidden"
            >
              {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
        {menuAberto ? (
          <div className="border-t border-border/60 bg-background/95 px-6 py-4 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 text-sm">
              <a
                href="#solucoes"
                onClick={fecharMenu}
                className="rounded-lg px-2 py-2.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                Soluções
              </a>
              <a
                href="#processo"
                onClick={fecharMenu}
                className="rounded-lg px-2 py-2.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                Processo
              </a>
              <a
                href="#valores"
                onClick={fecharMenu}
                className="rounded-lg px-2 py-2.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                Valores
              </a>
              <Link
                to="/entrar"
                onClick={fecharMenu}
                className="rounded-lg px-2 py-2.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                KlinSync
              </Link>
              <a
                href="#contato"
                onClick={fecharMenu}
                className="btn-primary mt-2 justify-center !text-sm"
              >
                Falar com a Trizion
              </a>
            </div>
          </div>
        ) : null}
      </header>

      <main id="top">
        <section className="relative overflow-hidden pt-40 pb-24">
          <div className="hero-glow pointer-events-none absolute inset-x-0 -top-40 h-[720px]" />
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <img
              src={mark}
              alt="Símbolo Trizion Technology"
              width={200}
              height={186}
              className="mx-auto h-24 w-auto drop-shadow-[0_0_60px_oklch(0.62_0.2_255/0.55)]"
            />
            <p className="eyebrow mt-8">Trizion Technology</p>
            <h1 className="mt-5 text-5xl leading-[1.05] font-bold sm:text-6xl md:text-7xl">
              <span className="text-gradient">Tecnologia que</span>
              <br />
              <span className="text-gradient">gera resultado real.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg text-muted-foreground">
              Desenvolvemos sites, plataformas web e agentes de inteligência artificial com
              engenharia precisa e design minimalista.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a href="#contato" className="btn-primary">
                Iniciar um projeto
              </a>
              <a href="#solucoes" className="btn-ghost">
                Ver soluções
              </a>
            </div>
          </div>

          <div className="relative mx-auto mt-20 max-w-5xl px-6">
            <img
              src={hero}
              alt="Escultura digital abstrata em azul marinho e prata"
              width={1600}
              height={1200}
              className="w-full rounded-3xl border border-border object-cover"
            />
          </div>
        </section>

        <section id="solucoes" className="mx-auto max-w-6xl px-6 py-24">
          <p className="eyebrow">Soluções</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-bold md:text-5xl">
            Do site institucional ao agente que trabalha por você.
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {services.map((s) => (
              <article key={s.title} className="surface-card rounded-3xl p-8">
                <h3 className="text-2xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-muted-foreground">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="processo" className="border-y border-border bg-secondary/30 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <p className="eyebrow">Processo</p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">Clareza em cada etapa.</h2>
            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div key={s.n}>
                  <span className="font-display text-4xl font-bold text-primary">{s.n}</span>
                  <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="valores" className="mx-auto max-w-6xl px-6 py-24">
          <p className="eyebrow">Valores</p>
          <h2 className="mt-4 text-4xl font-bold md:text-5xl">Três forças, um propósito.</h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            O símbolo Trizion nasce de três elementos que se unem para gerar soluções — e da letra T
            com o número 7, símbolo de perfeição e evolução.
          </p>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {pillars.map((p) => (
              <div key={p.title} className="bg-background p-7">
                <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contato" className="relative overflow-hidden py-28">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-4xl font-bold md:text-6xl">
              <span className="text-gradient">Vamos construir juntos.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Conte o seu desafio e retornamos com uma proposta clara de escopo, prazo e
              investimento.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a href="mailto:contato@trizion.tech" className="btn-primary">
                contato@trizion.tech
              </a>
              <a
                href="https://wa.me/5500000000000"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={mark} alt="" className="h-6 w-auto opacity-80" />
            <span className="tracking-[0.24em]">TRIZION TECHNOLOGY</span>
          </div>
          <span>
            Sistema desenvolvido por: Trizion Technology LTDA — todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
