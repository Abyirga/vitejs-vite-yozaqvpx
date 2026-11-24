import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import ActionBar from "@/components/game/ActionBar";
import AutoMarkSwitch from "@/components/game/AutoMarkSwitch";
import BingoCard from "@/components/game/BingoCard";
import CallTicker from "@/components/game/CallTicker";
import FullHouseAlert from "@/components/game/FullHouseAlert";
import GameStats from "@/components/game/GameStats";
import LatestCall from "@/components/game/LatestCall";
import NumberBoard from "@/components/game/NumberBoard";
import RoundSummary from "@/components/game/RoundSummary";
import { Button } from "@/components/ui/button";
import { claimBingo, getRoom, joinRoom, leaveRoom } from "@/lib/server-fns";
import { amountEtb } from "@/lib/format";
import { closestPattern, completedPatterns } from "@/lib/bingo-patterns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/rooms/$roomId")({ component: RoomPage });

const STATUS_LABEL = {
  waiting: "Waiting for players",
  live: "Live draw",
  finished: "Round finished",
};

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const roomFn = useServerFn(getRoom);
  const joinFn = useServerFn(joinRoom);
  const claimFn = useServerFn(claimBingo);
  const leaveFn = useServerFn(leaveRoom);

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => roomFn({ data: { roomId } }),
    refetchInterval: 1500,
  });

  const [clock, setClock] = useState(0);
  const [autoMark, setAutoMark] = useState(true);
  const [manualMarks, setManualMarks] = useState([]);
  const claimedFor = useRef(null);

  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const claim = useMutation({
    mutationFn: () => claimFn({ data: { roomId } }),
    onSuccess: (res) => {
      if (res.won) {
        toast.success("Bingo! You took the pot.", {
          description: `${amountEtb(res.pot)} ETB is on its way to your wallet.`,
        });
      } else if (!res.complete) {
        toast.error(
          `No bingo yet — ${res.remaining} number${res.remaining === 1 ? "" : "s"} still missing on your closest line.`
        );
      } else {
        toast.error(
          res.winnerName
            ? `Too late — ${res.winnerName} claimed bingo first.`
            : "Bingo called too late — another card completed its pattern first."
        );
      }
    },
    onError: (err) => toast.error(err?.message || "Could not check your card."),
  });

  const leave = useMutation({
    mutationFn: () => leaveFn({ data: { roomId } }),
    onSuccess: (res) => {
      if (res.refunded) {
        toast.success(`You left the room — ${amountEtb(res.amount)} ETB refunded.`);
      } else if (res.disqualified) {
        toast("You left the round", {
          description: "Your card is disqualified — the draw carries on for everyone else.",
        });
      } else {
        toast("You left the room", {
          description: "The draw had already started, so the stake stays on the table.",
        });
      }
      navigate({ to: "/" });
    },
    onError: (err) => toast.error(err?.message || "Could not leave the room."),
  });

  const again = useMutation({
    mutationFn: (bet) => joinFn({ data: { betAmount: bet } }),
    onSuccess: (res) => navigate({ to: "/rooms/$roomId", params: { roomId: res.roomId }, replace: true }),
    onError: (err) => toast.error(err?.message || "Could not start another round."),
  });

  const room = data?.room;
  const ticket = data?.ticket;
  const players = data?.players || [];
  const drawn = room?.drawn_numbers || [];
  const drawnSet = useMemo(() => new Set(drawn), [drawn]);
  const latest = drawn.length ? drawn[drawn.length - 1] : null;

  const disqualified = !!ticket?.is_disqualified;
  // Bingo means a full row, column, diagonal or the four corners.
  const complete =
    !!ticket && !disqualified && completedPatterns(ticket.card || [], drawnSet).length > 0;
  const closest = closestPattern(ticket?.card || [], drawnSet);

  // Live marks: the server's own markings plus any card number that appears in
  // the authoritative call list, so a cell lights up the moment its number is called.
  const liveMarks = useMemo(() => {
    const set = new Set(ticket?.marked || []);
    (ticket?.card || []).forEach((n, i) => {
      if (n === 0 || drawnSet.has(n)) set.add(i);
    });
    return [...set];
  }, [ticket, drawnSet]);

  // With auto-mark on, a finished card announces itself.
  useEffect(() => {
    if (!autoMark || !complete || !room || room.status === "finished") return;
    if (claimedFor.current === room.id) return;
    claimedFor.current = room.id;
    claim.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMark, complete, room?.id, room?.status]);

  if (isLoading && !data) {
    return (
      <AppShell bare flush>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!data || !room) {
    return (
      <AppShell bare flush>
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <Header onBack={() => navigate({ to: "/" })} title="Room closed" />
          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            This room is no longer available.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/" })}>
            Back to the game
          </Button>
        </div>
      </AppShell>
    );
  }

  const drift = Math.max(0, clock - dataUpdatedAt);
  const startAt = room.start_at ? new Date(room.start_at).getTime() : null;
  const secondsLeft = startAt ? Math.max(0, Math.ceil((startAt - (data.now || Date.now()) - drift) / 1000)) : 0;
  const won = !!ticket?.is_winner;
  const marks = autoMark ? liveMarks : manualMarks;

  const toggleMark = (index) =>
    setManualMarks((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );

  return (
    <AppShell bare flush>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-3 pb-24 pt-3 lg:max-w-xl lg:gap-3 lg:px-6 lg:pb-12 lg:pt-6">
        <Header
          title={`${amountEtb(room.bet_amount)} ETB Room`}
          subtitle={STATUS_LABEL[room.status]}
          status={room.status}
        />

        <FullHouseAlert
          roomId={room.id}
          status={room.status}
          complete={complete}
          won={!!ticket?.is_winner}
          autoMark={autoMark}
          pot={room.pot}
        />

        <GameStats room={room} players={players.length} />

        {disqualified && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-2 py-1 text-center text-[10px] text-foreground/80">
            You left this round — this card is out. You are watching live.
          </p>
        )}

        {room.status === "waiting" && (
          <p className="rounded-xl border border-primary/25 bg-primary/[0.07] px-2 py-1 text-center text-[10px] text-foreground/70">
            First call in{" "}
            <span className="font-display text-[11px] font-semibold tabular-nums text-gold">
              {secondsLeft > 0 ? `${secondsLeft}s` : "moments"}
            </span>{" "}
            — stay on this screen.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-stretch gap-1.5">
            <LatestCall latest={latest} />
            <CallTicker drawn={drawn} />
          </div>
          {ticket && closest.pattern && (
            <p className="text-center text-[9.5px] text-muted-foreground">
              {closest.remaining === 0
                ? `${closest.pattern.label} complete — ${autoMark ? "claiming bingo" : "tap Bingo!"}`
                : `${closest.pattern.label}: ${closest.remaining} to go`}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground">
            {ticket ? "Your card" : "Spectating"}
          </p>
          <AutoMarkSwitch checked={autoMark} onCheckedChange={setAutoMark} />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] items-start gap-2 lg:gap-3">
          <NumberBoard drawn={drawn} />
          {ticket ? (
            <BingoCard
              card={ticket.card}
              marked={marks}
              called={drawn}
              onToggle={!autoMark && room.status !== "finished" ? toggleMark : null}
              dim={room.status === "finished" && !won}
            />
          ) : (
            <div className="grid min-h-[150px] place-items-center rounded-3xl border border-dashed border-border px-3 text-center text-[11px] text-muted-foreground">
              You are watching this room, not playing in it.
            </div>
          )}
        </div>

        {players.length > 1 && (
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            {players.map((p) => (
              <span
                key={p.user_id}
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                  p.is_me
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-card/60 text-foreground/70",
                  p.is_disqualified && "opacity-50"
                )}
              >
                {p.user_name}
                <span className="ml-1 tabular-nums opacity-60">
                  {p.is_disqualified ? "out" : `${p.marked}/24`}
                </span>
              </span>
            ))}
          </div>
        )}

        <RoundSummary
          room={room}
          winner={data?.winner || null}
          won={won}
          hasTicket={!!ticket}
          playing={again.isPending}
          onHome={() => navigate({ to: "/" })}
          onPlayAgain={() => again.mutate(room.bet_amount)}
        />

        <ActionBar
          onLeave={() => leave.mutate()}
          onRefresh={() => refetch()}
          onBingo={() => claim.mutate()}
          leaving={leave.isPending}
          refreshing={isFetching}
          canClaim={!!ticket && !disqualified && room.status !== "finished" && !claim.isPending}
        />
      </div>
    </AppShell>
  );
}

function Header({ onBack, title, subtitle, status }) {
  return (
    <div className="flex items-center gap-2 lg:gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/80 bg-card/70 text-foreground/80 transition hover:border-primary/50 hover:text-foreground lg:h-9 lg:w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
      <p className="truncate font-display text-[13px] tracking-tight lg:text-[15px]">{title}</p>
        {subtitle && (
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground lg:mt-0.5 lg:text-[10px] lg:tracking-[0.16em]">
            {subtitle}
          </p>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] lg:px-2.5 lg:py-1 lg:text-[9.5px] lg:tracking-[0.14em]",
            status === "live" && "border-accent/40 bg-accent/10 text-accent",
            status === "waiting" && "border-primary/30 bg-primary/10 text-primary",
            status === "finished" && "border-border bg-card/70 text-muted-foreground"
          )}
        >
          {status === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
          {status}
        </span>
      )}
    </div>
  );
}