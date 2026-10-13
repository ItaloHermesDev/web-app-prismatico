"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, ClipboardList, House } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";

const links = [
  { href: "/hoje", label: "Hoje", icon: House },
  { href: "/desempenho", label: "Desempenho", icon: ChartColumn },
  { href: "/plano", label: "Plano", icon: ClipboardList },
] as const;

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink px-4 py-6 md:flex">
      <div className="px-2">
        <BrandLockup tone="light" compact />
        <p className="mt-3 text-[11px] leading-4 text-white/60">
          Seu plano alimentar na prática.
        </p>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={2}
                className={active ? "text-mint" : "text-slate-400"}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-medium ${
                active ? "text-primary" : "text-slate-400"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.75} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
