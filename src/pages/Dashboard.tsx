import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MiniMarkdown, extractCitations } from "@/lib/markdown";
import {
  Plus, Send, Paperclip, Mic, Scale, MessageSquare, FolderClosed,
  FileText, StickyNote, Search, Copy, Bookmark, Share2, Save,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  ChevronRight, Upload, Crown, Menu, IndianRupee, History,
} from "lucide-react";
import { toast } from "sonner";
import { TierProvider, useEffectiveTier, Tier } from "@/hooks/useEffectiveTier";
import { RoleSwitcherDialog } from "@/components/RoleSwitcherDialog";
import { CreateCaseDialog } from "@/components/CreateCaseDialog";
import { PaymentTracker } from "@/components/PaymentTracker";

type CaseRow = { id: string; name: string; client_name: string | null; status: "Active" | "Closed" | "Draft"; case_number?: string | null };
type ConvRow = { id: string; case_id: string | null; title: string; updated_at: string };
type MsgRow = { id?: string; role: "user" | "assistant"; content: string; citations?: string[] };

// ============================================================================
// Sub-components are defined OUTSIDE the page component on purpose.
// Defining them inside would create a fresh component type on every render,
// remounting the <Textarea> on every keystroke and dismissing the mobile keyboard.
// ============================================================================

type SidebarProps = {
  leftOpen: boolean;
  setLeftOpen: (v: boolean) => void;
  cases: CaseRow[];
  activeCaseId: string | null;
  setActiveCaseId: (id: string) => void;
  conversations: ConvRow[];
  activeConvId: string | null;
  setActiveConvId: (id: string) => void;
  newCase: () => void;
  newChat: () => void;
  profile: any;
  userEmail?: string | null;
  tier: Tier;
  freeChatHistory: ConvRow[];
  setActiveFreeConv: (c: ConvRow) => void;
};

function Sidebar(props: SidebarProps) {
  const { leftOpen, setLeftOpen, cases, activeCaseId, setActiveCaseId,
    conversations, activeConvId, setActiveConvId, newCase, newChat, profile, userEmail,
    tier, freeChatHistory, setActiveFreeConv } = props;

  const isPremium = tier === "Pro" || tier === "Firm";

  return (
    <aside className={`relative bg-sidebar/70 backdrop-blur-xl border-r border-sidebar-border flex flex-col h-full ${leftOpen ? "w-72" : "w-16"} transition-[width] duration-200`}>
      <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
        {leftOpen ? <BhramarLogo /> : <Scale className="h-5 w-5 text-gold mx-auto" />}
        <Button variant="ghost" size="icon" className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLeftOpen(!leftOpen)}>
          {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>

      <div className="p-3">
        {isPremium ? (
          <>
            <Button onClick={newCase} className="w-full bg-gradient-aurora text-primary-foreground shadow-gold h-10 justify-start hover:opacity-95">
              <Plus className="h-4 w-4" /> {leftOpen && "Create case"}
            </Button>
            {leftOpen && (
              <Button onClick={newChat} variant="ghost" className="w-full mt-2 h-9 justify-start text-muted-foreground hover:text-foreground">
                <MessageSquare className="h-4 w-4" /> New chat
              </Button>
            )}
          </>
        ) : (
          <Button onClick={newChat} className="w-full bg-gradient-aurora text-primary-foreground shadow-gold h-10 justify-start hover:opacity-95">
            <MessageSquare className="h-4 w-4" /> {leftOpen && "New chat"}
          </Button>
        )}
      </div>

      {leftOpen && (
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {isPremium ? (
            <>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mt-2 mb-2">Cases</div>
              {cases.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-3">No cases yet. Click <span className="text-gold">Create case</span> to start.</div>
              )}
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCaseId(c.id)}
                  className={`w-full text-left p-2.5 rounded-xl mb-1 group transition-all ${activeCaseId === c.id ? "glass border border-gold/40" : "hover:bg-sidebar-accent/60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${activeCaseId === c.id ? "text-gold" : "text-foreground"}`}>{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.case_number && <span className="text-[10px] font-mono text-gold/80">#{c.case_number}</span>}
                        {c.client_name && <span className="text-xs text-muted-foreground truncate">· {c.client_name}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      c.status === "Active" ? "bg-emerald-500/15 text-emerald-400" :
                      c.status === "Draft" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"
                    }`}>{c.status}</span>
                  </div>
                </button>
              ))}

              {activeCaseId && conversations.length > 0 && (
                <>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mt-5 mb-2">Conversations</div>
                  {conversations.map((cv) => (
                    <button
                      key={cv.id}
                      onClick={() => setActiveConvId(cv.id)}
                      className={`w-full text-left text-xs p-2 rounded-md mb-0.5 truncate transition-colors ${activeConvId === cv.id ? "bg-sidebar-accent text-gold" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"}`}
                    >{cv.title}</button>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mt-2 mb-2 flex items-center gap-1.5">
                <History className="h-3 w-3" /> Chat history
              </div>
              {freeChatHistory.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-3">Your past chats will appear here.</div>
              )}
              {freeChatHistory.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => setActiveFreeConv(cv)}
                  className={`w-full text-left text-xs p-2 rounded-md mb-0.5 truncate transition-colors ${activeConvId === cv.id ? "bg-sidebar-accent text-gold" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"}`}
                >{cv.title}</button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="border-t border-sidebar-border p-3">
        {leftOpen && (
          <Link to="/pricing">
            <Button variant="outline" className="w-full mb-2 h-9 border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
              <Crown className="h-3.5 w-3.5" /> Upgrade to Pro
            </Button>
          </Link>
        )}
        <Link to="/profile">
          <div className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-sidebar-accent/60 cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-gradient-aurora flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
              {(profile?.full_name || userEmail || "U")[0].toUpperCase()}
            </div>
            {leftOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.full_name || "Advocate"}</div>
                <div className="text-[11px] text-gold">{tier} Plan</div>
              </div>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}

type RightPanelProps = {
  rightOpen: boolean;
  setRightOpen: (v: boolean) => void;
  messages: MsgRow[];
  notes: string;
  saveNotes: (v: string) => void;
  activeCaseId: string | null;
  handleFileUpload: (f: File) => void;
};

function RightPanel(props: RightPanelProps) {
  const { rightOpen, setRightOpen, messages, notes, saveNotes, activeCaseId, handleFileUpload } = props;
  return (
    <aside className={`bg-card/60 backdrop-blur-xl border-l border-border flex flex-col h-full ${rightOpen ? "w-80" : "w-12"} transition-[width] duration-200`}>
      <div className="p-2 border-b border-border flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setRightOpen(!rightOpen)}>
          {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>
      {rightOpen && (
        <Tabs defaultValue="documents" className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 mx-3 mt-2 glass-subtle">
            <TabsTrigger value="documents" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" /> Docs</TabsTrigger>
            <TabsTrigger value="research" className="text-xs"><Search className="h-3.5 w-3.5 mr-1" /> Research</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs"><StickyNote className="h-3.5 w-3.5 mr-1" /> Notes</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="documents" className="mt-0 space-y-3">
              <label className="block">
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                <div className="glass border-2 border-dashed border-gold/40 rounded-2xl p-6 text-center hover:bg-gold/5 transition-colors cursor-pointer">
                  <Upload className="h-6 w-6 text-gold mx-auto mb-2" />
                  <div className="text-sm font-medium">Drop a file or click</div>
                  <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, images</div>
                </div>
              </label>
              <p className="text-xs text-muted-foreground">Files attach to the active case folder.</p>
            </TabsContent>
            <TabsContent value="research" className="mt-0">
              {messages.filter((m) => m.role === "assistant" && m.citations?.length).slice(-1).map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cited in latest answer</div>
                  {m.citations!.map((c) => (
                    <div key={c} className="flex items-center justify-between p-3 rounded-xl glass border border-gold/30">
                      <span className="text-sm font-medium text-gold">{c}</span>
                      <ChevronRight className="h-4 w-4 text-gold" />
                    </div>
                  ))}
                </div>
              ))}
              {!messages.some((m) => m.citations?.length) && (
                <div className="text-sm text-muted-foreground">Citations will appear here after your first AI response.</div>
              )}
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <Textarea
                value={notes}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Personal notes for this case..."
                className="min-h-[300px] resize-none glass border-border"
                disabled={!activeCaseId}
              />
              <p className="text-xs text-muted-foreground mt-2">{activeCaseId ? "Auto-saved" : "Select a case to take notes"}</p>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </aside>
  );
}

type ChatBodyProps = {
  messages: MsgRow[];
  setInput: (s: string) => void;
  saveNotes: (s: string) => void;
  notes: string;
  bottomRef: React.RefObject<HTMLDivElement>;
};

function ChatBody({ messages, setInput, saveNotes, notes, bottomRef }: ChatBodyProps) {
  return (
    <div className="relative flex-1 overflow-y-auto aurora-bg">
      <div className="relative z-10">
        {messages.length === 0 ? (
          <div className="h-full min-h-[60vh] flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto py-10">
            <div className="rounded-3xl glass p-5 mb-6 shadow-glass">
              <Scale className="h-10 w-10 text-gold" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-3 text-gradient-aurora">Bhramar.ai</h2>
            <p className="text-muted-foreground text-balance">Your AI-powered legal companion. Ask anything about Indian law.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className="animate-fade-in">
                {m.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] glass-strong rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">{m.content}</div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-gradient-aurora flex items-center justify-center shrink-0 shadow-gold">
                      <Scale className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl rounded-tl-sm glass px-5 py-4 border-l-2 border-l-gold">
                        {m.content ? <MiniMarkdown text={m.content} /> : <span className="text-muted-foreground text-sm animate-pulse-soft">…thinking</span>}
                      </div>
                      {!!m.citations?.length && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {m.citations.map((c) => (
                            <button key={c} className="px-2.5 py-1 rounded-full text-xs font-medium glass border border-gold/40 text-gold hover:bg-gold/10 transition-colors">
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                      {m.content && (
                        <div className="flex items-center gap-1 mt-2">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-gold" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }}>
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-gold" onClick={() => { saveNotes((notes ? notes + "\n\n" : "") + m.content); toast.success("Saved to notes"); }}>
                            <Save className="h-3 w-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-gold">
                            <Bookmark className="h-3 w-3" /> Bookmark
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-gold">
                            <Share2 className="h-3 w-3" /> Share
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

type InputBarProps = {
  input: string;
  setInput: (s: string) => void;
  send: () => void;
  streaming: boolean;
  handleFileUpload: (f: File) => void;
};

function InputBar({ input, setInput, send, streaming, handleFileUpload }: InputBarProps) {
  return (
    <div className="border-t border-border/60 p-3 md:p-4 glass-subtle">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 rounded-2xl glass focus-within:border-gold/60 transition-colors p-2">
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-gold shrink-0" asChild>
            <label className="cursor-pointer flex items-center justify-center">
              <Paperclip className="h-4 w-4" />
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </label>
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Bhramar.ai anything about your case..."
            rows={1}
            className="flex-1 min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-sm"
          />
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-gold shrink-0">
            <Mic className="h-4 w-4" />
          </Button>
          <Button onClick={send} disabled={!input.trim() || streaming} size="icon" className="h-9 w-9 bg-gradient-aurora text-primary-foreground shadow-gold shrink-0 hover:opacity-95">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Press Enter to send · Shift + Enter for newline
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Page component
// ============================================================================

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileLeft, setMobileLeft] = useState(false);
  const [mobileRight, setMobileRight] = useState(false);
  const [notes, setNotes] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: cs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("cases").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      setProfile(p);
      setCases((cs as any) || []);
      if (cs && cs.length) setActiveCaseId(cs[0].id);
    })();
  }, [user]);

  // Load convs + notes when case changes
  useEffect(() => {
    if (!activeCaseId || !user) { setConversations([]); setActiveConvId(null); setNotes(""); return; }
    (async () => {
      const [{ data: convs }, { data: noteRow }] = await Promise.all([
        supabase.from("conversations").select("*").eq("user_id", user.id).eq("case_id", activeCaseId).order("updated_at", { ascending: false }),
        supabase.from("notes").select("body").eq("user_id", user.id).eq("case_id", activeCaseId).maybeSingle(),
      ]);
      setConversations((convs as any) || []);
      setNotes(noteRow?.body || "");
      setActiveConvId(null);
      setMessages([]);
    })();
  }, [activeCaseId, user]);

  // Load messages when conv changes
  useEffect(() => {
    if (!activeConvId || !user) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeConvId).order("created_at");
      setMessages((data || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, citations: m.citations || [] })));
    })();
  }, [activeConvId, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const activeCase = useMemo(() => cases.find((c) => c.id === activeCaseId), [cases, activeCaseId]);

  const newCase = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("cases").insert({ user_id: user.id, name: "New case", status: "Draft" }).select().single();
    if (error) return toast.error(error.message);
    setCases((prev) => [data as any, ...prev]);
    setActiveCaseId(data.id);
    toast.success("Case created");
  }, [user]);

  const newChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
  }, []);

  const saveNotes = useCallback(async (val: string) => {
    setNotes(val);
    if (!activeCaseId || !user) return;
    await supabase.from("notes").upsert({ user_id: user.id, case_id: activeCaseId, body: val }, { onConflict: "case_id" });
  }, [activeCaseId, user]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user || !activeCaseId) return toast.error("Select a case first");
    const path = `${user.id}/${activeCaseId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("case-documents").upload(path, file);
    if (error) return toast.error(error.message);
    await supabase.from("documents").insert({ user_id: user.id, case_id: activeCaseId, filename: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size });
    toast.success("Document uploaded");
  }, [user, activeCaseId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !user) return;
    setInput("");

    // Ensure a case + conversation
    let caseId = activeCaseId;
    if (!caseId) {
      const { data } = await supabase.from("cases").insert({ user_id: user.id, name: "Untitled case", status: "Active" }).select().single();
      caseId = data!.id; setActiveCaseId(caseId);
      setCases((prev) => [data as any, ...prev]);
    }
    let convId = activeConvId;
    if (!convId) {
      const title = text.length > 60 ? text.slice(0, 57) + "…" : text;
      const { data } = await supabase.from("conversations").insert({ user_id: user.id, case_id: caseId, title }).select().single();
      convId = data!.id; setActiveConvId(convId);
      setConversations((prev) => [data as any, ...prev]);
    }

    // Optimistic user message
    const priorMessages = messages;
    const userMsg: MsgRow = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    await supabase.from("messages").insert({ user_id: user.id, conversation_id: convId, role: "user", content: text });
    await supabase.from("usage_logs").insert({ user_id: user.id, kind: "query" });

    setStreaming(true);
    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...priorMessages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: text }],
        }),
      });

      if (resp.status === 429) { toast.error("Too many requests. Please wait a moment."); throw new Error("rate"); }
      if (resp.status === 402) { toast.error("AI credits exhausted."); throw new Error("credits"); }
      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        console.error("chat fn error", resp.status, errText);
        toast.error("Could not reach AI. Please try again.");
        throw new Error("Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let finalSources: any[] = [];

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue; // skip blank lines, "event:" lines, etc.
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === "[DONE]") { done = true; break; }
          try {
            const json = JSON.parse(data);
            // sources sidecar event
            if (Array.isArray(json?.sources)) { finalSources = json.sources; continue; }
            const delta = json.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantText };
                return next;
              });
            }
          } catch {
            // Partial JSON line — re-buffer this line and wait for more bytes.
            buffer = `data: ${data}\n` + buffer;
            break;
          }
        }
      }

      if (!assistantText) {
        assistantText = "_I could not generate a response. Please try again._";
      }

      const inlineCitations = extractCitations(assistantText);
      const sourceLabels = finalSources.map((s: any) => s.label).filter(Boolean);
      const citations = Array.from(new Set([...sourceLabels, ...inlineCitations])).slice(0, 8);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: assistantText, citations };
        return next;
      });
      await supabase.from("messages").insert({ user_id: user.id, conversation_id: convId, role: "assistant", content: assistantText, citations });
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, user, activeCaseId, activeConvId, messages]);

  return (
    <div className="h-[100dvh] w-full flex bg-background text-foreground overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          leftOpen={leftOpen} setLeftOpen={setLeftOpen}
          cases={cases} activeCaseId={activeCaseId} setActiveCaseId={setActiveCaseId}
          conversations={conversations} activeConvId={activeConvId} setActiveConvId={setActiveConvId}
          newCase={newCase} newChat={newChat} profile={profile} userEmail={user?.email}
        />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileLeft} onOpenChange={setMobileLeft}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <Sidebar
            leftOpen={true} setLeftOpen={() => setMobileLeft(false)}
            cases={cases} activeCaseId={activeCaseId}
            setActiveCaseId={(id) => { setActiveCaseId(id); setMobileLeft(false); }}
            conversations={conversations} activeConvId={activeConvId}
            setActiveConvId={(id) => { setActiveConvId(id); setMobileLeft(false); }}
            newCase={newCase} newChat={() => { newChat(); setMobileLeft(false); }}
            profile={profile} userEmail={user?.email}
          />
        </SheetContent>
      </Sheet>

      {/* Center */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-4 md:px-6 glass-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileLeft(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <FolderClosed className="h-4 w-4 text-gold shrink-0" />
            <span className="font-medium text-sm truncate">{activeCase?.name || "Select a case"}</span>
            {activeCase?.client_name && (
              <span className="hidden sm:inline text-xs text-muted-foreground truncate">· {activeCase.client_name}</span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileRight(true)}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </header>
        <ChatBody
          messages={messages}
          setInput={setInput}
          saveNotes={saveNotes}
          notes={notes}
          bottomRef={bottomRef}
        />
        <InputBar
          input={input}
          setInput={setInput}
          send={send}
          streaming={streaming}
          handleFileUpload={handleFileUpload}
        />
      </main>

      {/* Desktop right panel */}
      <div className="hidden lg:flex">
        <RightPanel
          rightOpen={rightOpen} setRightOpen={setRightOpen}
          messages={messages} notes={notes} saveNotes={saveNotes}
          activeCaseId={activeCaseId} handleFileUpload={handleFileUpload}
        />
      </div>

      {/* Mobile right panel */}
      <Sheet open={mobileRight} onOpenChange={setMobileRight}>
        <SheetContent side="right" className="p-0 w-80 bg-card border-border">
          <RightPanel
            rightOpen={true} setRightOpen={() => setMobileRight(false)}
            messages={messages} notes={notes} saveNotes={saveNotes}
            activeCaseId={activeCaseId} handleFileUpload={handleFileUpload}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}