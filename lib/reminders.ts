import {
  claimDispatch,
  clearDispatchesForDate,
  isMealDone,
  listDueReminders,
  listPushTargets,
  listScheduledTimes,
  releaseDispatch,
} from "@/lib/meals";
import { sendPush } from "@/lib/push";
import { parseClock, saoPauloNow } from "@/lib/time";

const globalForReminders = globalThis as unknown as {
  mealReminderTimer?: ReturnType<typeof setInterval>;
};

const SEND_WINDOW_MINUTES = 20;

function isDueWithin(nowMinutes: number, targetMinutes: number, windowMinutes: number) {
  const day = 24 * 60;
  const start = ((targetMinutes % day) + day) % day;
  const elapsed = (nowMinutes - start + day) % day;
  return elapsed < windowMinutes;
}

type DispatchReport = {
  ok: true;
  vapid: boolean;
  now: string;
  times: string[];
  subscriptions: number;
  sent: number;
  failed: number;
  skipped: number;
  statuses: number[];
};

async function dispatchKind(
  logDate: string,
  timeLabel: string,
  kind: "due" | "nudge",
  report: DispatchReport,
) {
  const reminders = await listDueReminders(logDate, timeLabel);
  for (const reminder of reminders) {
    if (kind === "nudge" && (await isMealDone(reminder.userId, reminder.mealId, logDate))) {
      continue;
    }
    const claimed = await claimDispatch({
      userId: reminder.userId,
      mealId: reminder.mealId,
      logDate,
      kind,
    });
    if (!claimed) {
      report.skipped += 1;
      continue;
    }

    const title =
      kind === "due" ? `${reminder.name} · ${reminder.time}` : `Falta marcar ${reminder.name}`;
    const body =
      kind === "due"
        ? "Hora da refeição. Abra o app e marque se fez."
        : "Passou uma hora e essa refeição ainda não foi marcada. Feita ou falhou?";

    const sent = await sendPush(
      {
        id: reminder.subscriptionId,
        userId: reminder.userId,
        endpoint: reminder.endpoint,
        p256dh: reminder.p256dh,
        auth: reminder.auth,
      },
      { title, body, url: "/hoje", tag: `${kind}-${reminder.mealId}` },
    );
    report.statuses.push(sent.status);
    if (sent.ok) {
      report.sent += 1;
      continue;
    }

    report.failed += 1;
    await releaseDispatch({
      userId: reminder.userId,
      mealId: reminder.mealId,
      logDate,
      kind,
    });
  }
}

export async function dispatchDueReminders(options?: { retry?: boolean }): Promise<DispatchReport> {
  const now = saoPauloNow(new Date());
  const vapid = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const times = vapid ? await listScheduledTimes() : [];
  const subscriptions = vapid ? (await listPushTargets()).length : 0;
  const report: DispatchReport = {
    ok: true,
    vapid,
    now: now.time,
    times,
    subscriptions,
    sent: 0,
    failed: 0,
    skipped: 0,
    statuses: [],
  };
  if (!vapid) return report;

  if (options?.retry) await clearDispatchesForDate(now.date);

  const windowMinutes = options?.retry ? 90 : SEND_WINDOW_MINUTES;
  for (const time of times) {
    const mealMinutes = parseClock(time);
    if (isDueWithin(now.minutes, mealMinutes, windowMinutes)) {
      await dispatchKind(now.date, time, "due", report);
    }
    if (isDueWithin(now.minutes, mealMinutes + 60, windowMinutes)) {
      await dispatchKind(now.date, time, "nudge", report);
    }
  }
  return report;
}

export function startMealReminders() {
  if (globalForReminders.mealReminderTimer) return;
  globalForReminders.mealReminderTimer = setInterval(() => {
    void dispatchDueReminders().catch((error) => {
      console.error("Falha ao verificar lembretes de refeição", error);
    });
  }, 20_000);
  void dispatchDueReminders().catch((error) => {
    console.error("Falha ao verificar lembretes de refeição", error);
  });
}
