import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
import { getOptionalUser } from "@/lib/dal";

export async function SiteNav() {
  const user = await getOptionalUser();

  return (
    <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-8">
      <Link href="/" className="min-w-0">
        <BrandLockup compact />
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {user ? (
          <Link href="/hoje" className="btn-primary">
            Hoje
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn-tertiary">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary">
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
