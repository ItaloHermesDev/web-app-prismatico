export type PerformanceMealStatus = "done" | "missed" | "open" | "upcoming";

export type PerformanceMeal = {
  name: string;
  time: string;
  status: PerformanceMealStatus;
};

export type PerformanceDay = {
  date: string;
  label: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  beforePlan: boolean;
  done: number;
  missed: number;
  open: number;
  total: number;
  percent: number | null;
  meals: PerformanceMeal[];
};

export type PerformanceStats = {
  percent: number | null;
  cleanDays: number;
  failedDays: number;
  trackedDays: number;
};

export type PerformanceBoard = {
  today: string;
  monthKey: string;
  monthTitle: string;
  week: PerformanceDay[];
  weeks: PerformanceDay[][];
  weekStats: PerformanceStats;
  monthStats: PerformanceStats;
};
