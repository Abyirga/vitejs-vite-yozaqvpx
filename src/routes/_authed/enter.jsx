import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, RefreshCw, Ticket } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import EntryStat from "@/components/enter/EntryStat";
import SeatGrid from "@/components/enter/SeatGrid";
import { getEntryData, takeSeat } from "@/lib/server-fns";
import { amountEtb } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/enter")({
  validateSearch: (search) => ({
    bet: Number(search.bet) || undefined,
  }),
  head: () => ({ meta: [{ title: "Take a seat — AfroGo Bingo" }] }),
  component: EnterPage,
});

const TIERS = [5, 10, 20];

const clockLabel = (ms) => {
  if (ms === null) return "Open";
  if (ms <= 0) return "Started";
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

function EnterPage() {
  const search = Route.useSearch();
  const bet = TIERS.includes(Number(search.bet)) ? Number(search.bet) : 10;
  const navigate = useNavigate();
  const entryFn = useServerFn(getEntryData);
  const seatFn = useServerFn(takeSeat);
  const queryClient = useQueryClient();
  const [pendingSeat, setPendingSeat] = useState(null);
  const [clock, setClock] = useState(null);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["entry", bet],
    queryFn: () => entryFn({ data: { betAmount: bet } }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const take = useMutation({
    mutationFn: (seatNumber) => seatFn({ data: { betAmount: bet, seatNumber } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["entry"] });
      navigate({ to: "/rooms/$roomId", params: { roomId: res.roomId } });
    },
    onError: (err) => {
      setPendingSeat(null);
      toast.error(err?.message || "Could not take that seat. Please try another.");
    },
  });

  const handleSeat = (n) => {
    if (pendingSeat !== null) return;
    if (data?.roomId && n === data?.mySeat) {
      navigate({ to: "/rooms/$roomId", params: { roomId: data.roomId } });
      return;
    }
    setPendingSeat(n);
    take.mutate(n);
  };

  const deadline = data?.deadlineAt ? new Date(data.deadlineAt).getTime() : null;
  const drift = clock && dataUpdatedAt ? Math.max(0, clock - dataUpdatedAt) : 0;
  const msLeft = deadline && data?.now ? Math.max(0, deadline - data.now - drift) : null;

  return (
    <AppShell bare>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/80 bg-card/70 text-foreground/80 transition hover:border-primary/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          </button>

<div className="text-center">
  <p className="font-display text-[13px] tracking-tight">Take a seat</p>
  <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{bet} ETB table</p>
</div>

<button
  type="button"
  onClick={() => refetch()}
  aria-label="Refresh"
  className="grid h-9 w-9 place-items-center rounded-full border border-border/80 bg-card/70 text-foreground/80 transition hover:border-primary/50 hover:text-foreground"
>
  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin text-primary")} />
</button>
</div>

<div className="mt-5 grid grid-cols-2 gap-2.5">
<EntryStat label="Main wallet" value={isLoading ? "—" : `${amountEtb(data?.balance)} ETB`} />
<EntryStat label="Play wallet" value={isLoading ? "—" : `${amountEtb(data?.playBalance)} ETB`} tone="accent" />
<EntryStat label="Bet size" value={`${bet} ETB`} tone="primary" />
<EntryStat
  label="Entry closes in"
  value={isLoading ? "—" : clockLabel(msLeft)}
  highlight={msLeft !== null && msLeft > 0}
/>
</div>

<div className="mt-6 flex items-end justify-between">
<div>
  <h1 className="font-display text-[17px] tracking-tight">Pick your seat</h1>
  <p className="mt-1 text-[11px] text-muted-foreground">
    {data?.mySeat ? `You hold seat ${data.mySeat}.` : "Tap a free number to enter the game."}
  </p>
</div>
<span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
  <Ticket className="h-3 w-3" />
  {100 - (data?.taken?.length || 0)} free
</span>
</div>

<div className="mt-4 rounded-3xl border border-border/70 bg-card/40 p-3">
{isLoading ? (
  <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <SeatGrid
            taken={data?.taken || []}
            mine={data?.mySeat || null}
            pending={pendingSeat}
            onSelect={handleSeat}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-border/80 bg-card/70" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-border/40 bg-secondary/30" /> Taken
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-primary" /> Your seat
        </span>
      </div>

      <p className="mt-4 text-[10.5px] leading-relaxed text-muted-foreground/80">
        {bet} ETB leaves your main wallet when you take a seat and is held in your play wallet until the round settles.
      </p>
    </AppShell>
  );
}