import "server-only";

import webpush from "web-push";
import { deletePushSubscription, type PushTarget } from "@/lib/meals";

let configured = false;

function vapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

function ensureWebPush() {
  const keys = vapidKeys();
  if (!keys) return false;
  if (!configured) {
    webpush.setVapidDetails("mailto:prismatico@localhost", keys.publicKey, keys.privateKey);
    configured = true;
  }
  return true;
}

export async function sendPush(
  target: PushTarget,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!ensureWebPush()) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify({ ...payload, url: payload.url ?? "/hoje" }),
      { TTL: 60 * 60, urgency: "high" },
    );
    return true;
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
    if (status === 404 || status === 410) {
      await deletePushSubscription(target.id);
    }
    console.error("Falha ao enviar aviso");
    return false;
  }
}
