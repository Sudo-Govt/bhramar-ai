import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, X, FileText, Image as ImageIcon, Mic, Video } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (caseId: string) => void;
};

function fileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("audio/")) return Mic;
  if (type.startsWith("video/")) return Video;
  return FileText;
}

export function CreateCaseDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [complaint, setComplaint] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(""); setClientName(""); setComplaint(""); setFiles([]);
  };

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Case name required");
    setBusy(true);
    try {
      const { data: caseRow, error: caseErr } = await supabase
        .from("cases")
        .insert({
          user_id: user.id,
          name: name.trim(),
          client_name: clientName.trim() || null,
          complaint: complaint.trim() || null,
          status: "Active",
        })
        .select()
        .single();
      if (caseErr) throw caseErr;

      // Upload each file & create document rows (AI summary stub)
      for (const f of files) {
        const path = `${user.id}/${caseRow.id}/${Date.now()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("case-documents").upload(path, f);
        if (upErr) { toast.error(`Failed to upload ${f.name}`); continue; }
        await supabase.from("documents").insert({
          user_id: user.id,
          case_id: caseRow.id,
          filename: f.name,
          storage_path: path,
          mime_type: f.type,
          size_bytes: f.size,
          ai_summary: "Queued for AI analysis…",
        });
      }

      // Generate AI summary of complaint via chat fn (best-effort)
      if (complaint.trim()) {
        try {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({
              messages: [{
                role: "user",
                content: `Summarise the following client complaint in 4-6 bullet points, identify likely IPC/CrPC sections at play, and list immediate next legal steps.\n\nClient: ${clientName || "Unknown"}\nMatter: ${name}\n\nComplaint:\n${complaint}`,
              }],
            }),
          });
          if (resp.ok && resp.body) {
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = "", text = "";
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let idx;
              while ((idx = buf.indexOf("\n")) !== -1) {
                let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) continue;
                const d = line.slice(6).trim();
                if (!d || d === "[DONE]") continue;
                try {
                  const j = JSON.parse(d);
                  const delta = j.choices?.[0]?.delta?.content;
                  if (delta) text += delta;
                } catch {}
              }
            }
            if (text) {
              await supabase.from("cases").update({ ai_summary: text }).eq("id", caseRow.id);
            }
          }
        } catch (e) {
          console.error("AI summary failed", e);
        }
      }

      toast.success(`Case ${caseRow.case_number || ""} created`);
      reset();
      onCreated(caseRow.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create case");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="glass-strong border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gradient-aurora">New Case</DialogTitle>
          <DialogDescription>
            Bhramar will assign a unique tracking number and analyse every piece of evidence you provide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Case name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bail Application — Sharma vs State" />
          </div>
          <div className="space-y-2">
            <Label>Client name</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Complaint / case details</Label>
            <Textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Describe what happened, dates, parties, FIR/section numbers if known…"
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Evidence — documents, images, audio, video, records</Label>
            <label className="block">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files || []);
                  setFiles((prev) => [...prev, ...list]);
                  e.currentTarget.value = "";
                }}
              />
              <div className="glass border-2 border-dashed border-gold/40 rounded-2xl p-6 text-center hover:bg-gold/5 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 text-gold mx-auto mb-2" />
                <div className="text-sm font-medium">Click to attach evidence</div>
                <div className="text-xs text-muted-foreground mt-1">PDF · DOCX · JPG · PNG · MP3 · MP4 — multiple files allowed</div>
              </div>
            </label>

            {files.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {files.map((f, i) => {
                  const Icon = fileIcon(f.type);
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-subtle">
                      <Icon className="h-4 w-4 text-gold shrink-0" />
                      <span className="text-sm flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-gradient-aurora text-primary-foreground shadow-gold">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating & analysing…</> : "Create case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}