import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Clock, Search, AlertTriangle, Share2, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import logoImg from "@/assets/bhramar-logo.png";

interface Lp {
  id: string;
  category: string;
  description: string;
  act_reference: string;
  period_days: number | null;
  period_label: string;
  urgent_flag: boolean;
  sort_order: number;
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function computeDeadline(startDate: string, days: number | null) {
  if (!startDate || days == null) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function daysFromNow(d: Date) {
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export default function LegalClock() {
  const [rows, setRows] = useState<Lp[]>([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("limitation_periods")
        .select("*")
        .order("sort_order", { ascending: true });
      setRows((data as Lp[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.category.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.act_reference.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const selected = rows.find((r) => r.id === selectedId);
  const deadline = selected ? computeDeadline(startDate, selected.period_days) : null;
  const daysLeft = deadline ? daysFromNow(deadline) : null;

  const urgencyTone =
    daysLeft == null
      ? "muted"
      : daysLeft < 0
      ? "expired"
      : daysLeft <= 14
      ? "danger"
      : daysLeft <= 60
      ? "warn"
      : "ok";

  const share = () => {
    if (!selected) return;
    const txt = deadline
      ? `My ${selected.category} limitation expires on ${fmt(deadline)}. — Bhramar.ai`
      : `My ${selected.category} matter: ${selected.period_label}. — Bhramar.ai`;
    const url = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="Bhramar" className="h-8 w-8" />
            <span className="font-display text-lg font-bold">Bhramar<span className="text-gold">.ai</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="h-7 w-7 text-gold" />
          <h1 className="font-display text-3xl md:text-4xl font-bold">Legal Clock</h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Find the limitation period for any common Indian legal action. Enter the date of cause and Bhramar will tell you when the clock runs out.
        </p>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* List */}
          <Card className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, description or act…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {loading && <p className="text-sm text-muted-foreground p-4">Loading…</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No matches.</p>
              )}
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === r.id
                      ? "border-gold bg-gold/5"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                    {r.urgent_flag && (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" /> Urgent
                      </Badge>
                    )}
                    <span className="ml-auto text-xs font-semibold text-gold">{r.period_label}</span>
                  </div>
                  <div className="text-sm font-medium">{r.description}</div>
                  <div className="text-xs text-muted-foreground">{r.act_reference}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Calculator */}
          <Card className="p-4 h-fit sticky top-6">
            <h2 className="font-display text-lg font-bold mb-3">Compute deadline</h2>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Pick a limitation type from the list.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Selected</div>
                  <div className="font-medium">{selected.description}</div>
                  <div className="text-xs text-muted-foreground">{selected.act_reference}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date of cause of action</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className={`rounded-lg p-3 border ${
                  urgencyTone === "expired" ? "border-destructive/40 bg-destructive/10" :
                  urgencyTone === "danger" ? "border-destructive/40 bg-destructive/5" :
                  urgencyTone === "warn" ? "border-gold/40 bg-gold/10" :
                  urgencyTone === "ok" ? "border-emerald-500/40 bg-emerald-500/5" :
                  "border-border bg-muted/30"
                }`}>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Deadline</div>
                  {deadline ? (
                    <>
                      <div className="text-2xl font-display font-bold">{fmt(deadline)}</div>
                      <div className={`text-sm mt-1 ${
                        urgencyTone === "expired" || urgencyTone === "danger" ? "text-destructive" :
                        urgencyTone === "warn" ? "text-gold" :
                        "text-muted-foreground"
                      }`}>
                        {daysLeft! < 0 ? `Expired ${Math.abs(daysLeft!)} days ago` : `${daysLeft} days remaining`}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm">{selected.period_label}{selected.urgent_flag ? " — file immediately." : ""}</div>
                  )}
                </div>

                <Button onClick={share} className="w-full gap-2" variant="outline">
                  <Share2 className="h-4 w-4" /> Share on WhatsApp
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Not legal advice. Verify with a qualified advocate before action.
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-6 py-8 text-center text-xs text-muted-foreground">
        Powered by <Link to="/" className="text-gold hover:underline">Bhramar.ai</Link>
      </footer>
    </div>
  );
}
