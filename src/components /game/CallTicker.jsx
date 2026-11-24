import { AnimatePresence, motion } from "framer-motion";
import { bingoLetter } from "@/lib/format";

/** Called numbers sliding in from the right, newest first. */
export default function CallTicker({ drawn = [] }) {
  const recent = [...drawn].slice(-4).reverse();

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border border-border/80 bg-card/60 px-2 py-1.5 lg:rounded-3xl lg:px-3 lg:py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:text-[8.5px] lg:tracking-[0.18em]">
          Calls
        </p>
        <p className="text-[8.5px] tabular-nums text-muted-foreground/70 lg:text-[9px]">
          {drawn.length}/75
        </p>
      </div>

      <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden lg:mt-2 lg:gap-1.5">
        <AnimatePresence initial={false}>
          {recent.length === 0 ? (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="truncate text-[10px] text-muted-foreground/60 lg:text-[10.5px]"
            >
              Waiting for the first call…
            </motion.span>
          ) : (
            recent.map((n) => (
              <motion.span
                key={n}
                layout
                initial={{ x: 36, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -36, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="grid h-7 min-w-[27px] shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/40 leading-none lg:h-8 lg:min-w-[34px]"
              >
                <span className="text-[7px] font-bold text-primary/80 lg:text-[8px]">
                  {bingoLetter(n)}
                  </span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground/80 lg:text-[11px]">
                  {n}
                </span>
              </motion.span>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}