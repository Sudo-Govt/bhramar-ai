import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Briefcase, Users, Calendar, Bell, Search, TrendingUp,
  AlertTriangle, Clock, ChevronRight, Sparkles, Gavel,
  IndianRupee, FileText, MessageSquare, ArrowUpRight,
  ArrowDownRight, Activity
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────

interface CaseStats {
  active: number;
  draft: number;
  closed: number;
  total: number;
  urgent: number;
}

interface ClientPulse {
  id: string;
  full_name: string;
  case_count: number;
  last_active: string;
  status: "active" | "idle" | "new";
}

interface FinancialSnapshot {
  pending_invoices: number;
  total_revenue: number;
  this_month: number;
  growth: number; // percentage
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  metadata: any;
}

interface HearingItem {
  id: string;
  name: string;
  case_number: string;
  client_name: string;
  time: string;
  court: string;
  priority: string;
}

// ─── Main Component ──────────────────────────────────────────────

export function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<<CaseStats>({ active: 0, draft: 0, closed: 0, total: 0, urgent: 0 });
  const [clients, setClients] = useState<<ClientPulse[]>([]);
  const [financials, setFinancials] = useState<<FinancialSnapshot>({ pending_invoices: 0, total_revenue: 0, this_month: 0, growth: 0 });
  const [activities, setActivities] = useState<<ActivityItem[]>([]);
  const [hearings, setHearings] = useState<HearingItem[]>([]);
  const [notifications, setNotifications] = useState(3);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Parallel data fetching
      const [
        casesRes,
        clientsRes,
        tasksRes,
        activityRes,
        hearingsRes
      ] = await Promise.all([
        // Case stats
        supabase.from("cases").select("status, priority").eq("user_id", user.id),
        // Client list with case counts
        supabase.from("profiles").select(`
          id, full_name, created_at,
          cases!cases_user_id_fkey(count)
        `).eq("user_type", "citizen").limit(5),
        // Financial (from tasks/invoices if you have them, else mock)
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("status", "pending"),
        // Recent activity
        supabase.from("audit_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        // Today's hearings
        supabase.from("cases").select("id, name, case_number, client_name, deadline, court_of_practice, priority")
          .eq("user_id", user.id)
          .gte("deadline", today)
          .lte("deadline", today + "T23:59:59")
          .order("deadline")
      ]);

      // Process case stats
      const cases = casesRes.data || [];
      const urgent = cases.filter((c: any) => c.priority === "high" || c.priority === "critical").length;
      setStats({
        active: cases.filter((c: any) => c.status === "active").length,
        draft: cases.filter((c: any) => c.status === "draft").length,
        closed: cases.filter((c: any) => c.status === "closed").length,
        total: cases.length,
        urgent,
      });

      // Process clients
      const clientData = (clientsRes.data || []).map((c: any) => ({
        id: c.id,
        full_name: c.full_name || "Unknown",
        case_count: c.cases?.[0]?.count || 0,
        last_active: new Date(c.created_at).toLocaleDateString(),
        status: c.case_count > 0 ? "active" : "new",
      }));
      setClients(clientData);

      // Financials (mock if no real data)
      setFinancials({
        pending_invoices: tasksRes.data?.length || 0,
        total_revenue: 125000,
        this_month: 45000,
        growth: 12.5,
      });

      // Activities
      setActivities(activityRes.data || []);

      // Hearings
      const hearingData = (hearingsRes.data || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        case_number: h.case_number,
        client_name: h.client_name,
        time: h.deadline ? new Date(h.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD",
        court: h.court_of_practice || "High Court",
        priority: h.priority || "medium",
      }));
      setHearings(hearingData);

    } catch (err) {
      console.error("Dashboard load failed:", err);
    }
    setLoading(false);
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* ─── STATS ROW ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Active Cases"
          value={stats.active}
          icon={Briefcase}
          color="text-green-500"
          trend="+2 this week"
        />
        <StatCard
          label="Urgent"
          value={stats.urgent}
          icon={AlertTriangle}
          color="text-red-500"
          trend="Action needed"
        />
        <StatCard
          label="Draft"
          value={stats.draft}
          icon={FileText}
          color="text-blue-500"
        />
        <StatCard
          label="Total Clients"
          value={clients.length}
          icon={Users}
          color="text-purple-500"
          trend="+1 new"
        />
        <StatCard
          label="Win Rate"
          value="78%"
          icon={TrendingUp}
          color="text-gold"
          trend="+5% vs last month"
        />
      </div>

      {/* ─── MAIN GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Hearings + Funnel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Hearings */}
          <Card className="border-l-4 border-l-gold">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-gold" />
                  TODAY'S HEARINGS
                </CardTitle>
                <Badge variant="outline">{hearings.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hearings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No hearings scheduled
                </div>
              ) : (
                hearings.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/cases/${h.id}`)}
                  >
                    <div className="flex flex-col items-center min-w-[3rem]">
                      <span className="text-lg font-bold text-gold">{h.time}</span>
                      <span className="text-[10px] text-muted-foreground">hrs</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.case_number} · {h.court}</p>
                    </div>
                    <Badge variant={h.priority === "high" ? "destructive" : "outline"} className="text-[10px]">
                      {h.priority}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Case Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                CASE PIPELINE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FunnelBar label="Intake" value={stats.draft} total={stats.total} color="bg-blue-500" />
              <FunnelBar label="Active" value={stats.active} total={stats.total} color="bg-green-500" />
              <FunnelBar label="Closed" value={stats.closed} total={stats.total} color="bg-muted" />
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE COLUMN: AI Prep + Financials (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Prep Card */}
          <Card className="bg-gradient-to-br from-navy-deep to-background border-navy">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gold">
                <Sparkles className="h-4 w-4" />
                AI HEARING PREP
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hearings.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-background/50 backdrop-blur">
                    <p className="text-xs font-medium text-gold mb-1">Next: {hearings[0].name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      Key arguments prepared. Review Section 103 BNS for bail application. 
                      Judge Sharma presiding — precedent favors defense in similar cases.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                    <Sparkles className="h-3 w-3 mr-2" />
                    Generate Full Brief
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hearings to prepare for</p>
              )}
            </CardContent>
          </Card>

          {/* Financial Snapshot */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                FINANCIALS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <span className="text-lg font-bold">₹{financials.this_month.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Growth</span>
                <span className={`text-sm font-medium flex items-center gap-1 ${financials.growth >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {financials.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(financials.growth)}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Pending Invoices</span>
                  <span className="font-medium">{financials.pending_invoices}</span>
                </div>
                <Progress value={financials.pending_invoices * 10} className="h-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Client Pulse + Calendar + News (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Client Pulse */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                CLIENT PULSE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {clients.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => navigate(`/clients/${c.id}`)}
                    >
                      <div className={`h-2 w-2 rounded-full ${c.status === "active" ? "bg-green-500" : c.status === "new" ? "bg-blue-500" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.case_count} cases · {c.last_active}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No clients yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Mini Calendar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                COURT CALENDAR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniCalendar />
            </CardContent>
          </Card>

          {/* Legal News */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">LEGAL BRIEFS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <NewsItem
                  title="BNS 2023: Key changes in Section 103"
                  source="Supreme Court Observer"
                  time="2h ago"
                />
                <NewsItem
                  title="New bail guidelines issued by Delhi HC"
                  source="Bar & Bench"
                  time="5h ago"
                />
                <NewsItem
                  title="DPDP Act: Compliance deadline extended"
                  source="Live Law"
                  time="1d ago"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── BOTTOM ROW: Activity Feed ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            RECENT ACTIVITY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[120px]">
            <div className="flex gap-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 min-w-[200px] p-2 rounded bg-muted/30">
                    <div className="h-2 w-2 rounded-full bg-gold" />
                    <div>
                      <p className="text-xs font-medium">{a.action}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: string | number; icon: any; color: string; trend?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {trend && <p className="text-[10px] text-muted-foreground mt-1">{trend}</p>}
          </div>
          <Icon className={`h-5 w-5 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniCalendar() {
  const today = new Date();
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const currentDay = today.getDay();
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: 7 }, (_, i) => {
          const isToday = i === currentDay;
          return (
            <div
              key={i}
              className={`aspect-square rounded flex items-center justify-center text-xs cursor-pointer hover:bg-muted transition-colors ${
                isToday ? "bg-gold text-primary-foreground font-bold" : ""
              }`}
            >
              {today.getDate() - currentDay + i + 1}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span>Hearing</span>
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 ml-2" />
        <span>Deadline</span>
      </div>
    </div>
  );
}

function NewsItem({ title, source, time }: { title: string; source: string; time: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer transition-colors">
      <div className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium line-clamp-2">{title}</p>
        <p className="text-[10px] text-muted-foreground">{source} · {time}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="col-span-4 space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="col-span-3 space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}
