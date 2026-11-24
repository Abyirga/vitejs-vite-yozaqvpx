import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function AutoMarkSwitch({ checked, onCheckedChange }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-2 py-1">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Auto mark
      </p>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="Mark called numbers automatically"
      />
      <p
        className={cn(
          "w-4 text-[8.5px] font-medium",
          checked ? "text-accent" : "text-muted-foreground/70"
        )}
      >
        {checked ? "On" : "Off"}
      </p>
    </div>
  );
}