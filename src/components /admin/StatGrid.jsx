import { cn } from "@/lib/utils";

export default function StatGrid({ stats }) {
  const items = [
    { label: "Players", value: stats?.players ?? 0 },
    { label: "Live rooms", value: stats?.liveRooms ?? 0, accent: true },
    { label: "Balances (ETB)", value: (stats?.balances ?? 0).toFixed(2) },
    { label: "Wagered (ETB)", value: (stats?.wagered ?? 0).toFixed(2) },
    { label: "Paid out (ETB)", value: (stats?.paidOut ?? 0).toFixed(2) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-2xl border p-3",
            item.accent ? "border-accent/35 bg-accent/[0.08]" : "border-border/70 bg-card/60"
          )}
        >
          <p className="text-[8.5px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "mt-1 font-display text-[16px] font-semibold tabular-nums",
              item.accent ? "text-accent" : "text-foreground"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}