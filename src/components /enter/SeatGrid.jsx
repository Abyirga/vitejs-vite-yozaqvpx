import { cn } from "@/lib/utils";

const SEATS = Array.from({ length: 100 }, (_, i) => i + 1);

export default function SeatGrid({ taken = [], mine = null, pending = null, onSelect }) {
  const takenSet = new Set(taken);
  const locked = pending !== null;

  return (
    <div className="grid grid-cols-10 gap-1.5">
      {SEATS.map((n) => {
        const isMine = n === mine;
        const isTaken = takenSet.has(n) && !isMine;
        const isPending = n === pending;

        return (
          <button
            key={n}
            type="button"
            disabled={isTaken || locked}
            onClick={() => onSelect?.(n)}
            aria-label={`Seat ${n}${isTaken ? " — taken" : isMine ? " — yours" : ""}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border text-[10.5px] font-semibold tabular-nums transition-all duration-200",
              isMine && "border-primary bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_hsl(42,92%,58%,0.9)]",
              isTaken && "border-border/40 bg-secondary/30 text-muted-foreground/35",
              !isMine && !isTaken && "border-border/80 bg-card/70 text-foreground/85 hover:border-primary/60 hover:text-primary active:scale-95",
              isPending && "animate-pulse border-primary text-primary"
            )}
          >
            {isPending ? "…" : n}
          </button>
        );
      })}
    </div>
  );
}