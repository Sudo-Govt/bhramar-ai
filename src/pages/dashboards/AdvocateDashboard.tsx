import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardShell, NavItem } from "./shared/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, IndianRupee, Calendar as CalendarIcon,
  FolderOpen, Sparkles, Settings, Plus, Trash2, CheckCircle2, Circle,
  Mail, Video, FileText, Clock, AlertCircle, StickyNote, Mic, Phone,
} from "lucide-react";

const nav: NavItem[] = [
  { to: "/dashboard/advocate", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/advocate/cases", label: "Cases", icon: Briefcase },
  { to: "/dashboard/advocate/clients", label: "Clients", icon: Users },
  { to: "/dashboard/advocate/finance", label: "Finance", icon: IndianRupee },
  { to: "/dashboard/advocate/calendar", label: "Calendar & Tasks", icon: CalendarIcon },
  { to: "/dashboard/advocate/notes", label: "Notes", icon: StickyNote },
  { to: "/dashboard/advocate/files", label: "Files & Email", icon: FolderOpen },
  { to: "/dashboard/advocate/assistant", label: "AI Assistant Hub", icon: Sparkles },
  { to: "/dashboard/advocate/calls", label: "Video Calls", icon: Video },
  { to: "/dashboard/advocate/settings", label: "Profile & Settings", icon: Settings },
];

export default function AdvocateDashboard() {
  return (
    <DashboardShell title="Advocate Command Center" subtitle="Your private litigation desk" nav={nav} accent="gold">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="cases" element={<CasesSection />} />
        <Route path="clients" element={<ClientsSection />} />
        <Route path="finance" element={<FinanceSection />} />
        <Route path="calendar" element={<CalendarSection />} />
        <Route path="notes" element={<NotesSection />} />
        <Route path="files" element={<FilesSection />} />
        <Route path="assistant" element={<AssistantSection />} />
        <Route path="calls" element={<CallsSection />} />
        <Route path="settings" element={<SettingsSection />} />
        <Route path="*" element={<Navigate to="/dashboard/advocate" replace />} />
      </Routes>
    </DashboardShell>
  );
}

// ============ OVERVIEW ============
function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ cases: 0, clients: 0, tasksOpen: 0, eventsWeek: 0, invoicesUnpaid: 0, revenue: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
      const [cases, clients, tasks, events, invoices, payments] = await Promise.all([
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("archived_at", null),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "done"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("starts_at", new Date().toISOString()).lte("starts_at", weekAhead.toISOString()),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "paid"),
        supabase.from("case_payments").select("fee_received").eq("user_id", user.id),
      ]);
      const revenue = (payments.data || []).reduce((s, p: any) => s + Number(p.fee_received || 0), 0);
      setStats({
        cases: cases.count || 0, clients: clients.count || 0, tasksOpen: tasks.count || 0,
        eventsWeek: events.count || 0, invoicesUnpaid: invoices.count || 0, revenue,
      });
    })();
  }, [user]);

  const tiles = [
    { label: "Active Cases", value: stats.cases, icon: Briefcase },
    { label: "Clients", value: stats.clients, icon: Users },
    { label: "Open Tasks", value: stats.tasksOpen, icon: CheckCircle2 },
    { label: "Events (7d)", value: stats.eventsWeek, icon: CalendarIcon },
    { label: "Unpaid Invoices", value: stats.invoicesUnpaid, icon: FileText },
    { label: "Revenue (₹)", value: stats.revenue.toLocaleString("en-IN"), icon: IndianRupee },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4 bg-card/60 border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</span>
              <t.icon className="h-4 w-4 text-gold" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{t.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-6 bg-card/60 border-border">
        <h2 className="text-sm font-semibold mb-2 text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to manage cases, clients, finances, calendar, notes, files, and your AI assistant.
          Everything is wired to your private workspace and synced in real time.
        </p>
      </Card>
    </div>
  );
}

// ============ CASES ============
function CasesSection() {
  const { user } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [view, setView] = useState<"table" | "kanban" | "timeline">("table");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("cases").select("*").eq("user_id", user.id).is("archived_at", null).order("created_at", { ascending: false });
    setCases(data || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const stages = ["intake", "discovery", "filing", "hearing", "judgment"];
  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => navigate("/app")}><Plus className="h-4 w-4 mr-1" /> New case (in chat)</Button>
      </div>

      {view === "table" && (
        <Card className="bg-card/60 border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left px-4 py-2">Case</th>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-left px-4 py-2">Stage</th>
                <th className="text-left px-4 py-2">Priority</th>
                <th className="text-left px-4 py-2">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const dl = c.deadline ? new Date(c.deadline) : null;
                const days = dl ? Math.ceil((+dl - +today) / 86400000) : null;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">#{c.case_number}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.client_name || "—"}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{c.stage || "intake"}</Badge></td>
                    <td className="px-4 py-2"><Badge variant={c.priority === "high" ? "destructive" : "secondary"}>{c.priority || "medium"}</Badge></td>
                    <td className="px-4 py-2">
                      {dl ? (
                        <span className={days! < 0 ? "text-destructive" : days! < 7 ? "text-orange-400" : "text-muted-foreground"}>
                          {dl.toLocaleDateString()} ({days! >= 0 ? `${days}d` : `${-days!}d ago`})
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
              {cases.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No cases yet. Create one from the AI chat.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {view === "kanban" && (
        <div className="grid grid-cols-5 gap-3">
          {stages.map((s) => (
            <Card key={s} className="p-3 bg-card/60 border-border min-h-[300px]">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{s}</div>
              <div className="space-y-2">
                {cases.filter((c) => (c.stage || "intake") === s).map((c) => (
                  <div key={c.id} className="p-2 rounded border border-border bg-background/40 text-xs">
                    <div className="font-medium text-foreground truncate">{c.name}</div>
                    <div className="text-muted-foreground truncate">{c.client_name || "—"}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {view === "timeline" && (
        <div className="space-y-2">
          {cases.filter(c => c.deadline).sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline)).map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded border border-border bg-card/60">
              <Clock className="h-4 w-4 text-gold" />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.client_name} · {new Date(c.deadline).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
          {cases.filter(c => c.deadline).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No deadlines set on cases.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============ CLIENTS ============
function ClientsSection() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", address: "", notes: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setClients(data || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.full_name) return toast.error("Name required");
    const { error } = await supabase.from("clients").insert({ ...form, user_id: user!.id });
    if (error) return toast.error(error.message);
    setOpen(false); setForm({ full_name: "", email: "", phone: "", address: "", notes: "" }); load(); toast.success("Client added");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete client?")) return;
    await supabase.from("clients").delete().eq("id", id); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Clients ({clients.length})</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add client</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {clients.map((c) => (
          <Card key={c.id} className="p-4 bg-card/60 border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold/30 to-primary/30 flex items-center justify-center text-sm font-semibold">
                  {c.full_name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground">{c.email || c.phone || "—"}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            {c.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{c.notes}</p>}
          </Card>
        ))}
        {clients.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No clients yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button onClick={create}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ FINANCE ============
function FinanceSection() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invOpen, setInvOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [invForm, setInvForm] = useState({ invoice_number: "", amount: "", due_on: "", notes: "" });
  const [feeForm, setFeeForm] = useState({ service_name: "", rate: "", unit: "flat", description: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const [i, f, p] = await Promise.all([
      supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("fees").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("case_payments").select("*").eq("user_id", user.id).order("occurred_on", { ascending: false }).limit(20),
    ]);
    setInvoices(i.data || []); setFees(f.data || []); setPayments(p.data || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const totalEarned = payments.reduce((s, p) => s + Number(p.fee_received || 0), 0);
  const totalUnpaid = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount || 0), 0);

  const createInvoice = async () => {
    if (!invForm.invoice_number || !invForm.amount) return toast.error("Number and amount required");
    const { error } = await supabase.from("invoices").insert({
      user_id: user!.id,
      invoice_number: invForm.invoice_number,
      amount: Number(invForm.amount),
      due_on: invForm.due_on || null,
      notes: invForm.notes || null,
    });
    if (error) return toast.error(error.message);
    setInvOpen(false); setInvForm({ invoice_number: "", amount: "", due_on: "", notes: "" }); load();
  };
  const createFee = async () => {
    if (!feeForm.service_name) return toast.error("Service name required");
    const { error } = await supabase.from("fees").insert({
      user_id: user!.id,
      service_name: feeForm.service_name,
      rate: Number(feeForm.rate || 0),
      unit: feeForm.unit,
      description: feeForm.description || null,
    });
    if (error) return toast.error(error.message);
    setFeeOpen(false); setFeeForm({ service_name: "", rate: "", unit: "flat", description: "" }); load();
  };
  const markPaid = async (id: string) => {
    await supabase.from("invoices").update({ status: "paid", paid_on: new Date().toISOString().slice(0, 10) }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 bg-card/60 border-border"><div className="text-xs text-muted-foreground uppercase">Total Earned</div><div className="text-2xl font-semibold text-foreground">₹{totalEarned.toLocaleString("en-IN")}</div></Card>
        <Card className="p-4 bg-card/60 border-border"><div className="text-xs text-muted-foreground uppercase">Outstanding</div><div className="text-2xl font-semibold text-orange-400">₹{totalUnpaid.toLocaleString("en-IN")}</div></Card>
        <Card className="p-4 bg-card/60 border-border"><div className="text-xs text-muted-foreground uppercase">Invoices</div><div className="text-2xl font-semibold text-foreground">{invoices.length}</div></Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="fees">Fee schedule</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="space-y-3">
          <Button size="sm" onClick={() => setInvOpen(true)}><Plus className="h-4 w-4 mr-1" /> New invoice</Button>
          <Card className="bg-card/60 border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground uppercase"><tr>
                <th className="text-left px-4 py-2">Number</th><th className="text-left px-4 py-2">Amount</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Due</th><th></th>
              </tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{i.invoice_number}</td>
                    <td className="px-4 py-2">₹{Number(i.amount).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2"><Badge variant={i.status === "paid" ? "default" : "secondary"}>{i.status}</Badge></td>
                    <td className="px-4 py-2 text-muted-foreground">{i.due_on || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {i.status !== "paid" && <Button size="sm" variant="outline" onClick={() => markPaid(i.id)}>Mark paid</Button>}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No invoices yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>
        <TabsContent value="fees" className="space-y-3">
          <Button size="sm" onClick={() => setFeeOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add service</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fees.map((f) => (
              <Card key={f.id} className="p-4 bg-card/60 border-border">
                <div className="flex items-center justify-between"><div className="font-medium text-foreground">{f.service_name}</div><div className="text-gold font-semibold">₹{Number(f.rate).toLocaleString("en-IN")}<span className="text-xs text-muted-foreground">/{f.unit}</span></div></div>
                {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
              </Card>
            ))}
            {fees.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No fee schedule defined.</p>}
          </div>
        </TabsContent>
        <TabsContent value="payments">
          <Card className="bg-card/60 border-border p-4">
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                  <span className="text-muted-foreground">{p.occurred_on}</span>
                  <span className="font-medium">₹{Number(p.fee_received).toLocaleString("en-IN")}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-xs">{p.note}</span>
                </div>
              ))}
              {payments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No payments tracked.</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent><DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Invoice number</Label><Input value={invForm.invoice_number} onChange={(e) => setInvForm({ ...invForm, invoice_number: e.target.value })} /></div>
            <div><Label>Amount (₹)</Label><Input type="number" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={invForm.due_on} onChange={(e) => setInvForm({ ...invForm, due_on: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={createInvoice}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogContent><DialogHeader><DialogTitle>New service / fee</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Service name</Label><Input value={feeForm.service_name} onChange={(e) => setFeeForm({ ...feeForm, service_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rate (₹)</Label><Input type="number" value={feeForm.rate} onChange={(e) => setFeeForm({ ...feeForm, rate: e.target.value })} /></div>
              <div><Label>Unit</Label>
                <Select value={feeForm.unit} onValueChange={(v) => setFeeForm({ ...feeForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="hour">Per hour</SelectItem>
                    <SelectItem value="hearing">Per hearing</SelectItem>
                    <SelectItem value="month">Per month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={createFee}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ CALENDAR + TASKS ============
function CalendarSection() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [evtOpen, setEvtOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [evtForm, setEvtForm] = useState({ title: "", starts_at: "", location: "", kind: "meeting" });
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "medium" });

  const load = useCallback(async () => {
    if (!user) return;
    const [e, t] = await Promise.all([
      supabase.from("events").select("*").eq("user_id", user.id).order("starts_at", { ascending: true }),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    setEvents(e.data || []); setTasks(t.data || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const createEvent = async () => {
    if (!evtForm.title || !evtForm.starts_at) return toast.error("Title and time required");
    await supabase.from("events").insert({ ...evtForm, starts_at: new Date(evtForm.starts_at).toISOString(), user_id: user!.id });
    setEvtOpen(false); setEvtForm({ title: "", starts_at: "", location: "", kind: "meeting" }); load();
  };
  const createTask = async () => {
    if (!taskForm.title) return toast.error("Title required");
    await supabase.from("tasks").insert({ ...taskForm, due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null, user_id: user!.id });
    setTaskOpen(false); setTaskForm({ title: "", due_date: "", priority: "medium" }); load();
  };
  const toggleTask = async (t: any) => {
    const newStatus = t.status === "done" ? "todo" : "done";
    await supabase.from("tasks").update({ status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 bg-card/60 border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Upcoming events</h3>
          <Button size="sm" onClick={() => setEvtOpen(true)}><Plus className="h-4 w-4 mr-1" /> Event</Button>
        </div>
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="p-2 rounded border border-border flex items-start gap-3">
              <CalendarIcon className="h-4 w-4 text-gold mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()} {e.location && `· ${e.location}`}</div>
              </div>
              <Badge variant="outline" className="text-[10px]">{e.kind}</Badge>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No events.</p>}
        </div>
      </Card>

      <Card className="p-4 bg-card/60 border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Tasks</h3>
          <Button size="sm" onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4 mr-1" /> Task</Button>
        </div>
        <div className="space-y-1">
          {tasks.map((t) => (
            <button key={t.id} onClick={() => toggleTask(t)} className="w-full p-2 rounded border border-border flex items-start gap-3 hover:bg-accent/30 text-left">
              {t.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" /> : <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                {t.due_date && <div className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString()}</div>}
              </div>
              <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{t.priority}</Badge>
            </button>
          ))}
          {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tasks.</p>}
        </div>
      </Card>

      <Dialog open={evtOpen} onOpenChange={setEvtOpen}>
        <DialogContent><DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={evtForm.title} onChange={(e) => setEvtForm({ ...evtForm, title: e.target.value })} /></div>
            <div><Label>When</Label><Input type="datetime-local" value={evtForm.starts_at} onChange={(e) => setEvtForm({ ...evtForm, starts_at: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={evtForm.location} onChange={(e) => setEvtForm({ ...evtForm, location: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={evtForm.kind} onValueChange={(v) => setEvtForm({ ...evtForm, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Client meeting</SelectItem>
                  <SelectItem value="hearing">Court hearing</SelectItem>
                  <SelectItem value="filing">Filing deadline</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={createEvent}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent><DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} /></div>
            <div><Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={createTask}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ NOTES ============
function NotesSection() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("notes").select("*, cases(name)").eq("user_id", user.id).order("updated_at", { ascending: false });
    setNotes(data || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Saved notes ({notes.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {notes.map((n) => (
          <Card key={n.id} className="p-4 bg-card/60 border-border">
            <div className="text-xs text-gold mb-1">{(n as any).cases?.name || "—"}</div>
            <p className="text-sm whitespace-pre-wrap line-clamp-6 text-foreground">{n.body || "(empty)"}</p>
            <div className="text-[10px] text-muted-foreground mt-2">Updated {new Date(n.updated_at).toLocaleString()}</div>
          </Card>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No notes saved. Notes are written from inside each case in the chat.</p>}
      </div>
    </div>
  );
}

// ============ FILES + EMAIL/SMTP ============
function FilesSection() {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [smtp, setSmtp] = useState<any>(null);
  const [smtpForm, setSmtpForm] = useState({ host: "", port: "587", username: "", password_encrypted: "", from_email: "", from_name: "", use_tls: true });

  const load = useCallback(async () => {
    if (!user) return;
    const [f, s] = await Promise.all([
      supabase.from("files").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("smtp_configs").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setFiles(f.data || []);
    if (s.data) { setSmtp(s.data); setSmtpForm({ ...s.data, port: String(s.data.port) }); }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const saveSmtp = async () => {
    if (!smtpForm.host || !smtpForm.from_email) return toast.error("Host and from-email required");
    const payload = { ...smtpForm, port: Number(smtpForm.port), user_id: user!.id };
    const { error } = await supabase.from("smtp_configs").upsert(payload, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("SMTP saved"); load();
  };

  const sendTestEmail = async () => {
    if (!smtp) return toast.error("Save SMTP first");
    const to = prompt("Send test email to:", smtpForm.from_email);
    if (!to) return;
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        subject: "Bhramar SMTP test",
        html: "<p>Your Bhramar SMTP is working. ✅</p>",
        text: "Your Bhramar SMTP is working.",
      },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error!.message);
    toast.success("Test email sent");
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("client-files").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    await supabase.from("files").insert({ user_id: user.id, name: file.name, kind: "file", storage_path: path, size_bytes: file.size, mime_type: file.type });
    toast.success("Uploaded"); load();
  };

  return (
    <Tabs defaultValue="files">
      <TabsList>
        <TabsTrigger value="files">Files & folders</TabsTrigger>
        <TabsTrigger value="smtp">Email (SMTP)</TabsTrigger>
      </TabsList>
      <TabsContent value="files" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">My files</h3>
          <label>
            <input type="file" className="hidden" onChange={upload} />
            <Button size="sm" asChild><span><Plus className="h-4 w-4 mr-1" /> Upload</span></Button>
          </label>
        </div>
        <Card className="bg-card/60 border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground uppercase"><tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Size</th><th className="text-left px-4 py-2">Uploaded</th></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-2 flex items-center gap-2"><FolderOpen className="h-4 w-4 text-gold" />{f.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {files.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">No files.</td></tr>}
            </tbody>
          </table>
        </Card>
      </TabsContent>
      <TabsContent value="smtp" className="space-y-3">
        <Card className="p-4 bg-card/60 border-border space-y-3 max-w-xl">
          <div className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4 text-gold" /> SMTP configuration</div>
          <p className="text-xs text-muted-foreground">Outbound email credentials are stored privately. Sending is invoked via secure backend function.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Host</Label><Input value={smtpForm.host} onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })} placeholder="smtp.gmail.com" /></div>
            <div><Label>Port</Label><Input value={smtpForm.port} onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })} /></div>
            <div><Label>Username</Label><Input value={smtpForm.username} onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={smtpForm.password_encrypted} onChange={(e) => setSmtpForm({ ...smtpForm, password_encrypted: e.target.value })} /></div>
            <div><Label>From email</Label><Input value={smtpForm.from_email} onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })} /></div>
            <div><Label>From name</Label><Input value={smtpForm.from_name || ""} onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSmtp} size="sm">Save SMTP</Button>
            <Button onClick={sendTestEmail} size="sm" variant="outline" disabled={!smtp}>Send test email</Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ============ AI ASSISTANT HUB ============
function AssistantSection() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ docs: 0, notes: 0, clients: 0, recordings: 0 });
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [d, n, c, r] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("video_recordings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setCounts({ docs: d.count || 0, notes: n.count || 0, clients: c.count || 0, recordings: r.count || 0 });
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-gold/10 via-card to-card border-gold/30">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-gold" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Personal Assistant Hub</h2>
            <p className="text-sm text-muted-foreground mt-1">Bhramar reads everything in your workspace — uploads, notes, client records, and meeting transcripts — to answer questions in your AI chat with full context.</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-5">
          <div className="text-center"><div className="text-2xl font-semibold text-gold">{counts.docs}</div><div className="text-xs text-muted-foreground">Documents indexed</div></div>
          <div className="text-center"><div className="text-2xl font-semibold text-gold">{counts.notes}</div><div className="text-xs text-muted-foreground">Notes</div></div>
          <div className="text-center"><div className="text-2xl font-semibold text-gold">{counts.clients}</div><div className="text-xs text-muted-foreground">Client profiles</div></div>
          <div className="text-center"><div className="text-2xl font-semibold text-gold">{counts.recordings}</div><div className="text-xs text-muted-foreground">Call recordings</div></div>
        </div>
      </Card>
      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-semibold mb-2">Ask the Assistant</h3>
        <p className="text-xs text-muted-foreground mb-3">The full AI chat lives in the main app. Open it to ask questions over all your case data.</p>
        <a href="/app"><Button size="sm">Open AI chat</Button></a>
      </Card>
    </div>
  );
}

// ============ VIDEO CALLS ============
function CallsSection() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [r, c] = await Promise.all([
        supabase.from("video_recordings").select("*, clients(full_name)").eq("user_id", user.id).order("recorded_at", { ascending: false }),
        supabase.from("clients").select("id, full_name").eq("user_id", user.id),
      ]);
      setRecordings(r.data || []); setClients(c.data || []);
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card/60 border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Video className="h-5 w-5 text-gold" /> In-app video calls</h2>
            <p className="text-sm text-muted-foreground mt-1">Start a video call with any client. Recordings auto-save to that client's folder for the AI to summarize.</p>
          </div>
          <Button onClick={() => setCallOpen(true)}><Video className="h-4 w-4 mr-1" /> Start call</Button>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-2">Recordings ({recordings.length})</h3>
        <div className="space-y-2">
          {recordings.map((r) => (
            <Card key={r.id} className="p-3 bg-card/60 border-border flex items-center gap-3">
              <Mic className="h-4 w-4 text-gold" />
              <div className="flex-1">
                <div className="text-sm font-medium">{(r as any).clients?.full_name || "Unknown client"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleString()} {r.duration_seconds && `· ${Math.round(r.duration_seconds / 60)} min`}</div>
              </div>
            </Card>
          ))}
          {recordings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recordings yet.</p>}
        </div>
      </div>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start a video call</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Browser-native WebRTC calls open in a dedicated window. Recordings are encrypted and uploaded to your private storage.</p>
          <div className="space-y-3">
            <div><Label>Client</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { toast.info("Call infrastructure being provisioned — will activate in next release."); setCallOpen(false); }}>
              <Phone className="h-4 w-4 mr-1" /> Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SETTINGS ============
function SettingsSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-6 bg-card/60 border-border">
        <h3 className="text-sm font-semibold mb-3">Profile</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{profile?.full_name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><Badge>{profile?.subscription_tier || "Free"}</Badge></div>
        </div>
        <div className="mt-4">
          <a href="/profile"><Button variant="outline" size="sm">Open full profile</Button></a>
        </div>
      </Card>
    </div>
  );
}
