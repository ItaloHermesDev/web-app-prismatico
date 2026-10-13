"use client";

import { useActionState } from "react";
import {
  addGuideline,
  addItem,
  addMeal,
  removeGuideline,
  removeItem,
  removeMeal,
  saveGuideline,
  saveItem,
  saveMeal,
  savePlan,
  type EditorState,
} from "@/app/actions/plan";
type PlanDetails = {
  title: string;
  goal: string;
  personName: string;
  ageYears: number | null;
  weightKg: number | null;
  heightM: number | null;
  waterLiters: number | null;
  weeklyLossMinKg: number | null;
  weeklyLossMaxKg: number | null;
  referenceWeight: string | null;
  guidelines: { id: number; body: string }[];
  meals: {
    id: number;
    name: string;
    time: string;
    notes: string | null;
    items: { id: number; description: string }[];
  }[];
};

const fieldClass = "field";

export function PlanEditor({ plan }: { plan: PlanDetails }) {
  return (
    <div className="flex flex-col gap-6">
      <PlanForm plan={plan} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Refeições</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {plan.meals.map((meal) => (
            <MealForm key={meal.id} meal={meal} />
          ))}
        </div>
        <AddMealForm key={plan.meals.length} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Recomendações</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {plan.guidelines.map((guideline) => (
            <GuidelineForm key={guideline.id} guideline={guideline} />
          ))}
        </div>
        <AddGuidelineForm key={plan.guidelines.length} />
      </section>
    </div>
  );
}

function PlanForm({ plan }: { plan: PlanDetails }) {
  const [state, action, pending] = useActionState(savePlan, undefined);

  return (
    <form action={action} className="surface p-4">
      <h2 className="text-lg font-semibold text-ink">Dados do plano</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Título" name="title" defaultValue={plan.title} />
        <Field label="Nome" name="personName" defaultValue={plan.personName} />
        <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
          Objetivo
          <textarea
            name="goal"
            defaultValue={plan.goal}
            rows={3}
            className="rounded-xl border border-line px-3 py-2 text-ink outline-none ring-primary focus:ring-2"
          />
        </label>
        <Field label="Idade" name="ageYears" defaultValue={plan.ageYears ?? ""} inputMode="numeric" />
        <Field label="Peso (kg)" name="weightKg" defaultValue={plan.weightKg ?? ""} inputMode="decimal" />
        <Field label="Altura (m)" name="heightM" defaultValue={plan.heightM ?? ""} inputMode="decimal" />
        <Field label="Água (litros)" name="waterLiters" defaultValue={plan.waterLiters ?? ""} inputMode="decimal" />
        <Field label="Perda mínima (kg/sem)" name="weeklyLossMinKg" defaultValue={plan.weeklyLossMinKg ?? ""} inputMode="decimal" />
        <Field label="Perda máxima (kg/sem)" name="weeklyLossMaxKg" defaultValue={plan.weeklyLossMaxKg ?? ""} inputMode="decimal" />
        <Field label="Peso de referência" name="referenceWeight" defaultValue={plan.referenceWeight ?? ""} />
      </div>
      <FormFooter state={state} pending={pending} label="Salvar dados" />
    </form>
  );
}

function MealForm({ meal }: { meal: PlanDetails["meals"][number] }) {
  const [state, action, pending] = useActionState(saveMeal, undefined);
  const [itemState, itemAction, itemPending] = useActionState(addItem, undefined);

  return (
    <article className="surface p-4">
      <form action={action} className="grid gap-3">
        <input type="hidden" name="mealId" value={meal.id} />
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <Field label="Refeição" name="name" defaultValue={meal.name} />
          <Field label="Horário" name="time" defaultValue={meal.time} />
        </div>
        <Field label="Nota" name="notes" defaultValue={meal.notes ?? ""} />
        <FormFooter state={state} pending={pending} label="Salvar refeição" />
      </form>

      <ul className="mt-4 flex flex-col gap-2">
        {meal.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>

      <form key={meal.items.length} action={itemAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="mealId" value={meal.id} />
        <input
          name="description"
          placeholder="Incluir alimento"
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={itemPending}
          className="h-11 shrink-0 rounded-full bg-mint-soft px-4 text-sm font-semibold text-ink"
        >
          Incluir
        </button>
      </form>
      {itemState?.message && <p className="mt-2 text-sm text-muted">{itemState.message}</p>}

      <form action={removeMeal} className="mt-3">
        <input type="hidden" name="mealId" value={meal.id} />
        <button type="submit" className="h-10 text-sm font-semibold text-red-700">
          Remover refeição
        </button>
      </form>
    </article>
  );
}

function ItemRow({ item }: { item: { id: number; description: string } }) {
  const [state, action, pending] = useActionState(saveItem, undefined);

  return (
    <li className="flex flex-col gap-2 sm:flex-row">
      <form action={action} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
        <input type="hidden" name="itemId" value={item.id} />
        <input name="description" defaultValue={item.description} className={fieldClass} />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-2xl px-3 text-sm font-semibold text-ink border border-line"
        >
          Salvar
        </button>
      </form>
      <form action={removeItem}>
        <input type="hidden" name="itemId" value={item.id} />
        <button type="submit" className="h-11 px-2 text-sm font-semibold text-red-700">
          Remover
        </button>
      </form>
      {state?.message && <p className="text-sm text-muted sm:hidden">{state.message}</p>}
    </li>
  );
}

function AddMealForm() {
  const [state, action, pending] = useActionState(addMeal, undefined);

  return (
    <form action={action} className="rounded-2xl border border-dashed border-line bg-white p-4">
      <h3 className="font-semibold text-ink">Nova refeição</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_1fr_auto]">
        <input name="name" placeholder="Nome" className={fieldClass} />
        <input name="time" placeholder="08:00" className={fieldClass} />
        <input name="notes" placeholder="Nota" className={fieldClass} />
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white"
        >
          Incluir
        </button>
      </div>
      {state?.message && <p className="mt-2 text-sm text-muted">{state.message}</p>}
    </form>
  );
}

function GuidelineForm({ guideline }: { guideline: { id: number; body: string } }) {
  const [state, action, pending] = useActionState(saveGuideline, undefined);

  return (
    <form action={action} className="surface p-4">
      <input type="hidden" name="guidelineId" value={guideline.id} />
      <textarea
        name="body"
        defaultValue={guideline.body}
        rows={3}
        className="w-full rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none ring-primary focus:ring-2"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white"
        >
          Salvar
        </button>
        <button
          type="submit"
          formAction={removeGuideline}
          className="h-10 text-sm font-semibold text-red-700"
        >
          Remover
        </button>
      </div>
      {state?.message && <p className="mt-2 text-sm text-muted">{state.message}</p>}
    </form>
  );
}

function AddGuidelineForm() {
  const [state, action, pending] = useActionState(addGuideline, undefined);

  return (
    <form action={action} className="rounded-2xl border border-dashed border-line bg-white p-4">
      <textarea
        name="body"
        rows={2}
        placeholder="Nova recomendação"
        className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
      />
      <FormFooter state={state} pending={pending} label="Incluir recomendação" />
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-ink">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className={fieldClass}
      />
    </label>
  );
}

function FormFooter({
  state,
  pending,
  label,
}: {
  state: EditorState;
  pending: boolean;
  label: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-full bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Salvando…" : label}
      </button>
      {state?.message && <p className="text-sm text-muted">{state.message}</p>}
    </div>
  );
}
