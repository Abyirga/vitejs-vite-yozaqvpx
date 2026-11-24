import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LETTERS = ["B", "I", "N", "G", "O"];

export default function BingoCard({
  card = [],
  marked = [],
  called = [],
  highlight = [],
  dim = false,
  onToggle = null,
  className,
}) {
  const markedSet = new Set(marked || []);
  const calledSet = new Set(called || []);
  const glowSet = new Set(highlight || []);

  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-border/80 bg-card/70 p-2 transition-opacity lg:p-3",
        dim && "opacity-60",
        className
      )}
    >
      <div className="grid grid-cols-5 gap-1 pb-1 lg:gap-1.5">
        {LETTERS.map((letter) => (
          <div
            key={letter}
            className="text-center font-display text-[10px] font-semibold tracking-[0.22em] text-primary/70 lg:text-[11px]"
          >
            {letter}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 lg:gap-1.5">
        {card.map((value, index) => {
          const free = value === 0;
          const on = free || markedSet.has(index);
          // Only a called number can be marked — an uncalled cell is not tappable.
          const tappable = !!onToggle && !free && calledSet.has(value);
          const Tag = tappable ? "button" : "div";
          return (
            <Tag
              key={index}
              {...(tappable ? { type: "button", onClick: () => onToggle(index) } : {})}
              aria-label={free ? "Free space" : undefined}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-lg border text-[12px] font-semibold tabular-nums transition-all duration-300 lg:rounded-xl lg:text-[14px]",
                on
                  ? "scale-[1.03] border-primary/60 bg-gradient-to-br from-[hsl(48,100%,72%)] to-[hsl(30,90%,54%)] text-[hsl(255,32%,10%)] shadow-[0_8px_20px_-10px_hsl(42,92%,58%,0.95)]"
                  : "border-border/60 bg-secondary/30 text-foreground/70",
                tappable && "active:scale-95",
                glowSet.has(index) && "ring-2 ring-primary/75 ring-offset-1 ring-offset-card"
              )}
            >
              {free ? <Star className="h-[18px] w-[18px] fill-current" /> : value}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}