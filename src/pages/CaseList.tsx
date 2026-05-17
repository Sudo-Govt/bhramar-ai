import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Briefcase, AlertCircle, ArrowLeft } from "lucide-react";

const STAGES = ["FIR Filed","Under Investigation","Charge Sheet Filed","Bail Application","Cognizance","Charges Framed","Trial","Evidence Recording","Arguments","Judgment","Appeal","Revision","Execution","Closed"];

export default function CaseList() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ case_title: "", case_type: "Criminal", current_stage: "FIR Filed", court: "", primary_act: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("case_files").select("*").eq("advocate_id", user.id).order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!form.case_title.trim()) return toast.error("Case title required");
    const { data, error } = await supabase.from("case_files").insert({ ...form, advocate_id: user!.id }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Case file created");
    setOpen(false);
    nav(`/case/${data.id}`);
  };

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Bhramar Case Files</h1>
            <p className="text-sm text-muted-foreground">Your AI-powered case copilots</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Case</Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No case files yet. Create your first to start using Bhramar Copilot.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Case</Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(c => {
            const days = c.next_date ? Math.ceil((new Date(c.next_date).getTime() - Date.now()) / 86400000) : null;
            const urgent = days !== null && days <= 7 && days >= 0;
            return (
              <Link key={c.id} to={`/case/${c.id}`} className="group">
                <Card className="p-4 hover:border-primary/50 transition-all h-full">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px]">{c.current_stage}</Badge>
                    {urgent && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-1" /> {days}d</Badge>}
                  </div>
                  <h3 className="font-semibold leading-tight mb-1 group-hover:text-primary transition-colors">{c.case_title}</h3>
                  <p className="text-xs text-muted-foreground">{c.case_number || "No case number"}{c.court ? ` · ${c.court}` : ""}</p>
                  {c.next_date && <p className="text-xs mt-2">Next: <span className="font-medium">{new Date(c.next_date).toLocaleDateString("en-IN")}</span> {c.next_date_purpose && `— ${c.next_date_purpose}`}</p>}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Case File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Case Title *</Label><Input value={form.case_title} onChange={e => setForm({ ...form, case_title: e.target.value })} placeholder="State v. Ramesh Kumar" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Case Type</Label>
                <Select value={form.case_type} onValueChange={v => setForm({ ...form, case_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Criminal","Civil","Constitutional","Family","Labour","Tax","Corporate","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Stage</Label>
                <Select value={form.current_stage} onValueChange={v => setForm({ ...form, current_stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Court</Label><Input value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} placeholder="District Court, Bengaluru" /></div>
            <div><Label>Primary Act</Label><Input value={form.primary_act} onChange={e => setForm({ ...form, primary_act: e.target.value })} placeholder="BNS / IPC / NI Act…" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
