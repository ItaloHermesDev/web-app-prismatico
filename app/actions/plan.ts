"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import {
  createGuideline,
  createMeal,
  createMealItem,
  deleteGuideline,
  deleteMeal,
  deleteMealItem,
  updateGuideline,
  updateMeal,
  updateMealItem,
  updatePlan,
} from "@/lib/meals";

export type EditorState = { message?: string } | undefined;

function refreshPlan() {
  revalidatePath("/plano");
  revalidatePath("/hoje");
  revalidatePath("/desempenho");
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalNumber(formData: FormData, name: string) {
  const raw = text(formData, name).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function clock(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export async function savePlan(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const title = text(formData, "title");
  const goal = text(formData, "goal");
  const personName = text(formData, "personName");
  if (title.length < 2 || goal.length < 2 || personName.length < 2) {
    return { message: "Preencha título, objetivo e nome." };
  }

  const ageYears = optionalNumber(formData, "ageYears");
  const weightKg = optionalNumber(formData, "weightKg");
  let heightM = optionalNumber(formData, "heightM");
  const waterLiters = optionalNumber(formData, "waterLiters");
  const weeklyLossMinKg = optionalNumber(formData, "weeklyLossMinKg");
  const weeklyLossMaxKg = optionalNumber(formData, "weeklyLossMaxKg");
  const numbers = [ageYears, weightKg, heightM, waterLiters, weeklyLossMinKg, weeklyLossMaxKg];
  if (numbers.some((value) => Number.isNaN(value))) {
    return { message: "Use apenas números nos campos de medida." };
  }
  if (heightM !== null && heightM > 3) heightM = heightM / 100;
  if (ageYears !== null && (ageYears < 1 || ageYears > 120)) {
    return { message: "Idade inválida." };
  }
  if (weightKg !== null && (weightKg < 20 || weightKg > 400)) {
    return { message: "Peso inválido." };
  }
  if (heightM !== null && (heightM < 0.5 || heightM > 2.5)) {
    return { message: "Altura inválida. Use metros, como 1,71." };
  }

  await updatePlan(session.userId, {
    title: title.slice(0, 180),
    goal,
    personName: personName.slice(0, 120),
    ageYears: ageYears === null ? null : Math.round(ageYears),
    weightKg,
    heightM,
    waterLiters,
    weeklyLossMinKg,
    weeklyLossMaxKg,
    referenceWeight: text(formData, "referenceWeight").slice(0, 40) || null,
  });
  refreshPlan();
  return { message: "Dados salvos." };
}

export async function saveMeal(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const mealId = Number(formData.get("mealId"));
  const name = text(formData, "name");
  const time = clock(text(formData, "time"));
  const notes = text(formData, "notes");
  if (!name || !time) {
    return { message: "Informe o nome e um horário válido, como 07:30." };
  }
  const saved = await updateMeal(session.userId, mealId, {
    name: name.slice(0, 120),
    time,
    notes: notes.slice(0, 255) || null,
  });
  if (!saved) return { message: "Não foi possível salvar essa refeição." };
  refreshPlan();
  return { message: "Refeição salva." };
}

export async function addMeal(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const name = text(formData, "name");
  const time = clock(text(formData, "time"));
  const notes = text(formData, "notes");
  if (!name || !time) {
    return { message: "Informe o nome e um horário válido, como 07:30." };
  }
  await createMeal(session.userId, {
    name: name.slice(0, 120),
    time,
    notes: notes.slice(0, 255) || null,
  });
  refreshPlan();
  return { message: "Refeição incluída." };
}

export async function removeMeal(formData: FormData) {
  const session = await verifySession();
  await deleteMeal(session.userId, Number(formData.get("mealId")));
  refreshPlan();
}

export async function saveItem(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const description = text(formData, "description");
  if (description.length < 2) return { message: "Descreva o alimento." };
  const saved = await updateMealItem(
    session.userId,
    Number(formData.get("itemId")),
    description.slice(0, 500),
  );
  if (!saved) return { message: "Não foi possível salvar o alimento." };
  refreshPlan();
  return {};
}

export async function addItem(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const description = text(formData, "description");
  if (description.length < 2) return { message: "Descreva o alimento." };
  const saved = await createMealItem(
    session.userId,
    Number(formData.get("mealId")),
    description.slice(0, 500),
  );
  if (!saved) return { message: "Não foi possível incluir o alimento." };
  refreshPlan();
  return { message: "Alimento incluído." };
}

export async function removeItem(formData: FormData) {
  const session = await verifySession();
  await deleteMealItem(session.userId, Number(formData.get("itemId")));
  refreshPlan();
}

export async function saveGuideline(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const body = text(formData, "body");
  if (body.length < 2) return { message: "Escreva a recomendação." };
  const saved = await updateGuideline(
    session.userId,
    Number(formData.get("guidelineId")),
    body,
  );
  if (!saved) return { message: "Não foi possível salvar a recomendação." };
  refreshPlan();
  return { message: "Recomendação salva." };
}

export async function addGuideline(
  _state: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const session = await verifySession();
  const body = text(formData, "body");
  if (body.length < 2) return { message: "Escreva a recomendação." };
  await createGuideline(session.userId, body);
  refreshPlan();
  return { message: "Recomendação incluída." };
}

export async function removeGuideline(formData: FormData) {
  const session = await verifySession();
  await deleteGuideline(session.userId, Number(formData.get("guidelineId")));
  refreshPlan();
}
