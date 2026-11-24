import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { getProfile, updateProfile } from "@/lib/server-fns";
import { amountEtb, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/profile")({
  head: () => ({ meta: [{ title: "Profile — AfroGo Bingo" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const profileFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileFn({ data: {} }),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setName(data?.displayName ?? "");
    setPhone(data?.phone ?? "");
  }, [data?.displayName, data?.phone]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { displayName: name, phone } }),
    onSuccess: () => {
      toast.success("Profile saved");
      refetch();
    },
    onError: (err) => toast.error(err?.message || "Could not save your profile."),
  });

  const initial = (data?.displayName || data?.email || "P").slice(0, 1).toUpperCase();

  return (
    <AppShell>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">Your account and your record at the table.</p>

      <div className="mt-6 flex items-center gap-3.5 rounded-3xl border border-border/80 bg-card/60 p-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(46,100%,74%)] via-[hsl(42,95%,60%)] to-[hsl(28,90%,52%)] font-display text-xl font-bold text-[hsl(255,32%,9%)]">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] tracking-tight">{data?.displayName || "Player"}</p>
          <p className="truncate text-[11px] text-muted-foreground">{data?.email || "—"}</p>
          {data?.joined && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">Joined {formatDate(data.joined)}</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Stat label="Played" value={data?.gamesPlayed ?? 0} />
        <Stat label="Won" value={data?.gamesWon ?? 0} highlight />
        <Stat label="ETB won" value={amountEtb(data?.totalWon)} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
        className="mt-6 rounded-2xl border border-border/80 bg-card/60 p-4"
      >
        <p className="text-[12.5px] font-semibold">Account details</p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Display name
              </Label>
            <Input
              id="displayName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How your name shows in a room"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Phone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="09xx xxx xxx"
              inputMode="tel"
              maxLength={30}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={save.isPending || isLoading}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </form>

      {data?.role === "admin" && (
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.08] px-4 py-3 text-left transition hover:border-primary/60"
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="flex-1 text-[12.5px] font-semibold text-foreground">Operator dashboard</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

<Button variant="ghost" className="mt-3 w-full text-muted-foreground" onClick={() => logout()}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </AppShell>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div
      className={
        "rounded-2xl border p-3 " +
        (highlight ? "border-primary/30 bg-primary/[0.08]" : "border-border/70 bg-card/60")
      }
    >
      <p className="text-[8.5px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 font-display text-[16px] font-semibold tabular-nums " + (highlight ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}