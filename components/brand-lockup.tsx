export function BrandLockup({
  tone = "dark",
  compact = false,
}: {
  tone?: "dark" | "light";
  compact?: boolean;
}) {
  const title = tone === "light" ? "text-white" : "text-ink";
  const subtitle = tone === "light" ? "text-white/65" : "text-muted";

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <img
        src="/logo-prismatico.png"
        alt=""
        width={36}
        height={29}
        className={compact ? "h-8 w-auto shrink-0" : "h-9 w-auto shrink-0"}
      />
      <span className="min-w-0">
        <span className={`block text-[15px] font-semibold leading-none tracking-tight ${title}`}>
          prismatico
        </span>
        {!compact && (
          <span className={`mt-1 block text-[10px] font-medium uppercase tracking-[0.12em] ${subtitle}`}>
            Seu plano alimentar na prática
          </span>
        )}
      </span>
    </span>
  );
}
