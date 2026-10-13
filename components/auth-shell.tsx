import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand-lockup";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-16">
      <div className="surface w-full max-w-md p-8">
        <Link href="/">
          <BrandLockup />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 mb-8 text-sm leading-6 text-muted">{description}</p>
        {children}
      </div>
    </main>
  );
}
