import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { PerformanceCalendars } from "@/components/performance-calendar";
import { ScoreRing } from "@/components/score-ring";
import { getCurrentUser } from "@/lib/dal";
import { getPerformance } from "@/lib/meals";
import { monthKeyFromDate, shiftMonth } from "@/lib/time";

export const metadata: Metadata = {
  title: "Desempenho",
};

export default function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-muted">Carregando o desempenho…</p>}>
      <Desempenho searchParams={searchParams} />
    </Suspense>
  );
}

async function Desempenho({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[] }>;
}) {
  await cookies();
  const user = await getCurrentUser();
  const params = await searchParams;
  const requested = Array.isArray(params.mes) ? params.mes[0] : params.mes;
  const board = await getPerformance(user.id, requested);
  const currentMonth = monthKeyFromDate(board.today);

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Adesão às refeições</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Desempenho</h1>
          <p className="mt-1 text-sm text-muted">
            {board.monthStats.cleanDays} dias limpos no mês · {board.monthStats.failedDays} com falha
          </p>
        </div>
        <div className="flex gap-3">
          <ScoreRing percent={board.weekStats.percent} label="Semana" />
          <ScoreRing percent={board.monthStats.percent} label="Mês" />
        </div>
      </header>

      <PerformanceCalendars
        today={board.today}
        monthTitle={board.monthTitle}
        isCurrentMonth={board.monthKey === currentMonth}
        prevMonth={shiftMonth(board.monthKey, -1)}
        nextMonth={shiftMonth(board.monthKey, 1)}
        week={board.week}
        weeks={board.weeks}
        weekStats={board.weekStats}
        monthStats={board.monthStats}
      />
    </main>
  );
}
