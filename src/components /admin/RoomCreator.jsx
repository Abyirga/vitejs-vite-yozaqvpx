import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function RoomCreator({ onCreate, busy }) {
  const [bet, setBet] = useState(10);
  const [minutes, setMinutes] = useState("2");

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-4">
      <p className="text-[12.5px] font-semibold">Open a room</p>
      <p className="mt-1 text-[10.5px] text-muted-foreground">Players join until the start time you set.</p>

      <div className="mt-3 flex gap-2">
        {[5, 10, 20].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setBet(value)}
            className={cn(
              "flex-1 rounded-xl border py-2 text-[12px] font-semibold transition",
              bet === value
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/80 bg-secondary/40 text-foreground/70"
            )}
          >
            {value} ETB
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex gap-2">
        <Input
          value={minutes}
          onChange={(event) => setMinutes(event.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="Starts in minutes"
          className="flex-1 text-[12.5px]"
        />
        <Button
          type="button"
          className="shrink-0"
          disabled={busy}
          onClick={() => onCreate({ betAmount: bet, startInMinutes: Number(minutes) || 0 })}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}