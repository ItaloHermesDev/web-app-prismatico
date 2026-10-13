"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import {
  listUserSubscriptions,
  savePushSubscription,
  setMealStatus,
} from "@/lib/meals";
import { sendPush } from "@/lib/push";

export async function markMeal(mealId: number, status: "done" | "missed") {
  const session = await verifySession();
  if (status !== "done" && status !== "missed") return;
  await setMealStatus(session.userId, mealId, status);
  revalidatePath("/hoje");
  revalidatePath("/desempenho");
}

export async function subscribeToPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await verifySession();
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { ok: false as const, message: "Inscrição inválida." };
  }
  await savePushSubscription(session.userId, {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
  return { ok: true as const };
}

export async function sendTestPush() {
  const session = await verifySession();
  const targets = await listUserSubscriptions(session.userId);
  if (targets.length === 0) {
    return { ok: false as const, message: "Ative os avisos neste celular primeiro." };
  }

  let delivered = 0;
  for (const target of targets) {
    const sent = await sendPush(target, {
      title: "Prismático",
      body: "Aviso de teste. Os horários das refeições chegam neste celular.",
      url: "/hoje",
    });
    if (sent) delivered += 1;
  }

  if (delivered === 0) {
    return { ok: false as const, message: "Não foi possível entregar o aviso de teste." };
  }
  return { ok: true as const, message: "Aviso de teste enviado." };
}
