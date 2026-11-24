import { bingoLetter } from "@/lib/format";

/** The number called right now — deliberately larger than the rest. */
export default function LatestCall({ latest }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] to-card px-2 py-1.5 lg:gap-3 lg:rounded-3xl lg:px-3.5 lg:py-3">
      <div className="relative grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[hsl(48,100%,74%)] via-[hsl(42,95%,60%)] to-[hsl(28,90%,52%)] glow-gold lg:h-[62px] lg:w-[62px]">
        <span className="font-display text-[19px] font-bold leading-none tabular-nums text-[hsl(255,32%,9%)] lg:text-[26px]">
          {latest ?? "—"}
        </span>
        {latest && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-primary/50 bg-background font-display text-[9px] font-bold text-primary lg:h-6 lg:w-6 lg:text-[10px]">
            {bingoLetter(latest)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:text-[8.5px] lg:tracking-[0.18em]">
          Now calling
        </p>
        <p className="mt-0.5 truncate font-display text-[12px] leading-tight text-foreground/85 lg:text-[13px]">
          {latest ? `${bingoLetter(latest)} ${latest}` : "Stand by"}
        </p>
        </div>
    </div>
  );
}