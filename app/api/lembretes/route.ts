import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { NextResponse } from "next/server";
import { dispatchDueReminders } from "@/lib/reminders";

function secretMatches(provided: string | null) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const given = Buffer.from(provided);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

async function run(request: Request) {
  await connection();
  const url = new URL(request.url);
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!secretMatches(bearer ?? url.searchParams.get("chave"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await dispatchDueReminders();
  return NextResponse.json({ ok: true });
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
