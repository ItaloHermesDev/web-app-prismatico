"use client";

import Link from "next/link";
import { useState } from "react";
import type { PerformanceDay, PerformanceStats } from "@/lib/performance-types";
import { WEEKDAY_LABELS, formatLongDate } from "@/lib/time";

const toneClass: Record<string, string> = {
  clean: "bg-mint text-ink",
  partial: "bg-amber-400 text-ink",
  failed: "bg-red-600 text-white",
  progress: "border border-line bg-white text-ink",
  future: "bg-slate-100 text-slate-400",
  before: "bg-slate-50 text-slate-300",
};

function tone(day: PerformanceDay) {
  if (day.beforePlan) return "before";
  if (day.isFuture) return "future";
  if (day.total > 0 && day.missed === 0 && day.done === day.total) return "clean";
  if (day.missed > 0 && day.done === 0) return "failed";
  if (day.missed > 0) return "partial";
  if (day.done > 0 || day.open > 0) return "progress";
  return "future";
}

function scoreLabel(day: PerformanceDay) {
  if (day.beforePlan || day.isFuture || day.total === 0) return "";
  if (day.percent !== null) return `${day.percent}%`;
  if (day.missed > 0) {
    return `${Math.round((day.done / (day.done + day.missed)) * 100)}%`;
  }
  return `${day.done}/${day.total}`;
}

function periodLine(stats: PerformanceStats) {
  if (stats.trackedDays === 0) return "Nenhum dia encerrado neste período.";
  return `${stats.cleanDays} limpos · ${stats.failedDays} com falha`;
}

function DayButton({
  day,
  selected,
  compact,
  onSelect,
}: {
  day: PerformanceDay;
  selected: boolean;
  compact?: boolean;
  onSelect: (date: string) => void;
}) {
  const faded = !day.inMonth;
  const label = scoreLabel(day);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={day.isToday ? "date" : undefined}
      aria-label={`${formatLongDate(day.date)}${label ? `, ${label}` : ""}`}
      onClick={() => onSelect(day.date)}
      className={`flex flex-col items-center justify-center rounded-2xl transition ${
        compact ? "min-h-14 gap-0.5 md:min-h-[4.75rem]" : "min-h-24 gap-1 md:min-h-32"
      } ${toneClass[tone(day)]} ${faded ? "opacity-40" : ""} ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : ""
      } ${day.isToday && !selected ? "outline outline-primary" : ""}`}
    >
      {!compact && (
        <span className={`text-[10px] font-medium uppercase tracking-wide ${faded ? "" : "opacity-80"}`}>
          {day.label}
        </span>
      )}
      <span className={`font-semibold ${compact ? "text-sm md:text-base" : "text-lg"}`}>
        {day.dayNumber}
      </span>
      <span className={`font-medium ${compact ? "text-[10px] md:text-xs" : "text-xs"}`}>
        {label || "·"}
      </span>
    </button>
  );
}

function DayDetail({ day }: { day: PerformanceDay }) {
  const longDate = formatLongDate(day.date);
  const heading = longDate.charAt(0).toLocaleUpperCase("pt-BR") + longDate.slice(1);
  const failures = day.meals.filter((meal) => meal.status === "missed");
  const upcoming = day.meals.filter((meal) => meal.status === "upcoming").length;
  const summary = day.beforePlan
    ? "Este dia é anterior ao início do plano."
    : day.isFuture
      ? "Este dia ainda não chegou."
      : day.total === 0
        ? "Nenhuma refeição cadastrada."
        : failures.length === 0 && day.done === day.total
          ? "Dia limpo. Todas as refeições foram feitas."
          : `${day.done} feitas · ${day.missed} falhas${day.open > 0 ? ` · ${day.open} em aberto` : ""}${upcoming > 0 ? ` · ${upcoming} à frente` : ""}`;

  return (
    <section className="surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{heading}</h3>
          <p className="mt-1 text-sm text-muted">{summary}</p>
        </div>
        <p className="text-lg font-semibold text-ink">{scoreLabel(day) || "—"}</p>
      </div>

      {day.meals.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {day.meals.map((meal) => (
            <li
              key={`${meal.time}-${meal.name}`}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm ${
                meal.status === "done"
                  ? "bg-mint-soft text-ink"
                  : meal.status === "missed"
                    ? "bg-red-50 text-red-800"
                    : "bg-canvas text-muted"
              }`}
            >
              <span>
                <span className="font-mono">{meal.time}</span> {meal.name}
              </span>
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide">
                {meal.status === "done"
                  ? "Feita"
                  : meal.status === "missed"
                    ? "Falhou"
                    : meal.status === "open"
                      ? "Em aberto"
                      : "À frente"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PerformanceCalendars({
  today,
  monthTitle,
  isCurrentMonth,
  prevMonth,
  nextMonth,
  week,
  weeks,
  weekStats,
  monthStats,
}: {
  today: string;
  monthTitle: string;
  isCurrentMonth: boolean;
  prevMonth: string;
  nextMonth: string;
  week: PerformanceDay[];
  weeks: PerformanceDay[][];
  weekStats: PerformanceStats;
  monthStats: PerformanceStats;
}) {
  const [selected, setSelected] = useState(today);
  const days = [...week, ...weeks.flat()];
  const selectedDay = days.find((day) => day.date === selected) ?? week.find((day) => day.isToday) ?? week[0];
  const weekRange = `${week[0]?.dayNumber}/${week[0]?.date.slice(5, 7)} – ${week[6]?.dayNumber}/${week[6]?.date.slice(5, 7)}`;

  return (
    <div className="flex flex-col gap-4">
      <section className="surface p-3 md:p-4">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-semibold text-ink">Esta semana</h2>
            <p className="text-sm text-muted">
              {weekRange} · {periodLine(weekStats)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {week.map((day) => (
            <DayButton key={day.date} day={day} selected={day.date === selectedDay?.date} onSelect={setSelected} />
          ))}
        </div>
      </section>

      <section className="surface p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <Link
            href={`/desempenho?mes=${prevMonth}`}
            aria-label="Mês anterior"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-white text-xl text-ink"
          >
            ‹
          </Link>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-lg font-semibold text-ink">{monthTitle}</h2>
            <p className="text-sm text-muted">{periodLine(monthStats)}</p>
          </div>
          {isCurrentMonth ? (
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-300"
            >
              ›
            </span>
          ) : (
            <Link
              href={`/desempenho?mes=${nextMonth}`}
              aria-label="Próximo mês"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-white text-xl text-ink"
            >
              ›
            </Link>
          )}
        </div>

        {!isCurrentMonth && (
          <div className="mb-3 text-center">
            <Link href="/desempenho" className="text-sm font-semibold text-primary">
              Voltar ao mês atual
            </Link>
          </div>
        )}

        <div className="mb-1.5 grid grid-cols-7 gap-1.5 md:gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <p key={label} className="text-center text-[10px] font-medium tracking-wide text-muted uppercase md:text-xs">
              {label}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 md:gap-2">
          {weeks.map((weekDays) => (
            <div key={weekDays[0]?.date} className="grid grid-cols-7 gap-1.5 md:gap-2">
              {weekDays.map((day) => (
                <DayButton
                  key={day.date}
                  day={day}
                  compact
                  selected={day.date === selectedDay?.date}
                  onSelect={setSelected}
                />
              ))}
            </div>
          ))}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-mint" /> Limpo
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Parcial
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Falhou
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white ring-1 ring-line" /> Em aberto
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Futuro
          </li>
        </ul>
      </section>

      {selectedDay && <DayDetail day={selectedDay} />}
    </div>
  );
}
