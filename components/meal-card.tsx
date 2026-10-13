"use client";

import { useOptimistic, useTransition } from "react";
import { markMeal } from "@/app/actions/meals";

type MealVisualStatus = "upcoming" | "open" | "done" | "missed";

const statusCopy: Record<MealVisualStatus, string> = {
  upcoming: "Ainda não",
  open: "Agora",
  done: "Feita",
  missed: "Falhou",
};

export function MealCard({
  id,
  name,
  time,
  notes,
  items,
  status,
}: {
  id: number;
  name: string;
  time: string;
  notes: string | null;
  items: string[];
  status: MealVisualStatus;
}) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const locked = optimistic === "upcoming";

  function mark(next: "done" | "missed") {
    startTransition(async () => {
      setOptimistic(next);
      await markMeal(id, next);
    });
  }

  return (
    <article
      className={`surface p-4 ${
        optimistic === "done"
          ? "border-mint"
          : optimistic === "missed"
            ? "border-red-200"
            : optimistic === "open"
              ? "border-primary"
              : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted">{time}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{name}</h2>
          {notes && <p className="mt-1 text-sm text-muted">{notes}</p>}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            optimistic === "done"
              ? "bg-mint-soft text-ink"
              : optimistic === "missed"
                ? "bg-red-100 text-red-800"
                : optimistic === "open"
                  ? "bg-primary text-white"
                  : "bg-canvas text-muted"
          }`}
        >
          {statusCopy[optimistic]}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2 text-sm leading-5 text-ink">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={locked || pending}
          onClick={() => mark("done")}
          className={`h-11 rounded-full text-sm font-semibold ${
            optimistic === "done"
              ? "bg-mint text-ink"
              : "bg-primary text-white disabled:bg-slate-200 disabled:text-slate-400"
          }`}
        >
          Fiz
        </button>
        <button
          type="button"
          disabled={locked || pending}
          onClick={() => mark("missed")}
          className={`h-11 rounded-full text-sm font-semibold ${
            optimistic === "missed"
              ? "bg-red-600 text-white"
              : "border border-line bg-white text-ink disabled:text-slate-300"
          }`}
        >
          Falhei
        </button>
      </div>
    </article>
  );
}
