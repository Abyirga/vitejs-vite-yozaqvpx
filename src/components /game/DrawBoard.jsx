import { bingoLetter } from "@/lib/format";

export default function DrawBoard({ drawn = [] }) {
  const latest = drawn.length ? drawn[drawn.length - 1] : null;
  const recent = [...drawn].slice(-7, -1).reverse();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card to-secondary/40 p-5">
      <div className="pattern-weave pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative flex items-center justify-between text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <span>Now calling</span>
        <span className="tabular-nums">{drawn.length} / 75</span>
      </div>

      <div className="relative mt-4 flex items-center gap-4">
        <div className="relative grid h-[86px] w-[86px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[hsl(48,100%,74%)] via-[hsl(42,95%,60%)] to-[hsl(28,90%,52%)] glow-gold">
          <span className="font-display text-[34px] font-bold leading-none text-[hsl(255,32%,9%)]">
            {latest ?? "—"}
          </span>
          {latest && (
            <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-primary/50 bg-background font-display text-[11px] font-bold text-primary">
              {bingoLetter(latest)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Previous</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recent.length === 0 && <span className="text-[11px] text-muted-foreground/60">Waiting for the draw…</span>}
            {recent.map((n) => (
              <span
                key={n}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 bg-secondary/50 text-[11px] font-semibold tabular-nums text-foreground/75"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}