import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import CreditTool from "@/components/admin/CreditTool";
import RoomCreator from "@/components/admin/RoomCreator";
import RoomMonitor from "@/components/admin/RoomMonitor";
import StatGrid from "@/components/admin/StatGrid";
import VoucherGenerator from "@/components/admin/VoucherGenerator";
import TransactionList from "@/components/TransactionList";
import { useAuth } from "@/lib/AuthContext";
import { amountEtb } from "@/lib/format";
import { adminCreateRoom, adminCreditWallet, adminGenerateVouchers, adminOverview } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin")({
  head: () => ({ meta: [{ title: "Operator dashboard — AfroGo Bingo" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const overviewFn = useServerFn(adminOverview);
  const createFn = useServerFn(adminCreateRoom);
  const voucherFn = useServerFn(adminGenerateVouchers);
  const creditFn = useServerFn(adminCreditWallet);
  const isAdmin = user?.role === "admin";
  const [codes, setCodes] = useState([]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin"],
    queryFn: () => overviewFn({ data: {} }),
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: (payload) => createFn({ data: payload }),
    onSuccess: () => {
      toast.success("Room opened");
      refetch();
    },
    onError: (err) => toast.error(err?.message || "Could not open the room."),
  });

  const vouchers = useMutation({
    mutationFn: (payload) => voucherFn({ data: payload }),
    onSuccess: (res) => {
      setCodes(res.codes || []);
      toast.success(`${res.count} voucher codes created`);
      refetch();
    },
    onError: (err) => toast.error(err?.message || "Could not create vouchers."),
  });

  const credit = useMutation({
    mutationFn: (payload) => creditFn({ data: payload }),
    onSuccess: (res) => {
      toast.success(`Credited ${res.name || "player"} — balance ${amountEtb(res.balance)} ETB`);
      refetch();
    },
    onError: (err) => toast.error(err?.message || "Could not credit that wallet."),
  });

  if (isLoadingAuth) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mt-10 rounded-3xl border border-border/80 bg-card/60 p-6 text-center">
          <ShieldAlert className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 font-display text-[16px] tracking-tight">Operator access only</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
          This dashboard is for the house. Ask an admin to grant your account access.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="mx-auto mt-4 flex items-center gap-1.5 text-[11px] text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the game
          </button>
        </div>
      </AppShell>
    );
  }

  const handleCredit = ({ email, amount }) => {
    if (!email.includes("@") || amount < 1) {
      toast.error("Enter the player's email and an amount.");
      return;
    }
    credit.mutate({ email, amount });
  };

  const handleVouchers = ({ amount, count }) => {
    if (amount < 1 || count < 1) {
      toast.error("Enter a value and how many codes you need.");
      return;
    }
    vouchers.mutate({ amount, count });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/80 bg-card/70 text-foreground/80"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight">Operator dashboard</h1>
          <p className="text-[10.5px] text-muted-foreground">Rooms, vouchers and payouts</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mt-5">
            <StatGrid stats={data?.stats} />
          </div>

          <div className="mt-4 space-y-3">
            <RoomCreator onCreate={(payload) => create.mutate(payload)} busy={create.isPending} />
            <VoucherGenerator onGenerate={handleVouchers} busy={vouchers.isPending} codes={codes} />
            <CreditTool onCredit={handleCredit} busy={credit.isPending} />
          </div>

          <section className="mt-7">
            <h2 className="font-display text-[15px] tracking-tight">Rooms</h2>
            <div className="mt-3">
              <RoomMonitor rooms={data?.rooms || []} />
            </div>
          </section>

          <section className="mt-7">
            <h2 className="font-display text-[15px] tracking-tight">Recent payouts</h2>
            <div className="mt-3">
              <TransactionList transactions={data?.transactions || []} empty="No wallet movement yet." />
            </div>
          </section>

          <section className="mt-7">
            <h2 className="font-display text-[15px] tracking-tight">Voucher codes</h2>
            <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card/60">
              {(data?.vouchers || []).length === 0 && (
                <p className="px-3.5 py-6 text-center text-[11.5px] text-muted-foreground">No codes yet.</p>
              )}
              {(data?.vouchers || []).map((voucher) => (
                <div key={voucher.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11.5px] tracking-wide">{voucher.code}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {voucher.status === "redeemed"
                        ? `Used by ${voucher.redeemed_by_name || "a player"}`
                        : "Not used yet"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] font-semibold tabular-nums">{amountEtb(voucher.amount)}</p>
                    <span
                      className={
                        "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] " +
                        (voucher.status === "active" ? "bg-accent/15 text-accent" : "bg-secondary/60 text-muted-foreground")
                      }
                    >
                      {voucher.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </>
      )}
    </AppShell>
  );
}