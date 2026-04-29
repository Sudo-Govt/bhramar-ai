import { ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/bhramar-logo.png";

export type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number };

export function DashboardShell({
  title,
  subtitle,
  nav,
  children,
  accent = "gold",
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  children: ReactNode;
  accent?: "gold" | "teal";
}) {
  const { signOut, user } = useAuth();
  const { pathname } = useLocation();
  const accentClass = accent === "teal" ? "text-emerald-400" : "text-gold";

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <img src={logoIcon} alt="Bhramar" className="h-7 w-7 object-contain" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-foreground">Bhramar</span>
            <span className={cn("text-[10px] uppercase tracking-widest", accentClass)}>{title}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-foreground border border-primary/30"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active && accentClass)} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-foreground">{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link to="/app" className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to AI chat
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded w-full">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <div className="px-2 pt-2 text-[10px] text-muted-foreground truncate">{user?.email}</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-background/60 backdrop-blur">
          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Link to="/app">
            <Button variant="outline" size="sm">Open Bhramar AI</Button>
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
