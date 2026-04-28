import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, IndianRupee } from "lucide-react";

type Entry = {
  id: string;
  fee_quoted: number;
  fee_received: number;
  note: string | null;
  occurred_on: string;
};

export function PaymentTracker({ caseId }: { caseId: string | null }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [quoted, setQuoted] = useState("");
  const [received, setReceived] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!caseId || !user) return setEntries([]);
    const { data } = await supabase
      .from("case_payments")
      .select("id, fee_quoted, fee_received, note, occurred_on")
      .eq("case_id", caseId)
      .order("occurred_on", { ascending: false });
    setEntries((data as any) || []);
  }, [caseId, user]);

  useEffect(() => { load(); }, [load]);

  const totals = entries.reduce(
    (acc, e) => ({ quoted: acc.quoted + Number(e.fee_quoted), received: acc.received + Number(e.fee_received) }),
    { quoted: 0, received: 0 }
  );
  const balance = totals.quoted - totals.received;

  const add = async () => {
    if (!user || !caseId) return;
    const q = Number(quoted) || 0;
    const r = Number(received) || 0;
    if (q === 0 && r === 0) return toast.error("Enter at least one amount");
    const { error } = await supabase.from("case_payments").insert({
      user_id: user.id, case_id: caseId, fee_quoted: q, fee_received: r, note: note || null,
    });
    if (error) return toast.error(error.message);
    setQuoted(""); setReceived(""); setNote("");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("case_payments").delete().eq("id", id);
    load();
  };

  if (!caseId) {
    return <div className="text-sm text-muted-foreground p-2">Select a case to track payments.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Quoted", val: totals.quoted },
          { label: "Received", val: totals.received },
          { label: "Balance", val: balance },
        ].map((s) => (
          <div key={s.label} className="rounded-xl glass p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-base font-bold text-gold flex items-center justify-center gap-0.5">
              <IndianRupee className="h-3.5 w-3.5" />{s.val.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl glass-subtle p-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add entry</div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Quoted (₹)" value={quoted} onChange={(e) => setQuoted(e.target.value)} />
          <Input type="number" placeholder="Received (₹)" value={received} onChange={(e) => setReceived(e.target.value)} />
        </div>
        <Input placeholder="Note (e.g. retainer, hearing fee)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button onClick={add} className="w-full bg-gradient-aurora text-primary-foreground shadow-gold">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="space-y-1.5">
        {entries.length === 0 && <div className="text-xs text-muted-foreground text-center p-4">No payment entries yet.</div>}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg glass-subtle text-xs">
            <div className="flex-1">
              <div className="font-medium">{e.note || "—"}</div>
              <div className="text-muted-foreground">{new Date(e.occurred_on).toLocaleDateString("en-IN")}</div>
            </div>
            <div className="text-right">
              <div className="text-gold">+₹{Number(e.fee_received).toLocaleString("en-IN")}</div>
              <div className="text-muted-foreground">of ₹{Number(e.fee_quoted).toLocaleString("en-IN")}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(e.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}