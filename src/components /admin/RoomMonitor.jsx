import { amountEtb, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function RoomMonitor({ rooms = [] }) {
  if (!rooms.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-[11.5px] text-muted-foreground">
        No rooms yet — open one above.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card/60">
      {rooms.map((room) => (
        <div key={room.id} className="flex items-center gap-3 px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium leading-tight">
              {room.bet_amount} ETB room
              <span className="ml-2 text-[10px] text-muted-foreground">{room.players_count} players</span>
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {room.status === "finished"
                ? `${room.winner_name || "No winner"} · ${formatDateTime(room.finished_at)}`
                : room.start_at
                  ? `Starts ${formatDateTime(room.start_at)}`
                  : "Open for players"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11.5px] font-semibold tabular-nums">{amountEtb(room.pot)}</p>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em]",
                room.status === "live" && "bg-accent/15 text-accent",
                room.status === "waiting" && "bg-primary/15 text-primary",
                room.status === "finished" && "bg-secondary/60 text-muted-foreground"
              )}
            >
              {room.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}