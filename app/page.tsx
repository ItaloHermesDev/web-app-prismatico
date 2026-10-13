import { Suspense } from "react";
import Link from "next/link";
import { ChartColumn, ClipboardList, Utensils } from "lucide-react";
import { SiteNav } from "@/components/site-nav";

const points = [
  {
    icon: ClipboardList,
    title: "Plano do dia",
    body: "Cada refeição no horário, com o que precisa ser feito.",
  },
  {
    icon: Utensils,
    title: "Registro rápido",
    body: "Marque o que fez e o que ficou para trás, no celular.",
  },
  {
    icon: ChartColumn,
    title: "Desempenho",
    body: "A disciplina da semana e do mês, em calendário.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <Suspense fallback={<div className="h-16" />}>
        <SiteNav />
      </Suspense>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-16 md:px-8">
        <section className="rounded-2xl bg-ink px-6 py-10 text-white md:px-10 md:py-14">
          <p className="text-xs font-semibold tracking-[0.28em] text-mint uppercase">prismatico</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
            Planeje. Registre. <span className="text-mint">Evolua.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-white/75">
            Seu plano alimentar na prática. Clareza para o dia, equilíbrio na rotina e um
            registro simples do que você cumpriu.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-mint px-5 text-sm font-semibold text-ink hover:bg-[#00b386] sm:w-auto"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
            >
              Criar conta
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          {points.map((point) => {
            const Icon = point.icon;
            return (
              <article key={point.title} className="surface p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-soft text-primary">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <h2 className="mt-4 text-base font-semibold text-ink">{point.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{point.body}</p>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
