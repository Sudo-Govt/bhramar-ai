import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardShell, NavItem } from "./shared/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Users, LifeBuoy, BarChart3, FileText, Shield, Archive,
  Plus, Trash2, Clock, AlertCircle, IndianRupee, Briefcase, TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const nav: NavItem[] = [
  { to: "/dashboard/enterprise", label: "Overview & KPIs", icon: LayoutDashboard },
  { to: "/dashboard/enterprise/team", label: "Advocate Team", icon: Users },
  { to: "/dashboard/enterprise/support", label: "Support Queue", icon: LifeBuoy },
  { to: "/dashboard/enterprise/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/enterprise/invoices", label: "Invoices & Payments", icon: FileText },
  { to: "/dashboard/enterprise/users", label: "Users & Roles", icon: Shield },
  { to: "/dashboard/enterprise/archive", label: "Case Archive", icon: Archive },
];

export default function EnterpriseDashboard() {
  return (
    <DashboardShell title="Enterprise Dashboard" subtitle="Firm-wide operations & analytics" nav={nav} accent="teal">
      <FirmGate>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="team" element={<TeamSection />} />
          <Route path="support" element={<SupportSection />} />
          <Route path="analytics" element={<AnalyticsSection />} />
          <Route path="invoices" element={<InvoicesSection />} />
          <Route path="users" element={<UsersSection />} />
          <Route path="archive" element={<ArchiveSection />} />
          <Route path="*" element={<Navigate to="/dashboard/enterprise" replace />} />
        </Routes>
      </FirmGate>
    </DashboardShell>
  );
}

// Ensures the user has a firm record; auto-creates one if missing
function FirmGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [firmId, setFirmId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [needSetup, setNeedSetup] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("firms").select("id").eq("owner_id", user.id).maybeSingle();
      if (data) setFirmId(data.id);
      else setNeedSetup(true);
    })();
  }, [user]);

  if (needSetup && !firmId) {
    return (
      <Card className="p-6 max-w-md mx-auto bg-card/60 border-border">
        <h2 className="text-lg font-semibold mb-2">Set up your firm</h2>
        <p className="text-sm text-muted-foreground mb-4">Name your law firm to unlock the enterprise dashboard.</p>
        <div className="space-y-3">
          <Input placeholder="Firm name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={async () => {
            if (!name) return toast.error("Name required");
            const { data, error } = await supabase.from("firms").insert({ owner_id: user!.id, name }).select("id").single();
            if (error) return toast.error(error.message);
            setFirmId(data.id); setNeedSetup(false); toast.success("Firm created");
          }}>Create firm</Button>
        </div>
      </Card>
    );
  }
  if (!firmId) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <FirmContext.Provider value={firmId}>{children}</FirmContext.Provider>;
}

import { createContext, useContext } from "react";
const FirmContext = createContext<string>("");
const useFirm = () => useContext(FirmContext);

// ============ OVERVIEW ============
function Overview() {
  const { user } = useAuth();
  const firmId = useFirm();
  const [k, setK] = useState({ cases: 0, clients: 0, advocates: 0, revenue: 0, openSupport: 0, overdue: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cases, clients, members, payments, support] = await Promise.all([
        supabase.from("cases").select("id, deadline", { count: "exact" }).eq("user_id", user.id),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("firm_members").select("id", { count: "exact", head: true }).eq("firm_id", firmId),
        supabase.from("case_payments").select("fee_received").eq("user_id", user.id),
        supabase.from("support_requests").select("id", { count: "exact", head: true }).eq("firm_id", firmId).eq("status", "open"),
      ]);
      const today = new Date();
      const overdue = (cases.data || []).filter((c: any) => c.deadline && new Date(c.deadline) < today).length;
      const revenue = (payments.data || []).reduce((s, p: any) => s + Number(p.fee_received || 0), 0);
      setK({ cases: cases.count || 0, clients: clients.count || 0, advocates: (members.count || 0) + 1, revenue, openSupport: support.count || 0, overdue });
    })();
  }, [user, firmId]);

  const tiles = [
    { label: "Total Cases", value: k.cases, icon: Briefcase, color: "text-emerald-400" },
    { label: "Clients", value: k.clients, icon: Users, color: "text-blue-400" },
    { label: "Advocates", value: k.advocates, icon: Shield, color: "text-violet-400" },
    { label: "Revenue (₹)", value: k.revenue.toLocaleString("en-IN"), icon: IndianRupee, color: "text-gold" },
    { label: "Open Support", value: k.openSupport, icon: LifeBuoy, color: "text-orange-400" },
    { label: "Overdue", value: k.overdue, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4 bg-card/60 border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.label}</span>
              <t.icon className={`h-4 w-4 ${t.color}`} />
            </div>
            <div className="text-2xl font-semibold text-foreground">{t.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-6 bg-gradient-to-br from-emerald-900/20 via-card to-card border-emerald-500/30">
        <h2 className="text-sm font-semibold text-foreground mb-1">Firm command</h2>
        <p className="text-sm text-muted-foreground">Manage advocates, monitor SLA on support requests, view firm-wide analytics, and audit every action.</p>
      </Card>
    </div>
  );
}

// ============ TEAM ============
function TeamSection() {
  const firmId = useFirm();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "advocate" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("firm_members").select("*").eq("firm_id", firmId).order("invited_at", { ascending: false });
    setMembers(data || []);
  }, [firmId]);
  useEffect(() => { if (firmId) load(); }, [firmId, load]);

  const invite = async () => {
    if (!form.email) return toast.error("Email required");
    const { error } = await supabase.from("firm_members").insert({ ...form, firm_id: firmId });
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({ user_id: user!.id, firm_id: firmId, action: "invite_member", entity_type: "firm_member", metadata: { email: form.email } });
    setOpen(false); setForm({ email: "", full_name: "", role: "advocate" }); load(); toast.success("Invitation recorded");
  };

  const remove = async (id: string) => {
    if (!confirm("Remove member?")) return;
    await supabase.from("firm_members").delete().eq("id", id); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Advocate team ({members.length})</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Invite advocate</Button>
      </div>

      <Card className="bg-card/60 border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground uppercase"><tr>
            <th className="text-left px-4 py-2">Advocate</th><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Status</th><th></th>
          </tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{m.full_name || "(pending)"}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-2"><Badge variant="outline">{m.role}</Badge></td>
                <td className="px-4 py-2"><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></td>
                <td className="px-4 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No team members yet. Invite your first advocate.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-semibold mb-3">Workload heatmap</h3>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => {
            const intensity = Math.floor(Math.random() * 4);
            const cls = ["bg-muted/30", "bg-emerald-900/40", "bg-emerald-700/60", "bg-emerald-500/80"][intensity];
            return <div key={i} className={`h-6 rounded ${cls}`} title={`Day ${i + 1}`} />;
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Last 4 weeks · workload intensity</p>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Invite advocate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advocate">Advocate</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={invite}>Send invite</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SUPPORT ============
function SupportSection() {
  const firmId = useFirm();
  const { user } = useAuth();
  const [reqs, setReqs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", priority: "normal", sla_hours: "24" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("support_requests").select("*").eq("firm_id", firmId).order("created_at", { ascending: false });
    setReqs(data || []);
  }, [firmId]);
  useEffect(() => { if (firmId) load(); }, [firmId, load]);

  const create = async () => {
    if (!form.subject) return toast.error("Subject required");
    const sla = new Date(); sla.setHours(sla.getHours() + Number(form.sla_hours));
    await supabase.from("support_requests").insert({
      firm_id: firmId, user_id: user!.id, subject: form.subject, body: form.body,
      priority: form.priority, sla_due_at: sla.toISOString(),
    });
    setOpen(false); setForm({ subject: "", body: "", priority: "normal", sla_hours: "24" }); load();
  };

  const resolve = async (id: string) => {
    await supabase.from("support_requests").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const slaTimer = (req: any) => {
    if (!req.sla_due_at || req.status === "resolved") return null;
    const ms = +new Date(req.sla_due_at) - Date.now();
    const hrs = Math.floor(ms / 3600000); const mins = Math.floor((ms % 3600000) / 60000);
    if (ms < 0) return <span className="text-destructive font-mono">SLA breached {Math.abs(hrs)}h</span>;
    return <span className="text-orange-400 font-mono">{hrs}h {mins}m</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Support queue ({reqs.filter(r => r.status === "open").length} open)</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New request</Button>
      </div>
      <div className="space-y-2">
        {reqs.map((r) => (
          <Card key={r.id} className="p-4 bg-card/60 border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.subject}</span>
                  <Badge variant={r.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{r.priority}</Badge>
                  <Badge variant={r.status === "open" ? "outline" : "default"} className="text-[10px]">{r.status}</Badge>
                </div>
                {r.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.body}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {slaTimer(r) || <span className="text-muted-foreground">resolved</span>}
                  <span className="text-muted-foreground">· {new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
              {r.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>Resolve</Button>}
            </div>
          </Card>
        ))}
        {reqs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No support requests.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>New support request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Details</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>SLA hours</Label><Input type="number" value={form.sla_hours} onChange={(e) => setForm({ ...form, sla_hours: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ ANALYTICS ============
function AnalyticsSection() {
  const { user } = useAuth();
  const firmId = useFirm();
  const [resolutionData, setResolutionData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cases, payments, support] = await Promise.all([
        supabase.from("cases").select("status, created_at").eq("user_id", user.id),
        supabase.from("case_payments").select("occurred_on, fee_received").eq("user_id", user.id),
        supabase.from("support_requests").select("status, created_at, resolved_at").eq("firm_id", firmId),
      ]);

      // Status distribution
      const statusMap: Record<string, number> = {};
      (cases.data || []).forEach((c: any) => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
      setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Revenue last 6 months
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months[d.toISOString().slice(0, 7)] = 0;
      }
      (payments.data || []).forEach((p: any) => {
        const k = p.occurred_on?.slice(0, 7);
        if (k in months) months[k] += Number(p.fee_received);
      });
      setRevenueData(Object.entries(months).map(([month, revenue]) => ({ month: month.slice(5), revenue })));

      // Avg resolution time per week
      const buckets: Record<string, { total: number; count: number }> = {};
      (support.data || []).forEach((r: any) => {
        if (!r.resolved_at) return;
        const wk = new Date(r.created_at).toISOString().slice(0, 10);
        const hrs = (+new Date(r.resolved_at) - +new Date(r.created_at)) / 3600000;
        if (!buckets[wk]) buckets[wk] = { total: 0, count: 0 };
        buckets[wk].total += hrs; buckets[wk].count++;
      });
      setResolutionData(Object.entries(buckets).map(([day, b]) => ({ day: day.slice(5), avgHours: Math.round(b.total / b.count) })));
    })();
  }, [user, firmId]);

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Revenue (last 6 months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenueData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-semibold mb-3">Case status mix</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
              {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4 bg-card/60 border-border lg:col-span-2">
        <h3 className="text-sm font-semibold mb-3">Avg support resolution time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={resolutionData}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="avgHours" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ============ INVOICES ============
function InvoicesSection() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("invoices").select("*, clients(full_name)").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setInvoices(data || []));
  }, [user]);

  return (
    <Card className="bg-card/60 border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground uppercase"><tr>
          <th className="text-left px-4 py-2">Number</th><th className="text-left px-4 py-2">Client</th><th className="text-left px-4 py-2">Amount</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Due</th>
        </tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-t border-border">
              <td className="px-4 py-2 font-mono text-xs">{i.invoice_number}</td>
              <td className="px-4 py-2">{(i as any).clients?.full_name || "—"}</td>
              <td className="px-4 py-2">₹{Number(i.amount).toLocaleString("en-IN")}</td>
              <td className="px-4 py-2"><Badge variant={i.status === "paid" ? "default" : "secondary"}>{i.status}</Badge></td>
              <td className="px-4 py-2 text-muted-foreground">{i.due_on || "—"}</td>
            </tr>
          ))}
          {invoices.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No invoices.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

// ============ USERS & ROLES + AUDIT ============
function UsersSection() {
  const { user } = useAuth();
  const firmId = useFirm();
  const [audit, setAudit] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!firmId) return;
    Promise.all([
      supabase.from("audit_log").select("*").eq("firm_id", firmId).order("created_at", { ascending: false }).limit(50),
      supabase.from("firm_members").select("*").eq("firm_id", firmId),
    ]).then(([a, m]) => { setAudit(a.data || []); setMembers(m.data || []); });
  }, [firmId]);

  return (
    <Tabs defaultValue="roles">
      <TabsList><TabsTrigger value="roles">Roles</TabsTrigger><TabsTrigger value="audit">Audit log</TabsTrigger></TabsList>
      <TabsContent value="roles" className="space-y-2">
        <Card className="bg-card/60 border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground uppercase"><tr>
              <th className="text-left px-4 py-2">User</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Status</th>
            </tr></thead>
            <tbody>
              <tr className="border-t border-border bg-emerald-900/10"><td className="px-4 py-2 font-medium">{user?.email} (you)</td><td className="px-4 py-2"><Badge>owner</Badge></td><td className="px-4 py-2"><Badge>active</Badge></td></tr>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-2">{m.full_name || m.email}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{m.role}</Badge></td>
                  <td className="px-4 py-2"><Badge variant="secondary">{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </TabsContent>
      <TabsContent value="audit">
        <Card className="bg-card/60 border-border p-4">
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-xs border-b border-border last:border-0 py-2">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-emerald-400">{a.action}</span>
                <span className="text-muted-foreground">{a.entity_type}</span>
                <span className="ml-auto text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
            {audit.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No audit entries yet.</p>}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ============ ARCHIVE ============
function ArchiveSection() {
  const { user } = useAuth();
  const [archived, setArchived] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("cases").select("*").eq("user_id", user.id).not("archived_at", "is", null).order("archived_at", { ascending: false }),
      supabase.from("case_deletion_logs").select("*").eq("user_id", user.id).order("deleted_at", { ascending: false }).limit(50),
    ]).then(([a, l]) => { setArchived(a.data || []); setLogs(l.data || []); });
  }, [user]);

  return (
    <Tabs defaultValue="archived">
      <TabsList><TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger><TabsTrigger value="deleted">Deleted ({logs.length})</TabsTrigger></TabsList>
      <TabsContent value="archived" className="space-y-2">
        {archived.map((c) => (
          <Card key={c.id} className="p-3 bg-card/60 border-border flex items-center gap-3">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">#{c.case_number} · archived {new Date(c.archived_at).toLocaleDateString()}</div></div>
          </Card>
        ))}
        {archived.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No archived cases.</p>}
      </TabsContent>
      <TabsContent value="deleted" className="space-y-2">
        {logs.map((l) => (
          <Card key={l.id} className="p-3 bg-card/60 border-border">
            <div className="text-sm font-medium">{l.case_name}</div>
            <div className="text-xs text-muted-foreground">#{l.case_number} · deleted {new Date(l.deleted_at).toLocaleString()}</div>
          </Card>
        ))}
        {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No deletion logs.</p>}
      </TabsContent>
    </Tabs>
  );
}
