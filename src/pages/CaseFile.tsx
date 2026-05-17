import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MiniMarkdown } from "@/lib/markdown";
import { ArrowLeft, Send, Plus, Trash2, Bot, User as UserIcon, Sparkles, Save, AlertCircle, Mic } from "lucide-react";
import emblem from "@/assets/bhramar-emblem.png";
import { ListenerMode } from "@/components/ListenerMode";
import { AutoSyncToggle } from "@/components/AutoSyncToggle";
import { getAutoSync, extractCaseData, createAutoCase, syncToCase } from "@/hooks/useAutoSync";

const STAGES = ["FIR Filed","Under Investigation","Charge Sheet Filed","Bail Application","Cognizance","Charges Framed","Trial","Evidence Recording","Arguments","Judgment","Appeal","Revision","Execution","Closed"];

export default function CaseFile() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const nav = useNavigate();
  const [caseRow, setCaseRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId || !user) return;
    (async () => {
      const { data } = await supabase.from("case_files").select("*").eq("id", caseId).maybeSingle();
      if (!data) { toast.error("Case not found"); nav("/cases"); return; }
      setCaseRow(data);
      setLoading(false);
    })();
  }, [caseId, user]);

  if (loading || !caseRow) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  const daysLeft = caseRow.next_date ? Math.ceil((new Date(caseRow.next_date).getTime() - Date.now()) / 86400000) : null;
  const urgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/cases"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{caseRow.case_title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">{caseRow.current_stage}</Badge>
              {caseRow.case_number && <span>{caseRow.case_number}</span>}
              {caseRow.next_date && (
                <span className={urgent ? "text-destructive font-semibold" : ""}>
                  Next: {new Date(caseRow.next_date).toLocaleDateString("en-IN")}
                  {urgent && ` (${daysLeft}d)`}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4">
            <TabsList className="bg-transparent">
              <TabsTrigger value="chat"><Bot className="h-4 w-4 mr-1.5" /> Bhramar Chat</TabsTrigger>
              <TabsTrigger value="file">Case File</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="chat" className="flex-1 m-0">
          <ChatPanel caseId={caseId!} caseRow={caseRow} />
        </TabsContent>
        <TabsContent value="file" className="flex-1 m-0 overflow-y-auto">
          <FilePanel caseRow={caseRow} setCaseRow={setCaseRow} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ CHAT PANEL ============
function ChatPanel({ caseId, caseRow }: { caseId: string; caseRow: any }) {
  const { user } = useAuth();
  const [sessionType, setSessionType] = useState<'advocate' | 'client'>('advocate');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [listenerOpen, setListenerOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: cl } = await supabase.from("case_clients").select("id, name").eq("case_id", caseId);
      setClients(cl || []);
      if (cl?.[0]) setActiveClient(cl[0].id);
    })();
  }, [caseId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bhramar_chats")
        .select("role, content")
        .eq("case_id", caseId)
        .eq("session_type", sessionType)
        .order("created_at");
      setMessages(data || []);
    })();
  }, [caseId, sessionType]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);

    // Optimistically add user message and empty assistant slot
    setMessages(p => [...p, { role: "user", content: msg }, { role: "assistant", content: "" }]);

    let aiResponseText = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bhramar-copilot`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          case_id: caseId,
          message: msg,
          session_type: sessionType,
          client_id: activeClient,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(err.error || "Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const p = t.slice(5).trim();
          if (p === "[DONE]") continue;
          try {
            const obj = JSON.parse(p);
            const delta = obj?.choices?.[0]?.delta?.content;
            if (delta) {
              aiResponseText += delta;
              setMessages(prev => {
                const c = [...prev];
                c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + delta };
                return c;
              });
            }
          } catch { /* skip malformed chunks */ }
        }
      }

      // ── AUTO SYNC ─────────────────────────────────────────────
      // Only runs if the toggle is ON and we have a user
      if (getAutoSync() && user && aiResponseText) {
        try {
          const { data: { session: sess } } = await supabase.auth.getSession();
          const token = sess?.access_token || "";
          const extracted = await extractCaseData(
            msg + "\n" + aiResponseText,
            token,
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
          );
          if (extracted && (extracted.financials.length > 0 || extracted.deadlines.length > 0)) {
            // Case is already open — silently sync new data into it
            await syncToCase(caseId, user.id, msg, aiResponseText, extracted);
          }
        } catch {
          // Auto Sync errors are non-fatal — never break the chat
        }
      }
      // ─────────────────────────────────────────────────────────

    } catch (e: any) {
      setMessages(p => {
        const c = [...p];
        c[c.length - 1] = { role: "assistant", content: `⚠️ ${e.message}` };
        return c;
      });
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const isAdv = sessionType === 'advocate';
  const quickActions = [
    "Draft a bail application for this case",
    "List all applicable BNS / BNSS sections",
    "Analyse strengths and weaknesses of the defence",
    "What deadlines do I need to track?",
    "Summarise everything in this file",
  ];

  return (
    <div className={`flex flex-col h-[calc(100vh-130px)] ${isAdv ? "bg-background" : "bg-amber-50/30 dark:bg-amber-950/10"}`}>

      {/* ── Top bar ── */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <img src={emblem} alt="" className="h-6 w-6" />
          <span className="text-sm font-medium">Bhramar AI</span>
          <Badge variant={isAdv ? "default" : "secondary"} className="text-[10px]">
            {isAdv ? "ADVOCATE MODE" : "CLIENT MODE"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {clients.length > 0 && (
            <Select value={activeClient || ""} onValueChange={setActiveClient}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="No client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {/* 🎙️ Listener Mode button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setListenerOpen(true)}
            className="h-8 gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10"
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="text-xs">Listener</span>
          </Button>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={!isAdv ? "font-semibold" : "text-muted-foreground"}>Client</span>
            <Switch checked={isAdv} onCheckedChange={(v) => setSessionType(v ? 'advocate' : 'client')} />
            <span className={isAdv ? "font-semibold" : "text-muted-foreground"}>Advocate</span>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <img src={emblem} alt="Bhramar" className="h-20 w-20 mb-4 opacity-80" />
              <h2 className="text-lg font-semibold mb-1">Bhramar Copilot</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                {isAdv
                  ? "Your AI co-counsel. Ask anything about this case — strategy, drafting, research."
                  : "Your confidential legal helper. Ask me anything about your case, your rights, or what happens next."}
              </p>
              {!isAdv && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Your conversation is confidential and protected.
                </p>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary/20" : "bg-muted"}`}>
                {m.role === "user"
                  ? <UserIcon className="h-4 w-4" />
                  : <img src={emblem} alt="" className="h-5 w-5" />
                }
              </div>
              <Card className={`p-3 max-w-[80%] ${m.role === "user" ? "bg-primary/10 border-primary/30" : ""}`}>
                {m.role === "assistant" && !m.content ? (
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.3s]" />
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MiniMarkdown text={m.content} />
                  </div>
                )}
              </Card>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-border p-3 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto space-y-2">
          {isAdv && messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-accent transition-colors"
                >
                  <Sparkles className="h-3 w-3 inline mr-1" />{q}
                </button>
              ))}
            </div>
          )}
          {/* Row with Auto Sync toggle + textarea + send */}
          <div className="flex items-center gap-2 mb-1">
            <AutoSyncToggle />
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isAdv ? "Ask Bhramar anything about this case…" : "Ask about your case, your rights, what's next…"}
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={busy}
            />
            <Button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Listener Mode dialog ── */}
      <Dialog open={listenerOpen} onOpenChange={setListenerOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Listener Mode</DialogTitle>
          </DialogHeader>
          <ListenerMode
            caseId={caseId}
            onClose={() => setListenerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ FILE PANEL ============
function FilePanel({ caseRow, setCaseRow }: { caseRow: any; setCaseRow: (r: any) => void }) {
  const [form, setForm] = useState<any>(caseRow);
  const [dirty, setDirty] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [hearings, setHearings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newHearing, setNewHearing] = useState<any>({
    hearing_date: new Date().toISOString().slice(0, 10),
    what_happened: "",
    order_passed: "",
  });
  const [newClient, setNewClient] = useState<any>({
    name: "",
    relationship_to_case: "Accused",
    preferred_language: "en",
  });

  const loadAll = async () => {
    const [c, n, h, d] = await Promise.all([
      supabase.from("case_clients").select("*").eq("case_id", caseRow.id),
      supabase.from("case_notes").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
      supabase.from("case_hearings").select("*").eq("case_id", caseRow.id).order("hearing_date", { ascending: false }),
      supabase.from("case_documents").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
    ]);
    setClients(c.data || []);
    setNotes(n.data || []);
    setHearings(h.data || []);
    setDocuments(d.data || []);
  };

  useEffect(() => { loadAll(); }, [caseRow.id]);

  const update = (k: string, v: any) => { setForm({ ...form, [k]: v }); setDirty(true); };

  const save = async () => {
    const { error } = await supabase.from("case_files").update(form).eq("id", caseRow.id);
    if (error) return toast.error(error.message);
    setCaseRow(form);
    setDirty(false);
    toast.success("Saved");
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data } = await supabase
      .from("case_notes")
      .insert({ case_id: caseRow.id, note_text: newNote })
      .select()
      .single();
    if (data) { setNotes([data, ...notes]); setNewNote(""); }
  };

  const addHearing = async () => {
    const { data } = await supabase
      .from("case_hearings")
      .insert({ case_id: caseRow.id, ...newHearing })
      .select()
      .single();
    if (data) {
      setHearings([data, ...hearings]);
      setNewHearing({ hearing_date: new Date().toISOString().slice(0, 10), what_happened: "", order_passed: "" });
    }
  };

  const addClient = async () => {
    if (!newClient.name.trim()) return toast.error("Client name required");
    const { data } = await supabase
      .from("case_clients")
      .insert({ case_id: caseRow.id, ...newClient })
      .select()
      .single();
    if (data) {
      setClients([...clients, data]);
      setNewClient({ name: "", relationship_to_case: "Accused", preferred_language: "en" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4 pb-20">
      {dirty && (
        <div className="sticky top-0 z-10 bg-amber-500/10 border border-amber-500/40 rounded-lg p-2 flex items-center justify-between">
          <span className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" /> Unsaved changes
          </span>
          <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1.5" /> Save</Button>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["details", "facts"]}>
        <AccordionItem value="details">
          <AccordionTrigger>Case Details</AccordionTrigger>
          <AccordionContent>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Title *"><Input value={form.case_title || ""} onChange={e => update("case_title", e.target.value)} /></Field>
              <Field label="Case Number"><Input value={form.case_number || ""} onChange={e => update("case_number", e.target.value)} /></Field>
              <Field label="Court"><Input value={form.court || ""} onChange={e => update("court", e.target.value)} /></Field>
              <Field label="Judge"><Input value={form.judge || ""} onChange={e => update("judge", e.target.value)} /></Field>
              <Field label="Case Type">
                <Select value={form.case_type} onValueChange={v => update("case_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Criminal","Civil","Constitutional","Family","Labour","Tax","Corporate","Other"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Stage">
                <Select value={form.current_stage} onValueChange={v => update("current_stage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary Act"><Input value={form.primary_act || ""} onChange={e => update("primary_act", e.target.value)} placeholder="BNS / IPC / NI Act…" /></Field>
              <Field label="Sections Charged (comma)">
                <Input
                  value={(form.sections_charged || []).join(", ")}
                  onChange={e => update("sections_charged", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                />
              </Field>
              <Field label="Next Hearing Date">
                <Input
                  type="date"
                  value={form.next_date ? form.next_date.slice(0, 10) : ""}
                  onChange={e => update("next_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </Field>
              <Field label="Next Hearing Purpose"><Input value={form.next_date_purpose || ""} onChange={e => update("next_date_purpose", e.target.value)} /></Field>
              <Field label="Date of FIR">
                <Input
                  type="date"
                  value={form.date_of_fir ? form.date_of_fir.slice(0, 10) : ""}
                  onChange={e => update("date_of_fir", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </Field>
              <Field label="Date of Arrest">
                <Input
                  type="date"
                  value={form.date_of_arrest ? form.date_of_arrest.slice(0, 10) : ""}
                  onChange={e => update("date_of_arrest", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </Field>
              <Field label="Police Station"><Input value={form.police_station || ""} onChange={e => update("police_station", e.target.value)} /></Field>
              <Field label="IO Name"><Input value={form.io_name || ""} onChange={e => update("io_name", e.target.value)} /></Field>
              <Field label="Public Prosecutor"><Input value={form.pp_name || ""} onChange={e => update("pp_name", e.target.value)} /></Field>
              <Field label="Opposing Counsel"><Input value={form.opposing_counsel || ""} onChange={e => update("opposing_counsel", e.target.value)} /></Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="facts">
          <AccordionTrigger>
            Key Facts <span className="text-xs text-muted-foreground ml-2">(most important field)</span>
          </AccordionTrigger>
          <AccordionContent>
            <Textarea
              value={form.key_facts || ""}
              onChange={e => update("key_facts", e.target.value)}
              placeholder="What happened, when, where, who was involved, what the prosecution alleges, what the defence says…"
              rows={8}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="clients">
          <AccordionTrigger>Clients ({clients.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {clients.map((c: any) => (
                <Card key={c.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.relationship_to_case} · {c.preferred_language}
                      {c.is_in_custody ? " · In custody" : ""}
                    </div>
                  </div>
                  <Button
                    size="icon" variant="ghost"
                    onClick={async () => {
                      await supabase.from("case_clients").delete().eq("id", c.id);
                      setClients(clients.filter(x => x.id !== c.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
              <div className="grid sm:grid-cols-3 gap-2 pt-2">
                <Input
                  placeholder="Name"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                />
                <Select
                  value={newClient.relationship_to_case}
                  onValueChange={v => setNewClient({ ...newClient, relationship_to_case: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Accused","Complainant","Witness","Victim","Petitioner","Respondent"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addClient}><Plus className="h-4 w-4 mr-1.5" /> Add</Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="docs">
          <AccordionTrigger>Documents ({documents.length})</AccordionTrigger>
          <AccordionContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet. Upload coming next iteration.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d: any) => (
                  <Card key={d.id} className="p-3">
                    <div className="font-medium text-sm">{d.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.doc_type}{d.doc_date ? ` · ${d.doc_date}` : ""}
                    </div>
                    {d.ai_summary && <p className="text-xs mt-1.5">{d.ai_summary}</p>}
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notes">
          <AccordionTrigger>Advocate Notes ({notes.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Quick note…" rows={2} />
                <Button onClick={addNote}><Plus className="h-4 w-4" /></Button>
              </div>
              {notes.map((n: any) => (
                <Card key={n.id} className="p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(n.created_at).toLocaleString("en-IN")}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{n.note_text}</p>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hearings">
          <AccordionTrigger>Hearing History ({hearings.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={newHearing.hearing_date}
                  onChange={e => setNewHearing({ ...newHearing, hearing_date: e.target.value })}
                />
                <Button onClick={addHearing}><Plus className="h-4 w-4 mr-1.5" /> Log hearing</Button>
              </div>
              <Textarea
                value={newHearing.what_happened}
                onChange={e => setNewHearing({ ...newHearing, what_happened: e.target.value })}
                placeholder="What happened"
                rows={2}
              />
              <Textarea
                value={newHearing.order_passed}
                onChange={e => setNewHearing({ ...newHearing, order_passed: e.target.value })}
                placeholder="Order passed (optional)"
                rows={2}
              />
              {hearings.map((h: any) => (
                <Card key={h.id} className="p-3">
                  <div className="text-xs font-medium">
                    {new Date(h.hearing_date).toLocaleDateString("en-IN")}
                    {h.court ? ` · ${h.court}` : ""}
                  </div>
                  {h.what_happened && <p className="text-sm mt-1">{h.what_happened}</p>}
                  {h.order_passed && <p className="text-xs mt-1 italic text-muted-foreground">Order: {h.order_passed}</p>}
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
