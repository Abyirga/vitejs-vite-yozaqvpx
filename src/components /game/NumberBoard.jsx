import { cn } from "@/lib/utils";

const COLUMNS = [
  { letter: "B", from: 1 },
  { letter: "I", from: 16 },
  { letter: "N", from: 31 },
  { letter: "G", from: 46 },
  { letter: "O", from: 61 },
];

/**
 * The full 1–75 board as five B/I/N/G/O columns, sized to sit beside the
 * player's card in the game room.
 */
export default function NumberBoard({ drawn = [] }) {
  const called = new Set(drawn);
  const latest = drawn.length ? drawn[drawn.length - 1] : null;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/80 bg-card/60 p-1.5 lg:gap-1.5 lg:rounded-3xl lg:p-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Calls</p>
        <span className="text-[9px] font-semibold tabular-nums text-primary/80">
          {drawn.length}/75
        </span>
      </div>

      <div className="grid grid-cols-5 gap-[3px] lg:gap-1.5">
        {COLUMNS.map(({ letter, from }) => (
          <div key={letter} className="flex flex-col gap-[3px] lg:gap-1">
            <p className="pb-0.5 text-center font-display text-[8.5px] font-semibold tracking-[0.1em] text-primary/75 lg:text-[11px]">
              {letter}
            </p>
            {Array.from({ length: 15 }, (_, i) => {
              const n = from + i;
              const on = called.has(n);
              return (
                <span
                  key={n}
                  className={cn(
                    "grid h-[14px] place-items-center rounded-[3px] border text-[8.5px] font-semibold tabular-nums transition-colors duration-300 lg:h-[21px] lg:rounded-md lg:text-[11px]",
                   on
                     ? "border-primary/60 bg-primary/85 text-primary-foreground"
                     : "border-border/50 bg-secondary/25 text-foreground/50",
                   on && n === latest && "ring-2 ring-primary/45"
                  )}
                >
                  {n}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}