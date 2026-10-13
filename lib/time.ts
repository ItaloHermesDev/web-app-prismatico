const TIME_ZONE = "America/Sao_Paulo";

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export const GRACE_MINUTES = 90;
export const EARLY_MINUTES = 30;

export function saoPauloNow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(read("hour"));
  if (hour === 24) hour = 0;

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    minutes: hour * 60 + Number(read("minute")),
    time: `${String(hour).padStart(2, "0")}:${read("minute").padStart(2, "0")}`,
  };
}

export function parseClock(clock: string) {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
}

export function formatLongDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function weekDates(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const jsDay = utc.getUTCDay();
  const delta = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() + delta);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function monthKeyFromDate(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextMonth = date.getUTCMonth() + 1;
  return `${date.getUTCFullYear()}-${String(nextMonth).padStart(2, "0")}`;
}

export function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function monthWeeks(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const weekday = first.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() + mondayOffset);

  const weeks: string[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + week * 7 + index);
      return date.toISOString().slice(0, 10);
    });
    weeks.push(days);
  }

  if (weeks[5].every((date) => !date.startsWith(monthKey))) {
    weeks.pop();
  }
  return weeks;
}

export function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
