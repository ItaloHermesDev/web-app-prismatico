import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserById } from "@/lib/db";
import { decrypt } from "@/lib/session";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
};

async function readSession() {
  const cookie = (await cookies()).get("session")?.value;
  return decrypt(cookie);
}

export const verifySession = cache(async () => {
  const session = await readSession();

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true as const, userId: Number(session.userId) };
});

async function readCurrentUser(): Promise<PublicUser | null> {
  "use cache: private";

  const session = await readSession();
  if (!session?.userId) return null;

  const user = await findUserById(Number(session.userId));
  if (!user) return null;

  return { id: user.id, name: user.name, email: user.email };
}

export async function getCurrentUser(): Promise<PublicUser> {
  const user = await readCurrentUser();
  if (!user) {
    redirect("/sair");
  }
  return user;
}

export async function getOptionalUser(): Promise<PublicUser | null> {
  "use cache: private";

  const session = await readSession();
  if (!session?.userId) {
    return null;
  }

  const user = await findUserById(Number(session.userId));
  if (!user) {
    return null;
  }

  return { id: user.id, name: user.name, email: user.email };
}
