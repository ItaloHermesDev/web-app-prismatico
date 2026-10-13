import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { MealCard } from "@/components/meal-card";
import { ScoreRing } from "@/components/score-ring";
import { getCurrentUser } from "@/lib/dal";
import { disciplinePercent, getWeekBoard } from "@/lib/meals";
import { formatLongDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Hoje",
};

export default function HojePage() {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-muted">Carregando o dia…</p>}>
      <Hoje />
    </Suspense>
  );
}

async function Hoje() {
  await cookies();
  const user = await getCurrentUser();
  const board = await getWeekBoard(user.id);
  const today = board.days.find((day) => day.isToday) ?? board.days[0];
  const percent = disciplinePercent(today.done, today.missed);
  const current = today.meals.find((meal) => meal.status === "open");
  const firstName = user.name.trim().split(/\s+/)[0] || "Hoje";
  const longDate = formatLongDate(today.date);
  const headingDate = longDate.charAt(0).toLocaleUpperCase("pt-BR") + longDate.slice(1);

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{headingDate}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Olá, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            {today.done} feitas · {today.missed} falhas · {today.open + today.upcoming} à frente
          </p>
        </div>
        <ScoreRing percent={percent} label="Disciplina" />
      </header>

      {current && (
        <p className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white">
          Agora: {current.name} às {current.time}
        </p>
      )}

      <p className="surface px-4 py-3 text-sm text-ink">
        Meta de água: {board.plan.waterLiters ?? "—"} litros.
      </p>

      {today.meals.length === 0 ? (
        <p className="surface p-4 text-sm text-muted">
          Nenhuma refeição no plano. Inclua a primeira em Plano.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {today.meals.map((meal) => (
            <MealCard
              key={meal.id}
              id={meal.id}
              name={meal.name}
              time={meal.time}
              notes={meal.notes}
              status={meal.status}
              items={meal.items.map((item) => item.description)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
