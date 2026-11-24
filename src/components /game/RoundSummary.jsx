import { AnimatePresence, motion } from "framer-motion";
import { Home, Loader2, RotateCcw, Trophy, Users } from "lucide-react";
import BingoCard from "@/components/game/BingoCard";
import { Button } from "@/components/ui/button";
import { amountEtb } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * End-of-round summary: names the winner, shows their card with the completed
 * pattern lit up, then offers the way home or into another round. Every player
 * in the room — winner or spectator — sees the same confirmation.
 */
export default function RoundSummary({ room, winner, won, hasTicket, playing, onHome, onPlayAgain }) {
  const open = room?.status === "finished";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className={cn(
              "max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-3xl border p-5 text-center shadow-2xl lg:p-6",
              won
                ? "border-primary/45 bg-gradient-to-b from-primary/[0.18] via-card to-card"
                : "border-border/80 bg-gradient-to-b from-card to-card/90"
            )}
          >
            <div
              className={cn(
                "mx-auto grid h-14 w-14 place-items-center rounded-2xl border",
                won
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/80 bg-secondary/60 text-muted-foreground"
              )}
            >
              {won ? <Trophy className="h-7 w-7" /> : <Users className="h-7 w-7" />}
            </div>

            <p className="mt-4 text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
              Round summary
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
              {won ? "You took the pot" : winner?.name ? `${winner.name} won` : "Round over"}
            </h2>

            <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/70">
              {won
                ? "Your card completed a winning pattern first. The pot is already in your wallet."
                : winner?.name
                  ? `${winner.name} claimed bingo first and took the pot.`
                  : "The round ended without a winner."}
            </p>

            {winner && (
              <div className="mt-4 rounded-2xl border border-border/80 bg-background/40 p-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Winning card
                  </p>
                  {winner.pattern && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">
                      {winner.pattern.label}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 font-display text-[14px] font-semibold tracking-tight">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  {winner.name}
                </p>
                <div className="mt-2">
                  <BingoCard
                    card={winner.card}
                    marked={winner.marked}
                    highlight={winner.pattern?.indices || []}
                    className="border-border/60 bg-background/30 p-1.5 lg:p-2"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-border/80 bg-background/40 p-4">
              <p className="text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">
                {won ? "Paid to you" : "Pot won"}
              </p>
              <p
                className={cn(
                  "mt-1 font-display text-3xl font-semibold tracking-tight",
                  won ? "text-gold" : "text-foreground/85"
                )}
              >
                {won ? "+" : ""}
                {amountEtb(room?.pot || 0)} <span className="text-sm font-normal">ETB</span>
              </p>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                {amountEtb(room?.bet_amount || 0)} ETB entry
              </p>
            </div>

            {!hasTicket && (
              <p className="mt-3 text-[10.5px] text-muted-foreground">
                You were watching this round, not playing in it.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={onHome}>
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button onClick={onPlayAgain} disabled={playing}>
                {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Play again
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}