import "server-only";

import { io } from "next/cache";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureUsersTable, pool } from "@/lib/db";
import { cuttingPlan } from "@/lib/plan-data";
import type { PerformanceBoard, PerformanceDay, PerformanceMeal } from "@/lib/performance-types";
import {
  EARLY_MINUTES,
  GRACE_MINUTES,
  WEEKDAY_LABELS,
  formatMonthTitle,
  monthKeyFromDate,
  monthWeeks,
  parseClock,
  saoPauloNow,
  weekDates,
} from "@/lib/time";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meal_plans (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    goal VARCHAR(255) NOT NULL,
    person_name VARCHAR(120) NOT NULL,
    age_years TINYINT UNSIGNED NULL,
    weight_kg DECIMAL(5,2) NULL,
    height_m DECIMAL(3,2) NULL,
    water_liters DECIMAL(3,1) NULL,
    weekly_loss_min_kg DECIMAL(3,1) NULL,
    weekly_loss_max_kg DECIMAL(3,1) NULL,
    reference_weight VARCHAR(40) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY meal_plans_user_unique (user_id),
    CONSTRAINT meal_plans_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS meals (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    plan_id INT UNSIGNED NOT NULL,
    name VARCHAR(80) NOT NULL,
    time_label CHAR(5) NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL,
    notes VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY meals_plan_idx (plan_id, sort_order),
    CONSTRAINT meals_plan_fk FOREIGN KEY (plan_id) REFERENCES meal_plans (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS meal_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    meal_id INT UNSIGNED NOT NULL,
    description VARCHAR(255) NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY meal_items_meal_idx (meal_id, sort_order),
    CONSTRAINT meal_items_meal_fk FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS guidelines (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    plan_id INT UNSIGNED NOT NULL,
    body TEXT NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY guidelines_plan_idx (plan_id, sort_order),
    CONSTRAINT guidelines_plan_fk FOREIGN KEY (plan_id) REFERENCES meal_plans (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS meal_logs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    meal_id INT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY meal_logs_unique (user_id, meal_id, log_date),
    KEY meal_logs_user_date_idx (user_id, log_date),
    CONSTRAINT meal_logs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT meal_logs_meal_fk FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY push_endpoint_unique (endpoint),
    KEY push_user_idx (user_id),
    CONSTRAINT push_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS notification_dispatches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    meal_id INT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    kind VARCHAR(10) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY notification_dispatches_unique (user_id, meal_id, log_date, kind)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let schemaReady: Promise<void> | null = null;

export function ensureMealSchema() {
  schemaReady ??= (async () => {
    await ensureUsersTable();
    for (const statement of SCHEMA) {
      await pool.query(statement);
    }
  })();
  return schemaReady;
}

const MIGRATIONS = [
  "ALTER TABLE meal_plans MODIFY goal TEXT NOT NULL",
  "ALTER TABLE meals MODIFY name VARCHAR(120) NOT NULL",
  "ALTER TABLE meal_items MODIFY description VARCHAR(500) NOT NULL",
];

export async function ensureMealMigrations() {
  await ensureMealSchema();
  for (const statement of MIGRATIONS) {
    await pool.query(statement);
  }
}

const seededUsers = new Set<number>();

export async function ensureCuttingPlan(userId: number) {
  await ensureMealMigrations();
  if (seededUsers.has(userId)) return;

  const [existing] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM meal_plans WHERE user_id = ? LIMIT 1",
    [userId],
  );
  if (existing.length > 0) {
    seededUsers.add(userId);
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [planResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO meal_plans
        (user_id, title, goal, person_name, age_years, weight_kg, height_m, water_liters, weekly_loss_min_kg, weekly_loss_max_kg, reference_weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cuttingPlan.title,
        cuttingPlan.goal,
        cuttingPlan.personName,
        cuttingPlan.ageYears,
        cuttingPlan.weightKg,
        cuttingPlan.heightM,
        cuttingPlan.waterLiters,
        cuttingPlan.weeklyLossMinKg,
        cuttingPlan.weeklyLossMaxKg,
        cuttingPlan.referenceWeight,
      ],
    );

    for (const [mealIndex, meal] of cuttingPlan.meals.entries()) {
      const [mealResult] = await connection.execute<ResultSetHeader>(
        "INSERT INTO meals (plan_id, name, time_label, sort_order, notes) VALUES (?, ?, ?, ?, ?)",
        [planResult.insertId, meal.name, meal.time, mealIndex, meal.notes],
      );
      for (const [itemIndex, item] of meal.items.entries()) {
        await connection.execute(
          "INSERT INTO meal_items (meal_id, description, sort_order) VALUES (?, ?, ?)",
          [mealResult.insertId, item, itemIndex],
        );
      }
    }

    for (const [index, guideline] of cuttingPlan.guidelines.entries()) {
      await connection.execute(
        "INSERT INTO guidelines (plan_id, body, sort_order) VALUES (?, ?, ?)",
        [planResult.insertId, guideline, index],
      );
    }

    await connection.commit();
    seededUsers.add(userId);
  } catch (error) {
    await connection.rollback();
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      seededUsers.add(userId);
      return;
    }
    throw error;
  } finally {
    connection.release();
  }
}

export type PlanDetails = {
  id: number;
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

type PlanRow = RowDataPacket & {
  id: number;
  title: string;
  goal: string;
  person_name: string;
  age_years: number | null;
  weight_kg: string | null;
  height_m: string | null;
  water_liters: string | null;
  weekly_loss_min_kg: string | null;
  weekly_loss_max_kg: string | null;
  reference_weight: string | null;
};

type MealRow = RowDataPacket & {
  id: number;
  name: string;
  time_label: string;
  notes: string | null;
};

type ItemRow = RowDataPacket & {
  id: number;
  meal_id: number;
  description: string;
};

export async function getPlan(userId: number): Promise<PlanDetails> {
  await ensureCuttingPlan(userId);
  const [plans] = await pool.execute<PlanRow[]>(
    `SELECT id, title, goal, person_name, age_years, weight_kg, height_m, water_liters,
            weekly_loss_min_kg, weekly_loss_max_kg, reference_weight
     FROM meal_plans WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const plan = plans[0];
  if (!plan) {
    throw new Error("Plano alimentar não encontrado.");
  }

  const [meals] = await pool.execute<MealRow[]>(
    "SELECT id, name, time_label, notes FROM meals WHERE plan_id = ? ORDER BY sort_order",
    [plan.id],
  );
  const mealIds = meals.map((meal) => meal.id);
  const itemsByMeal = new Map<number, { id: number; description: string }[]>();
  if (mealIds.length > 0) {
    const [items] = await pool.query<ItemRow[]>(
      `SELECT id, meal_id, description FROM meal_items
       WHERE meal_id IN (?) ORDER BY sort_order`,
      [mealIds],
    );
    for (const item of items) {
      const list = itemsByMeal.get(item.meal_id) ?? [];
      list.push({ id: item.id, description: item.description });
      itemsByMeal.set(item.meal_id, list);
    }
  }

  const [guidelines] = await pool.execute<RowDataPacket[]>(
    "SELECT id, body FROM guidelines WHERE plan_id = ? ORDER BY sort_order",
    [plan.id],
  );

  return {
    id: plan.id,
    title: plan.title,
    goal: plan.goal,
    personName: plan.person_name,
    ageYears: plan.age_years,
    weightKg: plan.weight_kg === null ? null : Number(plan.weight_kg),
    heightM: plan.height_m === null ? null : Number(plan.height_m),
    waterLiters: plan.water_liters === null ? null : Number(plan.water_liters),
    weeklyLossMinKg:
      plan.weekly_loss_min_kg === null ? null : Number(plan.weekly_loss_min_kg),
    weeklyLossMaxKg:
      plan.weekly_loss_max_kg === null ? null : Number(plan.weekly_loss_max_kg),
    referenceWeight: plan.reference_weight,
    guidelines: guidelines.map((row) => ({
      id: Number(row.id),
      body: String(row.body),
    })),
    meals: meals.map((meal) => ({
      id: meal.id,
      name: meal.name,
      time: meal.time_label,
      notes: meal.notes,
      items: itemsByMeal.get(meal.id) ?? [],
    })),
  };
}

export type MealVisualStatus = "upcoming" | "open" | "done" | "missed";

export type ResolvedMeal = PlanDetails["meals"][number] & {
  status: MealVisualStatus;
};

export type DayBoard = {
  date: string;
  label: string;
  isToday: boolean;
  isFuture: boolean;
  meals: ResolvedMeal[];
  done: number;
  missed: number;
  open: number;
  upcoming: number;
};

function resolveStatus(input: {
  logStatus: string | undefined;
  isFuture: boolean;
  isPast: boolean;
  nowMinutes: number;
  mealMinutes: number;
}): MealVisualStatus {
  if (input.logStatus === "done") return "done";
  if (input.logStatus === "missed") return "missed";
  if (input.isFuture) return "upcoming";
  if (input.isPast) return "missed";
  if (input.nowMinutes + EARLY_MINUTES < input.mealMinutes) return "upcoming";
  if (input.nowMinutes > input.mealMinutes + GRACE_MINUTES) return "missed";
  return "open";
}

export async function getWeekBoard(userId: number) {
  await io();
  const plan = await getPlan(userId);
  const now = saoPauloNow(new Date());
  const dates = weekDates(now.date);
  const [logs] = await pool.execute<RowDataPacket[]>(
    `SELECT meal_id, log_date, status FROM meal_logs
     WHERE user_id = ? AND log_date BETWEEN ? AND ?`,
    [userId, dates[0], dates[6]],
  );

  const logMap = new Map<string, string>();
  for (const log of logs) {
    logMap.set(`${log.log_date}:${log.meal_id}`, String(log.status));
  }

  const days: DayBoard[] = dates.map((date, index) => {
    const isToday = date === now.date;
    const isFuture = date > now.date;
    const isPast = date < now.date;
    const meals = plan.meals.map((meal) => ({
      ...meal,
      status: resolveStatus({
        logStatus: logMap.get(`${date}:${meal.id}`),
        isFuture,
        isPast,
        nowMinutes: now.minutes,
        mealMinutes: parseClock(meal.time),
      }),
    }));
    return {
      date,
      label: WEEKDAY_LABELS[index],
      isToday,
      isFuture,
      meals,
      done: meals.filter((meal) => meal.status === "done").length,
      missed: meals.filter((meal) => meal.status === "missed").length,
      open: meals.filter((meal) => meal.status === "open").length,
      upcoming: meals.filter((meal) => meal.status === "upcoming").length,
    };
  });

  return { plan, today: now.date, days };
}

export function disciplinePercent(done: number, missed: number) {
  const decided = done + missed;
  if (decided === 0) return null;
  return Math.round((done / decided) * 100);
}

function resolveMonthKey(requested: string | undefined, today: string) {
  if (!requested || !/^\d{4}-\d{2}$/.test(requested)) {
    return monthKeyFromDate(today);
  }
  const year = Number(requested.slice(0, 4));
  const month = Number(requested.slice(5, 7));
  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    return monthKeyFromDate(today);
  }
  return requested;
}

function performanceStats(days: PerformanceDay[]) {
  const tracked = days.filter(
    (day) => day.inMonth && !day.isFuture && !day.beforePlan && day.total > 0,
  );
  const done = tracked.reduce((sum, day) => sum + day.done, 0);
  const missed = tracked.reduce((sum, day) => sum + day.missed, 0);
  return {
    percent: disciplinePercent(done, missed),
    cleanDays: tracked.filter((day) => day.missed === 0 && day.done === day.total).length,
    failedDays: tracked.filter((day) => day.missed > 0).length,
    trackedDays: tracked.length,
  };
}

function toPerformanceDay(
  date: string,
  label: string,
  inMonth: boolean,
  planStart: string,
  now: { date: string; minutes: number },
  planMeals: PlanDetails["meals"],
  logMap: Map<string, string>,
): PerformanceDay {
  const isToday = date === now.date;
  const isFuture = date > now.date;
  const beforePlan = date < planStart;
  const meals: PerformanceMeal[] = beforePlan
    ? []
    : planMeals.map((meal) => ({
        name: meal.name,
        time: meal.time,
        status: resolveStatus({
          logStatus: logMap.get(`${date}:${meal.id}`),
          isFuture,
          isPast: date < now.date,
          nowMinutes: now.minutes,
          mealMinutes: parseClock(meal.time),
        }),
      }));
  const done = meals.filter((meal) => meal.status === "done").length;
  const missed = meals.filter((meal) => meal.status === "missed").length;
  const open = meals.filter((meal) => meal.status === "open").length;
  const pending = meals.some((meal) => meal.status === "open" || meal.status === "upcoming");

  return {
    date,
    label,
    dayNumber: Number(date.slice(8, 10)),
    inMonth,
    isToday,
    isFuture,
    beforePlan,
    done,
    missed,
    open,
    total: planMeals.length,
    percent: beforePlan || isFuture || pending ? null : disciplinePercent(done, missed),
    meals,
  };
}

export async function getPerformance(userId: number, requestedMonth?: string) {
  await io();
  const plan = await getPlan(userId);
  const now = saoPauloNow(new Date());
  const monthKey = resolveMonthKey(requestedMonth, now.date);
  const [planRows] = await pool.execute<RowDataPacket[]>(
    "SELECT created_at FROM meal_plans WHERE user_id = ? LIMIT 1",
    [userId],
  );
  const planStart = String(planRows[0]?.created_at ?? now.date).slice(0, 10);
  const week = weekDates(now.date);
  const weeks = monthWeeks(monthKey);
  const dates = [...new Set([...week, ...weeks.flat()])].sort();
  const [logs] = await pool.execute<RowDataPacket[]>(
    `SELECT meal_id, log_date, status FROM meal_logs
     WHERE user_id = ? AND log_date BETWEEN ? AND ?`,
    [userId, dates[0], dates[dates.length - 1]],
  );
  const logMap = new Map<string, string>();
  for (const log of logs) {
    logMap.set(`${log.log_date}:${log.meal_id}`, String(log.status));
  }

  const weekDays = week.map((date, index) =>
    toPerformanceDay(date, WEEKDAY_LABELS[index], true, planStart, now, plan.meals, logMap),
  );
  const monthWeeksDays = weeks.map((weekDatesInMonth) =>
    weekDatesInMonth.map((date, index) =>
      toPerformanceDay(
        date,
        WEEKDAY_LABELS[index],
        date.startsWith(monthKey),
        planStart,
        now,
        plan.meals,
        logMap,
      ),
    ),
  );
  const title = formatMonthTitle(monthKey);

  return {
    today: now.date,
    monthKey,
    monthTitle: title.charAt(0).toUpperCase() + title.slice(1),
    week: weekDays,
    weeks: monthWeeksDays,
    weekStats: performanceStats(weekDays),
    monthStats: performanceStats(monthWeeksDays.flat()),
  } satisfies PerformanceBoard;
}

export async function setMealStatus(
  userId: number,
  mealId: number,
  status: "done" | "missed",
) {
  await io();
  await ensureCuttingPlan(userId);
  const [owned] = await pool.execute<RowDataPacket[]>(
    `SELECT meals.id FROM meals
     INNER JOIN meal_plans ON meal_plans.id = meals.plan_id
     WHERE meals.id = ? AND meal_plans.user_id = ? LIMIT 1`,
    [mealId, userId],
  );
  if (owned.length === 0) {
    throw new Error("Refeição não encontrada.");
  }

  const today = saoPauloNow(new Date()).date;
  await pool.execute(
    `INSERT INTO meal_logs (user_id, meal_id, log_date, status)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [userId, mealId, today, status],
  );
}

export async function savePushSubscription(
  userId: number,
  subscription: { endpoint: string; p256dh: string; auth: string },
) {
  await ensureMealSchema();
  await pool.execute(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth_key = VALUES(auth_key)`,
    [userId, subscription.endpoint, subscription.p256dh, subscription.auth],
  );
}

export type PushTarget = {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function listPushTargets(): Promise<PushTarget[]> {
  await ensureMealSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, user_id, endpoint, p256dh, auth_key FROM push_subscriptions",
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth_key,
  }));
}

export async function deletePushSubscription(id: number) {
  await pool.execute("DELETE FROM push_subscriptions WHERE id = ?", [id]);
}

export async function releaseDispatch(input: {
  userId: number;
  mealId: number;
  logDate: string;
  kind: "due" | "nudge";
}) {
  await pool.execute(
    `DELETE FROM notification_dispatches
     WHERE user_id = ? AND meal_id = ? AND log_date = ? AND kind = ?`,
    [input.userId, input.mealId, input.logDate, input.kind],
  );
}

export async function clearDispatchesForDate(logDate: string) {
  await ensureMealSchema();
  await pool.execute("DELETE FROM notification_dispatches WHERE log_date = ?", [logDate]);
}

export async function claimDispatch(input: {
  userId: number;
  mealId: number;
  logDate: string;
  kind: "due" | "nudge";
}) {
  try {
    await pool.execute(
      `INSERT INTO notification_dispatches (user_id, meal_id, log_date, kind)
       VALUES (?, ?, ?, ?)`,
      [input.userId, input.mealId, input.logDate, input.kind],
    );
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return false;
    }
    throw error;
  }
}

export async function listDueReminders(logDate: string, timeLabel: string) {
  await ensureMealSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT push_subscriptions.id AS subscription_id,
            push_subscriptions.user_id,
            push_subscriptions.endpoint,
            push_subscriptions.p256dh,
            push_subscriptions.auth_key,
            meals.id AS meal_id,
            meals.name,
            meals.time_label
     FROM push_subscriptions
     INNER JOIN meal_plans ON meal_plans.user_id = push_subscriptions.user_id
     INNER JOIN meals ON meals.plan_id = meal_plans.id
     WHERE TRIM(meals.time_label) = ?`,
    [timeLabel],
  );
  return rows.map((row) => ({
    subscriptionId: Number(row.subscription_id),
    userId: Number(row.user_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth_key),
    mealId: Number(row.meal_id),
    name: String(row.name),
    time: String(row.time_label),
    logDate,
  }));
}

export async function isMealDone(userId: number, mealId: number, logDate: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT status FROM meal_logs
     WHERE user_id = ? AND meal_id = ? AND log_date = ? LIMIT 1`,
    [userId, mealId, logDate],
  );
  return rows[0]?.status === "done";
}

export async function listScheduledTimes() {
  await ensureMealSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT DISTINCT time_label FROM meals WHERE time_label <> ''",
  );
  return rows.map((row) => String(row.time_label).trim());
}

async function planIdFor(userId: number) {
  await ensureCuttingPlan(userId);
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM meal_plans WHERE user_id = ? LIMIT 1",
    [userId],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Plano alimentar não encontrado.");
  return Number(id);
}

export type PlanInput = {
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
};

export async function updatePlan(userId: number, input: PlanInput) {
  const planId = await planIdFor(userId);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE meal_plans
     SET title = ?, goal = ?, person_name = ?, age_years = ?, weight_kg = ?, height_m = ?,
         water_liters = ?, weekly_loss_min_kg = ?, weekly_loss_max_kg = ?, reference_weight = ?
     WHERE id = ? AND user_id = ?`,
    [
      input.title,
      input.goal,
      input.personName,
      input.ageYears,
      input.weightKg,
      input.heightM,
      input.waterLiters,
      input.weeklyLossMinKg,
      input.weeklyLossMaxKg,
      input.referenceWeight,
      planId,
      userId,
    ],
  );
  return result.affectedRows > 0;
}

export async function createMeal(
  userId: number,
  input: { name: string; time: string; notes: string | null },
) {
  const planId = await planIdFor(userId);
  const [orderRows] = await pool.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM meals WHERE plan_id = ?",
    [planId],
  );
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO meals (plan_id, name, time_label, sort_order, notes) VALUES (?, ?, ?, ?, ?)",
    [planId, input.name, input.time, Number(orderRows[0]?.next_order ?? 0), input.notes],
  );
  return result.insertId;
}

export async function updateMeal(
  userId: number,
  mealId: number,
  input: { name: string; time: string; notes: string | null },
) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE meals
     INNER JOIN meal_plans ON meal_plans.id = meals.plan_id
     SET meals.name = ?, meals.time_label = ?, meals.notes = ?
     WHERE meals.id = ? AND meal_plans.user_id = ?`,
    [input.name, input.time, input.notes, mealId, userId],
  );
  return result.affectedRows > 0;
}

export async function deleteMeal(userId: number, mealId: number) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE meals FROM meals
     INNER JOIN meal_plans ON meal_plans.id = meals.plan_id
     WHERE meals.id = ? AND meal_plans.user_id = ?`,
    [mealId, userId],
  );
  return result.affectedRows > 0;
}

export async function createMealItem(userId: number, mealId: number, description: string) {
  const [owned] = await pool.execute<RowDataPacket[]>(
    `SELECT meals.id FROM meals
     INNER JOIN meal_plans ON meal_plans.id = meals.plan_id
     WHERE meals.id = ? AND meal_plans.user_id = ? LIMIT 1`,
    [mealId, userId],
  );
  if (owned.length === 0) return false;
  const [orderRows] = await pool.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM meal_items WHERE meal_id = ?",
    [mealId],
  );
  await pool.execute(
    "INSERT INTO meal_items (meal_id, description, sort_order) VALUES (?, ?, ?)",
    [mealId, description, Number(orderRows[0]?.next_order ?? 0)],
  );
  return true;
}

export async function updateMealItem(userId: number, itemId: number, description: string) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE meal_items
     INNER JOIN meals ON meals.id = meal_items.meal_id
     INNER JOIN meal_plans ON meal_plans.id = meals.plan_id
     SET meal_items.description = ?
     WHERE meal_items.id = ? AND meal_plans.user_id = ?`,
    [description, itemId, userId],
  );
  return result.affectedRows > 0;
}

export async function deleteMealItem(userId: number, itemId: number) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE meal_items FROM meal_items
     INNER JOIN meals ON meals.id = meal_items.meal_id
     INNER JOIN meal_plans ON meal_plans.id = meals.plan_id
     WHERE meal_items.id = ? AND meal_plans.user_id = ?`,
    [itemId, userId],
  );
  return result.affectedRows > 0;
}

export async function createGuideline(userId: number, body: string) {
  const planId = await planIdFor(userId);
  const [orderRows] = await pool.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM guidelines WHERE plan_id = ?",
    [planId],
  );
  await pool.execute(
    "INSERT INTO guidelines (plan_id, body, sort_order) VALUES (?, ?, ?)",
    [planId, body, Number(orderRows[0]?.next_order ?? 0)],
  );
}

export async function updateGuideline(userId: number, guidelineId: number, body: string) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE guidelines
     INNER JOIN meal_plans ON meal_plans.id = guidelines.plan_id
     SET guidelines.body = ?
     WHERE guidelines.id = ? AND meal_plans.user_id = ?`,
    [body, guidelineId, userId],
  );
  return result.affectedRows > 0;
}

export async function deleteGuideline(userId: number, guidelineId: number) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE guidelines FROM guidelines
     INNER JOIN meal_plans ON meal_plans.id = guidelines.plan_id
     WHERE guidelines.id = ? AND meal_plans.user_id = ?`,
    [guidelineId, userId],
  );
  return result.affectedRows > 0;
}

export async function listUserSubscriptions(userId: number): Promise<PushTarget[]> {
  await ensureMealSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, user_id, endpoint, p256dh, auth_key FROM push_subscriptions WHERE user_id = ?",
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth_key,
  }));
}
