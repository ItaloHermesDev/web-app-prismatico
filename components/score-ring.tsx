export function ScoreRing({
  percent,
  label,
}: {
  percent: number | null;
  label: string;
}) {
  const value = percent ?? 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full"
        style={{
          background: `conic-gradient(#00C896 ${value}%, #E2E8F0 0)`,
        }}
        aria-hidden
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-canvas text-sm font-semibold text-ink">
          {percent === null ? "—" : `${percent}%`}
        </div>
      </div>
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
    </div>
  );
}
