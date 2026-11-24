import { useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreditTool({ onCredit, busy }) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <p className="text-[12.5px] font-semibold">Credit a wallet</p>
      </div>
      <p className="mt-1 text-[10.5px] text-muted-foreground">Add ETB to a player's balance manually.</p>

      <div className="mt-3 space-y-2">
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="player@email.com"
          inputMode="email"
          autoComplete="off"
          className="text-[12.5px]"
        />
        <div className="flex gap-2">
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="ETB amount"
            className="flex-1 text-[12.5px]"
          />
          <Button
            type="button"
            className="shrink-0"
            disabled={busy}
            onClick={() => onCredit({ email, amount: Number(amount) || 0 })}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Credit"}
          </Button>
        </div>
      </div>
    </div>
  );
}