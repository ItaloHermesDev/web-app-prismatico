export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMealReminders } = await import("@/lib/reminders");
    startMealReminders();
  }
}
