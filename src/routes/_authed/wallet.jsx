import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import TransactionList from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWallet, redeemVoucher } from "@/lib/server-fns";
import { amountEtb } from "@/lib/format";

export const Route = createFileRoute("/_authed/wallet")({
  head: () => ({ meta: [{ title: "Wallet — AfroGo Bingo" }] }),
  component: WalletPage,
});

function WalletPage() {
  const walletFn = useServerFn(getWallet);
  const redeemFn = useServerFn(redeemVoucher);
  const [code, setCode] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletFn({ data: {} }),
    refetchInterval: 15000,
  });

  const redeem = useMutation({
    mutationFn: () => redeemFn({ data: { code } }),
    onSuccess: (res) => {
      setCode("");
      toast.success(`Voucher added — ${amountEtb(res.amount)} ETB`);
      refetch();
    },
    onError: (err) => toast.error(err?.message || "That voucher could not be redeemed."),
  });

  const submit = (event) => {
    event.preventDefault();
    if (code.trim().length < 3) {
      toast.error("Enter the voucher code from your agent.");
      return;
    }
    redeem.mutate();
  };

  return (
    <AppShell>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">Wallet</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">Top up with a voucher and track every ETB.</p>

      <div className="relative mt-6 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.16] via-card to-card p-5">
        <div className="pattern-weave pointer-events-none absolute inset-0 opacity-40" />
        <p className="relative text-[9.5px] font-semibold uppercase tracking-[0.22em] text-primary/80">Balance</p>
        <p className="relative mt-1.5 font-display text-[38px] font-semibold leading-none tracking-tight tabular-nums">
          {isLoading ? "—" : amountEtb(data?.balance)}
          <span className="ml-2 text-[13px] font-semibold text-muted-foreground">ETB</span>
        </p>

        <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-border/50 pt-3.5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Won</p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-accent">{amountEtb(data?.totalWon)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Spent</p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground/80">{amountEtb(data?.totalSpent)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">In play</p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-primary">{amountEtb(data?.playBalance)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-border/80 bg-card/60 p-4">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-accent" />
          <p className="text-[12.5px] font-semibold">Redeem a voucher</p>
        </div>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
          Buy a code from an AfroGo agent, then enter it here.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AFRO-XXXX-XXXX"
            className="flex-1 font-mono text-[12.5px] uppercase tracking-wider"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <Button type="submit" disabled={redeem.isPending} className="shrink-0">
            {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
            </Button>
        </div>
      </form>

      <div className="mt-7">
        <h2 className="font-display text-[15px] tracking-tight">Activity</h2>
        <div className="mt-3">
          <TransactionList transactions={data?.transactions || []} />
        </div>
      </div>
    </AppShell>
  );
}