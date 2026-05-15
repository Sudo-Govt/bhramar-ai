import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MiniMarkdown, extractCitations } from "@/lib/markdown";
import {
  Plus, Send, Paperclip, Mic, MessageSquare, FolderClosed,
  FileText, StickyNote, Search, Copy, Bookmark, Share2, Save,
  ChevronRight, Upload, Crown, Menu, IndianRupee, History,
  Archive, ArchiveRestore, Trash2, ArrowLeft, Clock, Network,
  Newspaper, ExternalLink, Users, Gavel,
} from "lucide-react";
import { toast } from "sonner";
import type { Tier } from "@/hooks/useEffectiveTier";
import { CreateCaseDialog } from "@/components/CreateCaseDialog";
import { PaymentTracker } from "@/components/PaymentTracker";
import { NewsPanel } from "@/components/NewsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Building2 } from "lucide-react";
import logoIcon from "@/assets/bhramar-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmergencyButton } from "@/components/EmergencyButton";

type CaseRow = { id: string; name: string; client_name: string | null; status: "Active" | "Closed" | "Draft"; case_number?: string | null; archived_at?: string | null };
type ConvRow = { id: string; case_id: string | null; title: string; updated_at: string };
type MsgRow = { id?: string; role: "user" | "assistant"; content: string; citations?: string[] };
type TabType = "chat" | "cases" | "network" | "darbar" | "notes";

// ============================================================================
// Icon Rail Component (56px)
// ============================================================================

type IconRailProps = {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  tier: Tier;
};

function IconRail({ activeTab, setActiveTab, tier }: IconRailProps) {
  const tabs: { id: TabType; icon: any; label: string; available: boolean }[] = [
    { id: "chat", icon: MessageSquare, label: "Chat", available: true },
    { id: "cases", icon: FolderClosed, label: "Cases", available: tier === "Pro" || tier === "Firm" },
    { id: "network", icon: Users, label: "Network", available: tier === "Firm" },
    { id: "darbar", icon: Gavel, label: "Darbar", available: true },
    { id: "notes", icon: StickyNote, label: "Notes", available: true },
  ];

  return (
    <div className="w-16 border-r border-border/60 bg-background/40 backdrop-blur-sm flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Logo mark */}
      <img src={logoIcon} alt="Bhramar" className="h-8 w-8 object-contain mb-2" />

      {/* Tab buttons */}
      {tabs.map((tab) => {
        if (!tab.available) return null;
        const Icon = tab.icon;
        return (
          <div key={tab.id} className="group relative">
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-aurora shadow-gold text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              title={tab.label}
            >
              <Icon className="h-5 w-5" />
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-foreground text-background px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {tab.label}
            </div>
          </div>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile at bottom */}
      <Link to="/dashboard" className="h-10 w-10 rounded-xl bg-gradient-aurora flex items-center justify-center text-primary-foreground font-bold text-xs hover:shadow-gold transition-shadow" title="Profile">
        P
      </Link>
    </div>
  );
}

// ============================================================================
// Side Panel Component (260px, content changes based on activeTab)
// ============================================================================

type SidePanelProps = {
  activeTab: TabType;
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
  isDevAccount?: boolean;
  openPicker?: () => void;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  onArchiveCase: (id: string) => void;
  onUnarchiveCase: (id: string) => void;
  onAskDeleteCase: (c: CaseRow) => void;
  daysLeft: number | null;
};

function SidePanel(props: SidePanelProps) {
  const {
    activeTab, cases, activeCaseId, setActiveCaseId,
    conversations, activeConvId, setActiveConvId, newCase, newChat, profile, userEmail,
    tier, freeChatHistory, setActiveFreeConv, isDevAccount, openPicker,
    showArchived, setShowArchived, onArchiveCase, onUnarchiveCase, onAskDeleteCase, daysLeft
  } = props;

  const isPremium = tier === "Pro" || tier === "Firm";
  const visibleCases = cases.filter((c) => showArchived ? !!c.archived_at : !c.archived_at);
  const archivedCount = cases.filter((c) => !!c.archived_at).length;

  return (
    <aside className="w-60 border-r border-border/60 bg-sidebar/50 backdrop-blur-md flex flex-col h-full shrink-0 overflow-hidden">
      {/* Header: Logo + Label */}
      <div className="p-3 border-b border-border/60 flex items-center gap-2 shrink-0">
        <BhramarLogo />
      </div>

      {/* Content based on activeTab */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* CHAT TAB */}
        {activeTab === "chat" && (
          <>
            <Button onClick={newChat} className="w-full bg-gradient-aurora text-primary-foreground shadow-gold h-9 justify-start hover:opacity-95 text-sm">
              <Plus className="h-4 w-4" /> New chat
            </Button>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mt-4 mb-2">
              <History className="h-3 w-3 inline mr-1" /> {isPremium ? "Conversations" : "Chat History"}
            </div>
            {(isPremium ? conversations : freeChatHistory).length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3">
                {isPremium ? "Start a conversation to get going." : "Your past chats will appear here."}
              </div>
            )}
            {(isPremium ? conversations : freeChatHistory).map((cv) => (
              <button
                key={cv.id}
                onClick={() => isPremium ? setActiveConvId(cv.id) : setActiveFreeConv(cv)}
                className={`w-full text-left text-xs p-2 rounded-md truncate transition-colors ${activeConvId === cv.id ? "bg-sidebar-accent text-gold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"}`}
                title={cv.title}
              >
                {cv.title}
              </button>
            ))}
          </>
        )}

        {/* CASES TAB */}
        {activeTab === "cases" && isPremium && (
          <>
            <Button onClick={newCase} className="w-full bg-gradient-aurora text-primary-foreground shadow-gold h-9 justify-start hover:opacity-95 text-sm">
              <Plus className="h-4 w-4" /> Create case
            </Button>
            <div className="flex items-center justify-between px-2 mt-4 mb-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {showArchived ? "Archived" : "Cases"}
              </div>
              {showArchived ? (
                <button onClick={() => setShowArchived(false)} className="text-[10px] text-gold/80 hover:text-gold flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              ) : archivedCount > 0 ? (
                <button onClick={() => setShowArchived(true)} className="text-[10px] text-muted-foreground hover:text-gold flex items-center gap-1">
                  <Archive className="h-3 w-3" /> {archivedCount}
                </button>
              ) : null}
            </div>
            {visibleCases.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3">
                {showArchived ? "No archived cases." : <>No cases yet. Click <span className="text-gold">Create case</span> to start.</>}
              </div>
            )}
            {visibleCases.map((c) => (
              <div
                key={c.id}
                className={`relative p-2.5 rounded-lg mb-1 group transition-all ${activeCaseId === c.id ? "glass border border-gold/40" : "hover:bg-accent/40"}`}
              >
                <button onClick={() => setActiveCaseId(c.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2 pr-10">
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate ${activeCaseId === c.id ? "text-gold" : "text-foreground"}`}>{c.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {c.case_number && <span className="text-[10px] font-mono text-gold/80">#{c.case_number}</span>}
                        {c.client_name && <span className="text-[10px] text-muted-foreground truncate">· {c.client_name}</span>}
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      c.status === "Active" ? "bg-emerald-500/15 text-emerald-400" :
                      c.status === "Draft" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"
                    }`}>{c.status}</span>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showArchived ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUnarchiveCase(c.id); }}
                        className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-background/60"
                        title="Restore"
                      ><ArchiveRestore className="h-3 w-3" /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAskDeleteCase(c); }}
                        className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background/60"
                        title="Delete forever"
                      ><Trash2 className="h-3 w-3" /></button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onArchiveCase(c.id); }}
                      className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-background/60"
                      title="Archive case"
                    ><Archive className="h-3 w-3" /></button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* NETWORK TAB */}
        {activeTab === "network" && tier === "Firm" && (
          <>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-3">Connected Users</div>
            <div className="text-xs text-muted-foreground px-2 py-3">Coming soon: Collaborate with other advocates.</div>
          </>
        )}

        {/* DARBAR TAB */}
        {activeTab === "darbar" && (
          <>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-3">Darbar</div>
            <div className="text-xs text-muted-foreground px-2 py-3">Coming soon: Public legal marketplace.</div>
          </>
        )}

        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-3">Personal Notes</div>
            <div className="text-xs text-muted-foreground px-2 py-3">Notes related to active case will be displayed in the main area.</div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 p-2 space-y-2 shrink-0">
        {isPremium && daysLeft !== null && (
          <div className="w-full h-8 px-2 rounded-md border border-gold/40 text-gold flex items-center justify-center gap-1.5 text-[11px] font-medium">
            <Clock className="h-3 w-3" />
            {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
          </div>
        )}
        {!isPremium && (
          <Link to="/pricing">
            <Button variant="outline" className="w-full h-8 border-gold/40 text-gold hover:bg-gold/10 hover:text-gold text-xs">
              <Crown className="h-3 w-3" /> Upgrade
            </Button>
          </Link>
        )}
        {isDevAccount && (
          <Button
            variant="outline"
            onClick={openPicker}
            className="w-full h-8 border-gold/40 text-gold hover:bg-gold/10 hover:text-gold text-xs"
          >
            <Crown className="h-3 w-3" /> Switch
          </Button>
        )}
      </div>
    </aside>
  );
}

// ============================================================================
// Chat Body
// ============================================================================

type ChatBodyProps = {
  messages: MsgRow[];
  saveNotes: (s: string) => void;
  notes: string;
  bottomRef: React.RefObject<HTMLDivElement>;
};

function ChatBody({ messages, saveNotes, notes, bottomRef }: ChatBodyProps) {
  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto">
      <div className="relative z-10">
        {messages.length === 0 ? (
          <div className="h-full min-h-[60vh] flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto py-10">
            <div className="rounded-3xl glass p-5 mb-6 shadow-glass">
              <img src={logoIcon} alt="Bhramar.ai" className="h-12 w-12 object-contain" />
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
                    <div className="h-8 w-8 rounded-xl bg-gradient-aurora flex items-center justify-center shrink-0 shadow-gold p-1">
                      <img src={logoIcon} alt="" className="h-full w-full object-contain" />
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

// ============================================================================
// Input Bar
// ============================================================================

type InputBarProps = {
  input: string;
  setInput: (s: string) => void;
  send: () => void;
  streaming: boolean;
  handleFileUpload: (f: File) => void;
  profileName?: string | null;
  profileState?: string | null;
  activeCaseName?: string | null;
  onPickCase?: () => void;
};

function InputBar({ input, setInput, send, streaming, handleFileUpload, profileName, profileState, activeCaseName, onPickCase }: InputBarProps) {
  return (
    <div className="border-t border-border/60 p-3 md:p-4 glass-subtle">
      <div className="max-w-3xl mx-auto">
        {/* AI Context strip */}
        <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {profileName || "You"}{profileState ? ` · ${profileState}` : ""}
          </span>
          <button
            type="button"
            onClick={onPickCase}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors ${activeCaseName ? "border-gold/60 text-gold hover:bg-gold/10" : "border-border/60 text-muted-foreground"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${activeCaseName ? "bg-gold" : "bg-muted-foreground/50"}`} />
            {activeCaseName ? `Case: ${activeCaseName}` : "No case loaded · pick one"}
          </button>
          <span className="text-muted-foreground/70 ml-auto hidden sm:inline">Bhramar uses your profile + this case as context</span>
        </div>
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
// Main Dashboard Page
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
  const [notes, setNotes] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const [freeChatHistory, setFreeChatHistory] = useState<ConvRow[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CaseRow | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dev role override for bhramar123@gmail.com
  const isDevAccount = (user?.email || "").toLowerCase() === "bhramar123@gmail.com";
  const [devTier, setDevTier] = useState<Tier | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!isDevAccount) { setDevTier(null); return; }
    const saved = localStorage.getItem("bhramar.devTier") as Tier | null;
    if (saved && ["Free", "Pro", "Firm"].includes(saved)) setDevTier(saved);
    else setPickerOpen(true);
  }, [isDevAccount, user?.id]);
  const chooseTier = (t: Tier) => {
    localStorage.setItem("bhramar.devTier", t);
    setDevTier(t);
    setPickerOpen(false);
    toast.success(`Switched to ${t} view`);
  };

  const realTier: Tier = (profile?.subscription_tier as Tier) || "Free";
  const tier: Tier = isDevAccount && devTier ? devTier : realTier;
  const isPremium = tier === "Pro" || tier === "Firm";

  // Days left on Pro/Firm subscription
  const daysLeft: number | null = useMemo(() => {
    if (!isPremium) return null;
    const exp = profile?.subscription_expires_at as string | undefined;
    if (!exp) return null;
    const ms = new Date(exp).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [isPremium, profile?.subscription_expires_at]);

  const onArchiveCase = useCallback(async (id: string) => {
    const { error } = await supabase.rpc("archive_case", { _case_id: id });
    if (error) return toast.error(error.message);
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, archived_at: new Date().toISOString() } : c));
    if (activeCaseId === id) setActiveCaseId(null);
    toast.success("Case archived");
  }, [activeCaseId]);

  const onUnarchiveCase = useCallback(async (id: string) => {
    const { error } = await supabase.rpc("unarchive_case", { _case_id: id });
    if (error) return toast.error(error.message);
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, archived_at: null } : c));
    toast.success("Case restored");
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc("delete_case_with_log", { _case_id: deleteTarget.id });
    if (error) return toast.error(error.message);
    setCases((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    if (activeCaseId === deleteTarget.id) setActiveCaseId(null);
    setDeleteTarget(null);
    toast.success("Case deleted");
  }, [deleteTarget, activeCaseId]);

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

  // Free user: load all conversations as flat chat history
  useEffect(() => {
    if (!user || isPremium) { setFreeChatHistory([]); return; }
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, case_id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      setFreeChatHistory((data as any) || []);
    })();
  }, [user, isPremium, messages.length]);

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

  const newCase = useCallback(() => {
    setCreateCaseOpen(true);
  }, []);

  const onCaseCreated = useCallback(async (caseId: string) => {
    if (!user) return;
    const { data: cs } = await supabase.from("cases").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setCases((cs as any) || []);
    setActiveCaseId(caseId);
  }, [user]);

  const setActiveFreeConv = useCallback(async (cv: ConvRow) => {
    setActiveCaseId(cv.case_id);
    setActiveConvId(cv.id);
  }, []);

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
          case_id: activeCaseId,
          conversation_id: convId,
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
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === "[DONE]") { done = true; break; }
          try {
            const json = JSON.parse(data);
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
      {/* Desktop: Icon Rail + Side Panel */}
      <div className="hidden md:flex">
        <IconRail activeTab={activeTab} setActiveTab={setActiveTab} tier={tier} />
        <SidePanel
          activeTab={activeTab}
          cases={cases} activeCaseId={activeCaseId} setActiveCaseId={setActiveCaseId}
          conversations={conversations} activeConvId={activeConvId} setActiveConvId={setActiveConvId}
          newCase={newCase} newChat={newChat} profile={profile} userEmail={user?.email}
          tier={tier} freeChatHistory={freeChatHistory} setActiveFreeConv={setActiveFreeConv}
          isDevAccount={isDevAccount} openPicker={() => setPickerOpen(true)}
          showArchived={showArchived} setShowArchived={setShowArchived}
          onArchiveCase={onArchiveCase} onUnarchiveCase={onUnarchiveCase}
          onAskDeleteCase={setDeleteTarget} daysLeft={daysLeft}
        />
      </div>

      {/* Mobile: Hamburger menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 bg-sidebar border-sidebar-border">
          <SidePanel
            activeTab={activeTab}
            cases={cases} activeCaseId={activeCaseId}
            setActiveCaseId={(id) => { setActiveCaseId(id); setMobileMenuOpen(false); }}
            conversations={conversations} activeConvId={activeConvId}
            setActiveConvId={(id) => { setActiveConvId(id); setMobileMenuOpen(false); }}
            newCase={newCase} newChat={() => { newChat(); setMobileMenuOpen(false); }}
            profile={profile} userEmail={user?.email}
            tier={tier} freeChatHistory={freeChatHistory}
            setActiveFreeConv={(cv) => { setActiveFreeConv(cv); setMobileMenuOpen(false); }}
            isDevAccount={isDevAccount} openPicker={() => { setMobileMenuOpen(false); setPickerOpen(true); }}
            showArchived={showArchived} setShowArchived={setShowArchived}
            onArchiveCase={onArchiveCase} onUnarchiveCase={onUnarchiveCase}
            onAskDeleteCase={setDeleteTarget} daysLeft={daysLeft}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-4 md:px-6 glass-subtle">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {activeTab === "chat" ? (
              <>
                <FolderClosed className="h-4 w-4 text-gold shrink-0" />
                <span className="font-medium text-sm truncate">{activeCase?.name || "Select a case"}</span>
                {activeCase?.client_name && (
                  <span className="hidden sm:inline text-xs text-muted-foreground truncate">· {activeCase.client_name}</span>
                )}
              </>
            ) : (
              <span className="font-medium text-sm truncate capitalize">{activeTab}</span>
            )}
          </div>
          <ThemeToggle />
        </header>

        {/* Main Content - Different views based on activeTab */}
        {activeTab === "chat" ? (
          <>
            <ChatBody
              messages={messages}
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
              profileName={profile?.full_name || user?.email?.split("@")[0]}
              profileState={profile?.state}
              activeCaseName={cases.find((c) => c.id === activeCaseId)?.name || null}
              onPickCase={() => setActiveTab("cases")}
            />
          </>
        ) : activeTab === "cases" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">My Cases</h2>
              {cases.length === 0 ? (
                <div className="text-center py-12">
                  <FolderClosed className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No cases yet. Create one from the sidebar to start.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {cases.filter(c => !c.archived_at).map((c) => (
                    <div key={c.id} className="glass border border-gold/20 rounded-xl p-4 hover:border-gold/40 transition-colors cursor-pointer" onClick={() => setActiveCaseId(c.id)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-gold">{c.name}</h3>
                          {c.case_number && <p className="text-xs text-muted-foreground">#{c.case_number}</p>}
                        </div>
                        <span className={`text-[9px] px-2 py-1 rounded-full font-semibold shrink-0 ${
                          c.status === "Active" ? "bg-emerald-500/15 text-emerald-400" :
                          c.status === "Draft" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"
                        }`}>{c.status}</span>
                      </div>
                      {c.client_name && <p className="text-xs text-muted-foreground">Client: {c.client_name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "notes" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Notes</h2>
              {!activeCaseId ? (
                <div className="text-center py-12">
                  <StickyNote className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a case to take notes.</p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={notes}
                    onChange={(e) => saveNotes(e.target.value)}
                    placeholder="Personal notes for this case..."
                    className="min-h-[400px] resize-none glass border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Auto-saved</p>
                </>
              )}
            </div>
          </div>
        ) : activeTab === "network" ? (
          <div className="flex-1 overflow-y-auto p-6 text-center">
            <div className="max-w-2xl mx-auto py-12">
              <Network className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Network</h2>
              <p className="text-muted-foreground">Coming soon: Collaborate with other advocates in your firm.</p>
            </div>
          </div>
        ) : activeTab === "darbar" ? (
          <div className="flex-1 overflow-y-auto p-6 text-center">
            <div className="max-w-2xl mx-auto py-12">
              <Gavel className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Darbar</h2>
              <p className="text-muted-foreground">Coming soon: Public legal marketplace and case listings.</p>
            </div>
          </div>
        ) : null}
      </main>

      {/* Create case dialog */}
      <CreateCaseDialog open={createCaseOpen} onOpenChange={setCreateCaseOpen} onCreated={onCaseCreated} />

      {/* Dev role picker */}
      {isDevAccount && (
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="glass-strong border-gold/30 max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-gradient-aurora">Choose dashboard view</DialogTitle>
              <DialogDescription>
                Dev override for <span className="text-gold">{user?.email}</span>. Switch any time from your profile.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-2">
              {([
                { tier: "Free" as Tier, title: "Free Chat", desc: "5 messages/day, chat history only", Icon: User },
                { tier: "Pro" as Tier, title: "Advocate", desc: "Cases, payments, evidence analysis", Icon: Crown },
                { tier: "Firm" as Tier, title: "Firm", desc: "Shared workspace, cross-case AI", Icon: Building2 },
              ]).map(({ tier: t, title, desc, Icon }) => (
                <button
                  key={t}
                  onClick={() => chooseTier(t)}
                  className={`text-left p-4 rounded-2xl glass border transition-all hover:scale-[1.01] ${
                    tier === t ? "border-gold/60 shadow-gold" : "border-border/60 hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-aurora flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{title}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                    {tier === t && <span className="text-xs text-gold font-bold">CURRENT</span>}
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete-case confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="glass-strong border-destructive/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Delete case forever?</DialogTitle>
            <DialogDescription>
              <span className="text-foreground font-medium">{deleteTarget?.name}</span> and all its conversations,
              documents, payments and notes will be permanently removed from your account. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirmDelete}>
              <Trash2 className="h-4 w-4" /> Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency FAB — Free tier only */}
      {tier === "Free" && <EmergencyButton variant="floating" />}
    </div>
  );
}
