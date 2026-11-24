import { Gift, Trophy, Ticket as TicketIcon, Coins } from "lucide-react";
import { amountEtb, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const META = {
  voucher: { icon: Gift, tone: "text-accent" },
  entry: { icon: TicketIcon, tone: "text-muted-foreground" },
  win: { icon: Trophy, tone: "text-primary" },
  credit: { icon: Coins, tone: "text-primary" },
};

export default function TransactionList({ transactions = [], empty = "No wallet activity yet." }) {
  if (!transactions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-[12px] text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card/60">
      {transactions.map((txn) => {
        const meta = META[txn.type] || META.credit;
        const Icon = meta.icon;
        const positive = Number(txn.amount) >= 0;
        return (
          <div key={txn.id} className="flex items-center gap-3 px-3.5 py-3">
            <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary/60", meta.tone)}>
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium leading-tight">{txn.description || "Wallet movement"}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">{formatDateTime(txn.created_date)}</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-[12.5px] font-semibold tabular-nums",
                  positive ? "text-accent" : "text-foreground/80"
                )}
              >
                {positive ? "+" : "−"}
                {amountEtb(Math.abs(Number(txn.amount) || 0))}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{amountEtb(txn.balance_after)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
