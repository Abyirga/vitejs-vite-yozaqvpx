import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowUpRight, Sparkles, Trophy, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getHomeData } from '@/lib/server-fns';
import { amountEtb } from '@/lib/format';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'AfroGo Bingo — Live Bingo, Real ETB' },
      {
        name: 'description',
        content:
          'Join live bingo rooms at 5, 10 or 20 ETB. Numbers are drawn live, the first full house takes the pot.',
      },
    ],
  }),
  component: HomePage,
});

const TIERS = [
  { amount: 5, tag: 'Starter', note: 'Quick round' },
  { amount: 10, tag: 'Popular', note: 'Best value' },
  { amount: 20, tag: 'High stake', note: 'Bigger pot' },
];

function HomePage() {
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const homeFn = useServerFn(getHomeData);

  const { data } = useQuery({
    queryKey: ['home', user?.id],
    queryFn: () => homeFn({ data: {} }),
    enabled: isAuthenticated,
    refetchInterval: 20000,
  });

  const handleTier = (betAmount) => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    navigate({ to: '/enter', search: { bet: betAmount } });
  };

  const tierStats = (bet) => data?.roomsByTier?.find((t) => t.bet === bet);

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[hsl(46,100%,74%)] via-[hsl(42,95%,60%)] to-[hsl(28,90%,52%)] glow-gold">
            <span className="font-display text-lg font-bold text-[hsl(255,30%,8%)]">
              A
            </span>
          </div>
          <div className="leading-none">
            <p className="font-display text-[15px] tracking-tight">AfroGo</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.34em] text-muted-foreground">
              Bingo
            </p>
          </div>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => navigate({ to: '/wallet' })}
            className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-right transition hover:border-primary/60"
          >
            <span className="block text-[8.5px] uppercase tracking-[0.18em] text-primary/80">
              Balance
            </span>
            <span className="block font-display text-[13px] font-semibold leading-tight text-foreground">
              {data ? `ETB ${amountEtb(data.balance)}` : '—'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (isLoadingAuth ? null : navigateToLogin())}
            className="rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-foreground/80 transition hover:border-primary/50 hover:text-foreground"
          >
            Sign in
          </button>
        )}
      </header>

      <section className="mt-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-3 w-3" />
          {data?.liveCount ? `${data.liveCount} live now` : 'Live rooms open'}
        </span>

        <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight sm:text-5xl">
          Welcome to
          <br />
          <span className="text-gold">AfroGo Bingo</span>
        </h1>

        <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
          Pick your stake, follow the numbers as they drop live, and be the
          first full house to take the pot in ETB.
        </p>
      </section>

      {data?.activeRoom && (
        <button
          type="button"
          onClick={() =>
            navigate({
              to: '/rooms/$roomId',
              params: { roomId: data.activeRoom.id },
            })
          }
          className="mt-7 flex w-full items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-left transition hover:border-accent/70"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Your room is open
            </p>
            <p className="mt-1 font-display text-[15px] tracking-tight">
              {data.activeRoom.bet_amount} ETB table
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-accent" />
        </button>
      )}

      <section className="mt-9">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-[17px] tracking-tight">
            Choose your bet size
          </h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ETB
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {TIERS.map((tier) => {
            const featured = tier.amount === 10;
            const stats = tierStats(tier.amount);
            return (
              <button
                key={tier.amount}
                type="button"
                onClick={() => handleTier(tier.amount)}
                className={
                  'group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300 active:scale-[0.98] disabled:opacity-70 ' +
                  (featured
                    ? 'border-primary/45 bg-gradient-to-b from-primary/[0.14] to-card shadow-[0_18px_40px_-24px_hsl(42,92%,58%,0.8)]'
                    : 'border-border bg-card/80 hover:border-primary/35 hover:bg-card')
                }
              >
                <div className="pattern-weave pointer-events-none absolute inset-0 opacity-40" />
                <span
                  className={
                    'relative text-[9px] font-semibold uppercase tracking-[0.16em] ' +
                    (featured ? 'text-primary' : 'text-muted-foreground')
                  }
                >
                  {tier.tag}
                </span>
                <div className="relative mt-2 flex items-baseline gap-1">
                  <span className="font-display text-[27px] font-semibold leading-none tracking-tight">
                    {tier.amount}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    ETB
                  </span>
                </div>
                <p className="relative mt-1.5 text-[10.5px] text-muted-foreground">
                  {stats?.players ? `${stats.players} waiting` : tier.note}
                </p>
                <ArrowUpRight
                  className="relative mt-2 h-3.5 w-3.5 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  strokeWidth={2.4}
                />
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground/80">
          Your entry joins the room pot. The house keeps 15%, and the rest goes
          to the winner.
        </p>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
          <Users className="h-4 w-4 text-accent" strokeWidth={2} />
          <p className="mt-2.5 font-display text-[15px] tracking-tight">
            Play together
          </p>
          <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
            Everyone in a room sees the same draw, live.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
          <Trophy className="h-4 w-4 text-primary" strokeWidth={2} />
          <p className="mt-2.5 font-display text-[15px] tracking-tight">
            Win instantly
          </p>
          <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
            Pots drop straight into your ETB wallet.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
