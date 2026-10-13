import {
  claimDispatch,
  isMealDone,
  listDueReminders,
  listScheduledTimes,
} from "@/lib/meals";
import { sendPush } from "@/lib/push";
import { parseClock, saoPauloNow } from "@/lib/time";

const globalForReminders = globalThis as unknown as {
  mealReminderTimer?: ReturnType<typeof setInterval>;
};

function matchesWindow(nowMinutes: number, targetMinutes: number) {
  return nowMinutes === targetMinutes || nowMinutes === targetMinutes + 1;
}

async function dispatchKind(
  logDate: string,
  timeLabel: string,
  kind: "due" | "nudge",
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
    if (!claimed) continue;

    const title =
      kind === "due" ? `${reminder.name} · ${reminder.time}` : `Falta marcar ${reminder.name}`;
    const body =
      kind === "due"
        ? "Hora da refeição. Abra o app e marque se fez."
        : "Passou uma hora e essa refeição ainda não foi marcada. Feita ou falhou?";

    await sendPush(
      {
        id: reminder.subscriptionId,
        userId: reminder.userId,
        endpoint: reminder.endpoint,
        p256dh: reminder.p256dh,
        auth: reminder.auth,
      },
      { title, body, url: "/hoje" },
    );
  }
}

export async function dispatchDueReminders() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const now = saoPauloNow(new Date());
  const times = await listScheduledTimes();
  for (const time of times) {
    const mealMinutes = parseClock(time);
    if (matchesWindow(now.minutes, mealMinutes)) {
      await dispatchKind(now.date, time, "due");
    }
    if (matchesWindow(now.minutes, mealMinutes + 60)) {
      await dispatchKind(now.date, time, "nudge");
    }
  }
}

export function startMealReminders() {
  if (globalForReminders.mealReminderTimer) return;
  globalForReminders.mealReminderTimer = setInterval(() => {
    void dispatchDueReminders().catch(() => {
      console.error("Falha ao verificar lembretes de refeição");
    });
  }, 20_000);
  void dispatchDueReminders().catch(() => {
    console.error("Falha ao verificar lembretes de refeição");
  });
}
