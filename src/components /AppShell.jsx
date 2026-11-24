import { Link, useRouterState } from "@tanstack/react-router";
import { Gamepad2, History as HistoryIcon, Wallet as WalletIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Game", to: "/", icon: Gamepad2 },
  { label: "History", to: "/history", icon: HistoryIcon },
  { label: "Wallet", to: "/wallet", icon: WalletIcon },
  { label: "Profile", to: "/profile", icon: User },
];

export default function AppShell({ children, bare = false, flush = false }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 app-aura" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <main
        className={cn(
          "mx-auto w-full",
          flush ? "max-w-none p-0" : cn("max-w-lg px-5 pt-6", bare ? "pb-10" : "pb-32")
        )}
      >
        {children}
      </main>

      {!bare && (
        <nav className="fixed inset-x-0 bottom-0 z-30 px-5 pb-4 pt-2">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-1 rounded-[1.4rem] border border-border/80 bg-card/85 p-1.5 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {NAV.map(({ label, to, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "group relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 transition-all duration-300",
                    active ? "bg-secondary/80 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[19px] w-[19px] transition-transform duration-300",
                      active ? "text-primary" : "group-hover:-translate-y-0.5"
                    )}
                    strokeWidth={active ? 2.3 : 1.8}
                  />
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                  {active && <span className="absolute -top-0.5 h-1 w-1 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}