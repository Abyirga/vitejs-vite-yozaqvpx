import { amountEtb } from "@/lib/format";

const shortId = (id) => (id ? `#${String(id).slice(0, 6).toUpperCase()}` : "#—");

export default function GameStats({ room, players }) {
  const stats = [
    { label: "Game", value: shortId(room.id) },
    { label: "Players", value: players },
    { label: "Bet", value: `${amountEtb(room.bet_amount)}` },
    { label: "Winning", value: `${amountEtb(room.pot)} ETB`, gold: true },
  ];

  return (
    <div className="grid grid-cols-4 gap-1 lg:gap-1.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border/70 bg-card/60 px-1.5 py-1 text-center lg:rounded-2xl lg:px-2 lg:py-2"
        >
          <p className="text-[7px] uppercase tracking-[0.14em] text-muted-foreground lg:text-[8px] lg:tracking-[0.16em]">
            {s.label}
          </p>
          <p
            className={
              s.gold
                ? "mt-0.5 font-display text-[11px] font-semibold tabular-nums text-gold lg:text-[12.5px]"
                : "mt-0.5 font-display text-[11px] font-semibold tabular-nums lg:text-[12.5px]"
            }
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}