import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  primary: "text-primary",
  accent: "text-accent",
};

export default function EntryStat({ label, value, tone = "default", highlight = false }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-3.5 py-3",
        highlight ? "border-primary/35 bg-gradient-to-b from-primary/[0.12] to-card/70" : "border-border/70 bg-card/60"
      )}
    >
      {highlight && <div className="pattern-weave pointer-events-none absolute inset-0 opacity-30" />}
      <p className="relative text-[8.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("relative mt-1 font-display text-[17px] font-semibold leading-none tracking-tight tabular-nums", TONES[tone])}>
        {value}
      </p>
    </div>
  );
}