import { Loader2, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActionBar({
  onLeave,
  onRefresh,
  onBingo,
  leaving = false,
  refreshing = false,
  canClaim = true,
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
      <Button
        variant="outline"
        className="h-10 gap-1 border-border/80 px-2 text-[11.5px] lg:h-11 lg:gap-1.5 lg:text-[12px]"
        onClick={onLeave}
        disabled={leaving}
      >
        {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Leave
      </Button>
      <Button
        variant="secondary"
        className="h-10 gap-1 px-2 text-[11.5px] lg:h-11 lg:gap-1.5 lg:text-[12px]"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        Refresh
      </Button>
      <Button
        className="h-10 gap-1 px-2 text-[11.5px] font-semibold lg:h-11 lg:gap-1.5 lg:text-[12px]"
        onClick={onBingo}
        disabled={!canClaim}
      >
        <Sparkles className="h-4 w-4" />
        Bingo
      </Button>
    </div>
  );
}