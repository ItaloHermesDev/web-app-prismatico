import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { NotifyButton } from "@/components/notify-button";
import { PlanEditor } from "@/components/plan-editor";
import { getCurrentUser } from "@/lib/dal";
import { getPlan } from "@/lib/meals";
import { getVapidPublicKey } from "@/lib/push";

export const metadata: Metadata = {
  title: "Plano",
};

export default function PlanoPage() {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-muted">Carregando o plano…</p>}>
      <Plano />
    </Suspense>
  );
}

async function Plano() {
  await cookies();
  const user = await getCurrentUser();
  const plan = await getPlan(user.id);

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">{user.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Seu plano</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Cada conta tem o próprio plano. O que você editar fica só com você.
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="btn-secondary">
            Sair
          </button>
        </form>
      </header>

      <NotifyButton publicKey={getVapidPublicKey()} />
      <PlanEditor plan={plan} />
    </main>
  );
}
