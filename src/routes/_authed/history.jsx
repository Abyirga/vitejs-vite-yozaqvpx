import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trophy } from "lucide-react";
import AppShell from "@/components/AppShell";
import TransactionList from "@/components/TransactionList";
import { getHistory } from "@/lib/server-fns";
import { amountEtb, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/history")({
  head: () => ({ meta: [{ title: "History — AfroGo Bingo" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const historyFn = useServerFn(getHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => historyFn({ data: {} }),
    refetchInterval: 20000,
  });

  return (
    <AppShell>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">History</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">Every round you played and every ETB that moved.</p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Rounds played</p>
          <p className="mt-1 font-display text-[20px] font-semibold tabular-nums">{data?.stats?.played ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.08] p-3.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-primary/80">Rounds won</p>
          <p className="mt-1 font-display text-[20px] font-semibold tabular-nums text-primary">
            {data?.stats?.won ?? 0}
          </p>
        </div>
      </div>

      <section className="mt-7">
        <h2 className="font-display text-[15px] tracking-tight">Rounds</h2>
        <div className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : data?.rounds?.length ? (
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card/60">
            {data.rounds.map((round) => (
              <div key={round.id} className="flex items-center gap-3 px-3.5 py-3">
                <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                      round.is_winner ? "bg-primary/15 text-primary" : "bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    <Trophy className="h-4 w-4" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium leading-tight">
                      {round.bet_amount} ETB room
                      <span className="ml-2 text-[10px] text-muted-foreground">{round.marked}/24 marked</span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">{formatDateTime(round.date)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em]",
                      round.status !== "finished" && "border-accent/40 bg-accent/10 text-accent",
                      round.status === "finished" && round.is_winner && "border-primary/40 bg-primary/10 text-primary",
                      round.status === "finished" && !round.is_winner && "border-border bg-secondary/50 text-muted-foreground"
                    )}
                  >
                    {round.status !== "finished" ? "In play" : round.is_winner ? "Won" : "Lost"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center text-[12px] text-muted-foreground">
              No rounds yet — pick a bet size on the home page to join your first room.
            </div>
          )}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-[15px] tracking-tight">Wallet activity</h2>
        <p className="mt-1 text-[10.5px] text-muted-foreground">
          Won so far: <span className="font-semibold text-accent">{amountEtb(data?.transactions?.filter((t) => t.type === "win").reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}</span> ETB
        </p>
        <div className="mt-3">
          <TransactionList transactions={data?.transactions || []} />
        </div>
      </section>
    </AppShell>
  );
}