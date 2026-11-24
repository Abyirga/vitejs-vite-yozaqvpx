import { useState } from "react";
import { Copy, Loader2, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VoucherGenerator({ onGenerate, busy, codes }) {
  const [amount, setAmount] = useState("50");
  const [count, setCount] = useState("5");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Codes copied");
    } catch {
      toast.error("Could not copy the codes.");
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <TicketIcon className="h-4 w-4 text-accent" />
        <p className="text-[12.5px] font-semibold">Voucher codes</p>
      </div>
      <p className="mt-1 text-[10.5px] text-muted-foreground">Single-use codes to hand to your agents.</p>

      <div className="mt-3 flex gap-2">
        <Input
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="ETB value"
          className="flex-1 text-[12.5px]"
        />
        <Input
          value={count}
          onChange={(event) => setCount(event.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="How many"
          className="w-24 text-[12.5px]"
        />
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            onGenerate({ amount: Number(amount) || 0, count: Math.min(40, Number(count) || 0) })
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
      </div>

      {codes?.length > 0 && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent/[0.07] p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">New codes</p>
            <button
              type="button"
              onClick={copyAll}
              className="flex items-center gap-1 text-[10px] text-accent transition hover:opacity-80"
            >
              <Copy className="h-3 w-3" /> Copy all
            </button>
          </div>
          <div className="mt-2 grid gap-1 font-mono text-[11px] text-foreground/80">
            {codes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}