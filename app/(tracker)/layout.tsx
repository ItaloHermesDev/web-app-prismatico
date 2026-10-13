import type { ReactNode } from "react";
import { BottomNav, SideNav } from "@/components/app-nav";
import { BrandLockup } from "@/components/brand-lockup";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default function TrackerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-canvas">
      <ServiceWorkerRegister />
      <SideNav />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-5 pb-24 md:px-8 md:pt-8 md:pb-10">
        <div className="mb-5 md:hidden">
          <BrandLockup compact />
        </div>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
