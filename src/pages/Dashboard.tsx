import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MiniMarkdown, extractCitations } from "@/lib/markdown";
import {
  Plus, Send, Paperclip, Mic, MessageSquare, FolderClosed,
  StickyNote, Copy, Bookmark, Share2, Save, Crown, History,
  Archive, ArchiveRestore, Trash2, Clock, Users,
  Gavel, LogOut, Settings, ChevronLeft, ChevronRight, User,
  Building2, PanelLeftClose, PanelLeftOpen,
  LayoutDashboard, UsersRound, Scale, Newspaper,
  IndianRupee, CalendarDays, Files, Bot, Video,
  NetworkIcon, Briefcase, TrendingUp, FileText,
  Phone, AlertTriangle, CheckCircle2, Circle,
} from "lucide-react";
import { toast } from "sonner";
import type { Tier } from "@/hooks/useEffectiveTier";
import { CreateCaseDialog } from "@/components/CreateCaseDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import logoIcon from "@/assets/bhramar-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmergencyButton } from "@/components/EmergencyButton";

// ─── Types ───────────────────────────────────────────────────────────────────
type CaseRow = {
  id: string; name: string; client_name: string | null;
  status: "Active" | "Closed" | "Draft";
  case_number?: string | null; archived_at?: string | null;
};
type ConvRow  = { id: string; case_id: string | null; title: string; updated_at: string };
type MsgRow   = { id?: string; role: "user" | "assistant"; content: string; citations?: string[] };
type TabType  =
  | "chat" | "overview" | "cases" | "clients" | "teamup"
  | "courtcells" | "news" | "finance" | "calendar"
  | "notes" | "files" | "assistant" | "calls"
  | "darbar" | "profile";

// ─────────────────────────────────────────────────────────────────────────────
// PANEL 1 — Icon Rail
// ─────────────────────────────────────────────────────────────────────────────
const ALL_TABS: { id: TabType; Icon: any; label: string }[] = [
  { id: "chat",      Icon: MessageSquare,  label: "Chat"           },
  { id: "overview",  Icon: LayoutDashboard,label: "Overview"       },
  { id: "cases",     Icon: FolderClosed,   label: "Cases"          },
  { id: "clients",   Icon: UsersRound,     label: "Clients"        },
  { id: "teamup",    Icon: Users,          label: "Team Up"        },
  { id: "courtcells",Icon: Scale,          label: "Court Cells"    },
  { id: "news",      Icon: Newspaper,      label: "Legal News"     },
  { id: "finance",   Icon: IndianRupee,    label: "Finance"        },
  { id: "calendar",  Icon: CalendarDays,   label: "Calendar"       },
  { id: "notes",     Icon: StickyNote,     label: "Notes"          },
  { id: "files",     Icon: Files,          label: "Files & Email"  },
  { id: "assistant", Icon: Bot,            label: "AI Assistant"   },
  { id: "calls",     Icon: Video,          label: "Video Calls"    },
  { id: "darbar",    Icon: Gavel,          label: "Darbar"         },
  { id: "profile",   Icon: User,           label: "Profile"        },
];

function IconRail({
  activeTab, setActiveTab, expanded, onToggle,
}: {
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="hidden md:flex flex-col border-r border-border/60 bg-background/30 backdrop-blur-md shrink-0 transition-all duration-200 overflow-hidden"
      style={{ width: expanded ? 164 : 52 }}
    >
      {/* Logo mark */}
      <div className="flex items-center justify-center py-3 border-b border-border/60 px-2 shrink-0" style={{ minHeight: 52 }}>
        <img src={logoIcon} alt="Bhramar" className="h-7 w-7 object-contain shrink-0" />
        {expanded && (
          <span className="ml-2 text-sm font-bold text-foreground whitespace-nowrap overflow-hidden">
            Bhramar
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 py-2 px-1 overflow-y-auto">
        {ALL_TABS.map(({ id, Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <div key={id} className="group relative">
              <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 w-full px-2 h-9 rounded-lg transition-all text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {expanded && (
                  <span className="text-xs font-medium whitespace-nowrap">{label}</span>
                )}
              </button>
              {/* Tooltip when collapsed */}
              {!expanded && (
                <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        title={expanded ? "Collapse rail" : "Expand rail"}
        className="flex items-center justify-center h-10 border-t border-border/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL 2 — Chat History Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function ChatSidebar({
  expanded, onToggle,
  conversations, freeChatHistory, activeConvId,
  setActiveConvId, setActiveFreeConv,
  newChat, tier,
  cases, activeCaseId, setActiveCaseId,
  newCase, showArchived, setShowArchived,
  onArchiveCase, onUnarchiveCase, onAskDeleteCase,
  daysLeft, isDevAccount, openPicker,
}: {
  expanded: boolean; onToggle: () => void;
  conversations: ConvRow[]; freeChatHistory: ConvRow[];
  activeConvId: string | null;
  setActiveConvId: (id: string) => void;
  setActiveFreeConv: (c: ConvRow) => void;
  newChat: () => void; tier: Tier;
  cases: CaseRow[]; activeCaseId: string | null;
  setActiveCaseId: (id: string) => void;
  newCase: () => void; showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  onArchiveCase: (id: string) => void;
  onUnarchiveCase: (id: string) => void;
  onAskDeleteCase: (c: CaseRow) => void;
  daysLeft: number | null; isDevAccount: boolean; openPicker: () => void;
}) {
  const isPremium = tier === "Pro" || tier === "Firm";
  const visibleCases = cases.filter((c) => showArchived ? !!c.archived_at : !c.archived_at);
  const archivedCount = cases.filter((c) => !!c.archived_at).length;

  return (
    <div
      className="hidden md:flex flex-col border-r border-border/60 bg-sidebar/40 backdrop-blur-md shrink-0 transition-all duration-200 overflow-hidden"
      style={{ width: expanded ? 240 : 0, opacity: expanded ? 1 : 0 }}
    >
      {/* Full logo header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0" style={{ minHeight: 52 }}>
        <BhramarLogo size="sm" />
        <button onClick={onToggle} title="Collapse sidebar"
          className="text-muted-foreground hover:text-foreground transition-colors ml-1">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <Button onClick={newChat} className="w-full bg-primary text-primary-foreground h-8 justify-start text-xs mb-2">
          <Plus className="h-3.5 w-3.5 mr-1" /> New chat
        </Button>

        <p className="conv-section-label">
          <History className="h-3 w-3 inline mr-1" />
          {isPremium ? "Conversations" : "History"}
        </p>

        {(isPremium ? conversations : freeChatHistory).length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-3">No chats yet.</p>
        )}

        {(isPremium ? conversations : freeChatHistory).map((cv) => (
          <button key={cv.id}
            onClick={() => isPremium ? setActiveConvId(cv.id) : setActiveFreeConv(cv)}
            title={cv.title}
            className={`conv-item w-full text-left ${activeConvId === cv.id ? "active" : ""}`}
          >
            <div className="conv-item-title">{cv.title}</div>
            <div className="conv-item-preview conv-item-time">
              {new Date(cv.updated_at).toLocaleDateString()}
            </div>
          </button>
        ))}

        {isPremium && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="conv-section-label">Cases</p>
              <button onClick={newCase} className="text-[10px] text-primary hover:underline pr-2">+ New</button>
            </div>
            {archivedCount > 0 && (
              <button onClick={() => setShowArchived(!showArchived)}
                className="text-[10px] text-muted-foreground px-2 mb-1 hover:text-foreground flex items-center gap-1">
                <Archive className="h-3 w-3" />
                {showArchived ? "Show active" : `Archived (${archivedCount})`}
              </button>
            )}
            {visibleCases.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-2">No cases yet.</p>
            )}
            {visibleCases.map((c) => (
              <div key={c.id} className="group relative">
                <button onClick={() => setActiveCaseId(c.id)}
                  className={`conv-item w-full text-left ${activeCaseId === c.id ? "active" : ""}`}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="conv-item-title flex-1 min-w-0">{c.name}</div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      c.status === "Active" ? "bg-emerald-500/15 text-emerald-400" :
                      c.status === "Draft"  ? "bg-primary/15 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>{c.status}</span>
                  </div>
                  {c.client_name && <div className="conv-item-preview">{c.client_name}</div>}
                </button>
                <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
                  {showArchived ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); onUnarchiveCase(c.id); }}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary" title="Restore">
                        <ArchiveRestore className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onAskDeleteCase(c); }}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); onArchiveCase(c.id); }}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary" title="Archive">
                      <Archive className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 p-2 space-y-1.5 shrink-0">
        {isPremium && daysLeft !== null && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-primary border border-primary/30 rounded-md h-7">
            <Clock className="h-3 w-3" />
            {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
          </div>
        )}
        {!isPremium && (
          <Link to="/pricing">
            <Button variant="outline" className="w-full h-7 text-xs border-primary/40 text-primary hover:bg-primary/10">
              <Crown className="h-3 w-3 mr-1" /> Upgrade
            </Button>
          </Link>
        )}
        {isDevAccount && (
          <Button variant="outline" onClick={openPicker}
            className="w-full h-7 text-xs border-primary/40 text-primary hover:bg-primary/10">
            <Crown className="h-3 w-3 mr-1" /> Switch tier
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BODY
// ─────────────────────────────────────────────────────────────────────────────
function ChatBody({ messages, saveNotes, notes, bottomRef }: {
  messages: MsgRow[]; saveNotes: (s: string) => void;
  notes: string; bottomRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto">
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
                  <div className="bubble-user">{m.content}</div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-gold p-1">
                    <img src={logoIcon} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bubble-ai">
                      {m.content
                        ? <MiniMarkdown text={m.content} />
                        : <span className="text-muted-foreground text-sm animate-pulse-soft">…thinking</span>
                      }
                    </div>
                    {!!m.citations?.length && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {m.citations.map((c) => <span key={c} className="badge-indigo">{c}</span>)}
                      </div>
                    )}
                    {m.content && (
                      <div className="flex items-center gap-1 mt-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }}>
                          <Copy className="h-3 w-3" /> Copy
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => { saveNotes((notes ? notes + "\n\n" : "") + m.content); toast.success("Saved to notes"); }}>
                          <Save className="h-3 w-3" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary">
                          <Bookmark className="h-3 w-3" /> Bookmark
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary">
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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT BAR
// ─────────────────────────────────────────────────────────────────────────────
function InputBar({ input, setInput, send, streaming, handleFileUpload, profileName, profileState, activeCaseName, onPickCase }: {
  input: string; setInput: (s: string) => void; send: () => void;
  streaming: boolean; handleFileUpload: (f: File) => void;
  profileName?: string | null; profileState?: string | null;
  activeCaseName?: string | null; onPickCase?: () => void;
}) {
  return (
    <div className="border-t border-border/60 p-3 md:p-4 glass-subtle">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {profileName || "You"}{profileState ? ` · ${profileState}` : ""}
          </span>
          <button type="button" onClick={onPickCase}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors ${
              activeCaseName ? "border-primary/60 text-primary hover:bg-primary/10" : "border-border/60 text-muted-foreground"
            }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${activeCaseName ? "bg-primary" : "bg-muted-foreground/50"}`} />
            {activeCaseName ? `Case: ${activeCaseName}` : "No case · pick one"}
          </button>
          <span className="text-muted-foreground/70 ml-auto hidden sm:inline">Bhramar uses your profile + case as context</span>
        </div>
        <div className="chat-input-wrap flex items-end gap-2">
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-primary shrink-0" asChild>
            <label className="cursor-pointer flex items-center justify-center">
              <Paperclip className="h-4 w-4" />
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </label>
          </Button>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Bhramar.ai anything about your case..." rows={1}
            className="flex-1 min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-sm"
          />
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-primary shrink-0">
            <Mic className="h-4 w-4" />
          </Button>
          <button onClick={send} disabled={!input.trim() || streaming} className="btn-send">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION PANELS (inline, no external imports needed)
// ─────────────────────────────────────────────────────────────────────────────

function OverviewPanel({ cases, tier, daysLeft, profile }: {
  cases: CaseRow[]; tier: Tier; daysLeft: number | null; profile: any;
}) {
  const activeCases  = cases.filter((c) => c.status === "Active"  && !c.archived_at).length;
  const draftCases   = cases.filter((c) => c.status === "Draft"   && !c.archived_at).length;
  const closedCases  = cases.filter((c) => c.status === "Closed"  && !c.archived_at).length;
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">Here's a snapshot of your practice.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Cases",  value: activeCases,  color: "text-emerald-400", Icon: CheckCircle2   },
            { label: "Draft Cases",   value: draftCases,   color: "text-primary",     Icon: Circle         },
            { label: "Closed Cases",  value: closedCases,  color: "text-muted-foreground", Icon: FolderClosed },
            { label: "Plan",          value: tier,         color: "text-primary",     Icon: Crown          },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="glass border border-border/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Subscription */}
        {(tier === "Pro" || tier === "Firm") && daysLeft !== null && (
          <div className="glass border border-primary/30 rounded-xl p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Subscription active</p>
              <p className="text-xs text-muted-foreground">
                {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining` : "Subscription expired — please renew"}
              </p>
            </div>
            {daysLeft <= 7 && (
              <Link to="/pricing" className="ml-auto">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs">Renew</Button>
              </Link>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "New Chat",     Icon: MessageSquare, tab: "chat"      as TabType },
              { label: "New Case",     Icon: FolderClosed,  tab: "cases"     as TabType },
              { label: "My Clients",   Icon: UsersRound,    tab: "clients"   as TabType },
              { label: "Finance",      Icon: IndianRupee,   tab: "finance"   as TabType },
              { label: "Calendar",     Icon: CalendarDays,  tab: "calendar"  as TabType },
              { label: "AI Assistant", Icon: Bot,           tab: "assistant" as TabType },
            ].map(({ label, Icon, tab }) => (
              <div key={label}
                className="glass border border-border/60 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Clients</h2>
          <Button className="bg-primary text-primary-foreground text-sm h-9">
            <Plus className="h-4 w-4" /> Add client
          </Button>
        </div>
        <div className="text-center py-16">
          <UsersRound className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No clients added yet.</p>
          <p className="text-xs text-muted-foreground">Add clients to link them with cases and track communications.</p>
        </div>
      </div>
    </div>
  );
}

function TeamUpPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto text-center py-20">
        <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Team Up</h2>
        <p className="text-muted-foreground mb-6">Collaborate with other advocates on shared cases.</p>
        <Link to="/teams">
          <Button className="bg-primary text-primary-foreground">Open Teams</Button>
        </Link>
      </div>
    </div>
  );
}

function CourtCellsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto text-center py-20">
        <Scale className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Court Cells</h2>
        <p className="text-muted-foreground mb-6">Connect and collaborate with other advocates across India.</p>
        <Link to="/network">
          <Button className="bg-primary text-primary-foreground">Open Network</Button>
        </Link>
      </div>
    </div>
  );
}

function LegalNewsPanel() {
  const [news, setNews] = useState<{ title: string; summary: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder — replace with real news API / supabase fetch
    setTimeout(() => {
      setNews([
        { title: "Supreme Court ruling on digital privacy", summary: "Landmark judgment expands citizens' right to data protection under Article 21.", date: "May 2026" },
        { title: "High Court upholds GST input credit rules", summary: "Bombay HC clarifies ITC eligibility for construction-related expenses.", date: "May 2026" },
        { title: "NCLT updates insolvency timelines", summary: "New circular mandates 180-day resolution cap for MSME debtors.", date: "Apr 2026" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Legal News</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass border border-border/60 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-1" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((item, i) => (
              <div key={i} className="glass border border-border/60 rounded-xl p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <span className="text-[10px] text-muted-foreground shrink-0">{item.date}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FinancePanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Finance</h2>
          <Button className="bg-primary text-primary-foreground text-sm h-9">
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Received",  value: "₹0",       color: "text-emerald-400" },
            { label: "Outstanding",     value: "₹0",       color: "text-amber-400"   },
            { label: "This Month",      value: "₹0",       color: "text-primary"     },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass border border-border/60 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="text-center py-12">
          <IndianRupee className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No transactions yet. Record your first payment to get started.</p>
        </div>
      </div>
    </div>
  );
}

function CalendarPanel() {
  const today = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Calendar & Tasks</h2>
          <Button className="bg-primary text-primary-foreground text-sm h-9">
            <Plus className="h-4 w-4" /> Add event
          </Button>
        </div>

        <div className="glass border border-border/60 rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-4 text-center">
            {months[today.getMonth()]} {today.getFullYear()}
          </h3>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((d) => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <button key={day}
                className={`h-8 w-full rounded-lg text-xs transition-colors ${
                  day === today.getDate()
                    ? "bg-primary text-primary-foreground font-bold"
                    : "hover:bg-accent/40 text-foreground"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Upcoming hearings & tasks</h3>
          <div className="text-center py-8">
            <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events scheduled yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesPanel({ notes, saveNotes, activeCaseId }: {
  notes: string; saveNotes: (v: string) => void; activeCaseId: string | null;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Notes</h2>
        {!activeCaseId ? (
          <div className="text-center py-12">
            <StickyNote className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a case from the sidebar to take notes.</p>
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
  );
}

function FilesPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Files & Email</h2>
          <Button className="bg-primary text-primary-foreground text-sm h-9">
            <Plus className="h-4 w-4" /> Upload file
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="glass border border-border/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Files className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Documents</h3>
            </div>
            <p className="text-xs text-muted-foreground">No documents uploaded yet. Upload case files, contracts, or evidence.</p>
          </div>
          <div className="glass border border-border/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Email Integration</h3>
            </div>
            <p className="text-xs text-muted-foreground">Connect your email to manage case correspondence directly.</p>
            <Button variant="outline" size="sm" className="mt-3 border-primary/40 text-primary text-xs h-7">Connect email</Button>
          </div>
        </div>
        <div className="text-center py-8">
          <Files className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No files yet.</p>
        </div>
      </div>
    </div>
  );
}

function AIAssistantPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">AI Assistant Hub</h2>
        <p className="text-sm text-muted-foreground mb-6">Specialised AI tools for legal practice.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { title: "Draft Contract",      desc: "Generate contracts, agreements, and legal documents.",    Icon: FileText      },
            { title: "Research Assistant",  desc: "Search case law, statutes, and legal precedents.",        Icon: Bot           },
            { title: "Summarise Document",  desc: "Extract key points from lengthy legal documents.",        Icon: StickyNote    },
            { title: "Risk Analysis",       desc: "Identify legal risks in contracts and case strategies.",  Icon: AlertTriangle },
            { title: "Argument Builder",    desc: "Structure arguments and identify counter-arguments.",     Icon: Gavel         },
            { title: "Citation Finder",     desc: "Find relevant case citations for your arguments.",        Icon: Bookmark      },
          ].map(({ title, desc, Icon }) => (
            <div key={title} className="glass border border-border/60 rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoCallsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Video Calls</h2>
        <p className="text-sm text-muted-foreground mb-6">Schedule and join client consultations and court hearings.</p>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="glass border border-primary/30 rounded-xl p-5 text-center hover:border-primary/60 transition-colors cursor-pointer">
            <Video className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Start Instant Call</h3>
            <p className="text-xs text-muted-foreground">Begin a video call immediately with a client.</p>
          </div>
          <div className="glass border border-border/60 rounded-xl p-5 text-center hover:border-primary/40 transition-colors cursor-pointer">
            <CalendarDays className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Schedule Call</h3>
            <p className="text-xs text-muted-foreground">Book a future consultation and send an invite.</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Upcoming calls</h3>
          <div className="text-center py-8">
            <Phone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No scheduled calls.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DarbarPanel({ activeCaseId }: { activeCaseId: string | null }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto text-center py-20">
        <Gavel className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Darbar</h2>
        <p className="text-muted-foreground mb-6">Virtual moot court — argue your case with AI judges.</p>
        {activeCaseId ? (
          <Link to={`/cases/${activeCaseId}/darbar`}>
            <Button className="bg-primary text-primary-foreground">Enter Darbar</Button>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Select a case from the sidebar to enter Darbar.</p>
        )}
      </div>
    </div>
  );
}

function ProfilePanel({ profile, userEmail, tier, daysLeft, isDevAccount, openPicker, onLogout }: {
  profile: any; userEmail?: string | null; tier: Tier;
  daysLeft: number | null; isDevAccount: boolean; openPicker: () => void; onLogout: () => void;
}) {
  const isPremium = tier === "Pro" || tier === "Firm";
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-4">
            {(profile?.full_name || userEmail || "U")[0].toUpperCase()}
          </div>
          <h2 className="text-2xl font-semibold">{profile?.full_name || "Advocate"}</h2>
          <p className="text-muted-foreground">{userEmail}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              tier === "Pro" ? "bg-primary/15 text-primary" :
              tier === "Firm" ? "bg-emerald-500/15 text-emerald-400" :
              "bg-muted text-muted-foreground"
            }`}>
              {tier === "Pro" ? "Advocate" : tier === "Firm" ? "Firm" : "Free"}
            </span>
          </div>
        </div>

        {isPremium && daysLeft !== null && (
          <div className="glass border border-primary/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Subscription</span>
            </div>
            <p className="text-sm">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining` : "Subscription expired"}
            </p>
          </div>
        )}

        {profile?.state && (
          <div className="glass border border-border/60 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">State</p>
            <p className="text-sm">{profile.state}</p>
          </div>
        )}

        {isDevAccount && (
          <Button onClick={openPicker} variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10">
            <Crown className="h-4 w-4" /> Switch Tier (Dev)
          </Button>
        )}
        {!isPremium && (
          <Link to="/pricing">
            <Button className="w-full bg-primary text-primary-foreground">
              <Crown className="h-4 w-4" /> Upgrade to Pro
            </Button>
          </Link>
        )}
        <Link to="/dashboard">
          <Button variant="outline" className="w-full">
            <Settings className="h-4 w-4" /> Settings
          </Button>
        </Link>
        <Button onClick={onLogout} variant="ghost" className="w-full text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile,       setProfile]       = useState<any>(null);
  const [cases,         setCases]         = useState<CaseRow[]>([]);
  const [activeCaseId,  setActiveCaseId]  = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [activeConvId,  setActiveConvId]  = useState<string | null>(null);
  const [messages,      setMessages]      = useState<MsgRow[]>([]);
  const [input,         setInput]         = useState("");
  const [streaming,     setStreaming]     = useState(false);
  const [notes,         setNotes]         = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [createCaseOpen,  setCreateCaseOpen]  = useState(false);
  const [freeChatHistory, setFreeChatHistory] = useState<ConvRow[]>([]);
  const [showArchived,    setShowArchived]    = useState(false);
  const [deleteTarget,    setDeleteTarget]    = useState<CaseRow | null>(null);
  const [activeTab,       setActiveTab]       = useState<TabType>("chat");
  const [railExpanded,    setRailExpanded]    = useState(false);
  const [sideExpanded,    setSideExpanded]    = useState(true);

  // Dev tier
  const isDevAccount = (user?.email || "").toLowerCase() === "bhramar123@gmail.com";
  const [devTier,    setDevTier]    = useState<Tier | null>(null);
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

  const daysLeft: number | null = useMemo(() => {
    if (!isPremium) return null;
    const exp = profile?.subscription_expires_at as string | undefined;
    if (!exp) return null;
    return Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000));
  }, [isPremium, profile?.subscription_expires_at]);

  // Archive / unarchive / delete
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

  // Load profile + cases
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: cs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("cases").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      setProfile(p);
      setCases((cs as any) || []);
      if (cs?.length) setActiveCaseId(cs[0].id);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || isPremium) { setFreeChatHistory([]); return; }
    (async () => {
      const { data } = await supabase.from("conversations")
        .select("id, case_id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      setFreeChatHistory((data as any) || []);
    })();
  }, [user, isPremium, messages.length]);

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

  useEffect(() => {
    if (!activeConvId || !user) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeConvId).order("created_at");
      setMessages((data || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, citations: m.citations || [] })));
    })();
  }, [activeConvId, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const activeCase = useMemo(() => cases.find((c) => c.id === activeCaseId), [cases, activeCaseId]);
  const newChat = useCallback(() => { setActiveConvId(null); setMessages([]); setInput(""); }, []);
  const newCase = useCallback(() => setCreateCaseOpen(true), []);

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

    const priorMessages = messages;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
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

      if (resp.status === 429) { toast.error("Too many requests."); throw new Error("rate"); }
      if (resp.status === 402) { toast.error("AI credits exhausted."); throw new Error("credits"); }
      if (!resp.ok || !resp.body) { toast.error("Could not reach AI."); throw new Error("stream"); }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let done = false; let finalSources: any[] = [];

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx); buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") { done = true; break; }
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
          } catch { buffer = `data: ${data}\n` + buffer; break; }
        }
      }

      if (!assistantText) assistantText = "_Could not generate a response. Please try again._";
      const citations = Array.from(new Set([...finalSources.map((s: any) => s.label).filter(Boolean), ...extractCitations(assistantText)])).slice(0, 8);
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

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const MOBILE_TABS = [
    { id: "chat"     as TabType, Icon: MessageSquare,   label: "Chat"     },
    { id: "overview" as TabType, Icon: LayoutDashboard, label: "Home"     },
    { id: "cases"    as TabType, Icon: FolderClosed,    label: "Cases",   hidden: !isPremium },
    { id: "profile"  as TabType, Icon: User,            label: "Me"       },
  ];

  const activeTabLabel = ALL_TABS.find((t) => t.id === activeTab)?.label || "Bhramar";

  return (
    <div className="h-[100dvh] w-full flex bg-background text-foreground overflow-hidden">

      {/* Panel 1 — Icon Rail */}
      <IconRail
        activeTab={activeTab}
        setActiveTab={(t) => { setActiveTab(t); if (!sideExpanded) setSideExpanded(true); }}
        expanded={railExpanded}
        onToggle={() => setRailExpanded((v) => !v)}
      />

      {/* Panel 2 — Chat Sidebar */}
      <ChatSidebar
        expanded={sideExpanded}
        onToggle={() => setSideExpanded((v) => !v)}
        conversations={conversations} freeChatHistory={freeChatHistory}
        activeConvId={activeConvId} setActiveConvId={setActiveConvId}
        setActiveFreeConv={setActiveFreeConv} newChat={newChat} tier={tier}
        cases={cases} activeCaseId={activeCaseId} setActiveCaseId={setActiveCaseId}
        newCase={newCase} showArchived={showArchived} setShowArchived={setShowArchived}
        onArchiveCase={onArchiveCase} onUnarchiveCase={onUnarchiveCase}
        onAskDeleteCase={setDeleteTarget} daysLeft={daysLeft}
        isDevAccount={isDevAccount} openPicker={() => setPickerOpen(true)}
      />

      {/* Sidebar collapsed re-open strip */}
      {!sideExpanded && (
        <button onClick={() => setSideExpanded(true)} title="Open sidebar"
          className="hidden md:flex items-center justify-center w-6 border-r border-border/60 bg-background/20 hover:bg-background/40 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/60 bg-background/95 backdrop-blur-sm z-40">
        <div className="flex justify-around px-2 py-2">
          {MOBILE_TABS.map((tab) => {
            if (tab.hidden) return null;
            const Icon = tab.Icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 pb-16 md:pb-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border/60 flex items-center justify-between px-4 glass-subtle shrink-0" style={{ minHeight: 52 }}>
          <span className="font-medium text-sm truncate">{activeTabLabel}</span>
          <ThemeToggle />
        </header>

        {/* ── Tab content ── */}
        {activeTab === "chat" && (
          <>
            <ChatBody messages={messages} saveNotes={saveNotes} notes={notes} bottomRef={bottomRef} />
            <InputBar input={input} setInput={setInput} send={send} streaming={streaming}
              handleFileUpload={handleFileUpload}
              profileName={profile?.full_name || user?.email?.split("@")[0]}
              profileState={profile?.state}
              activeCaseName={activeCase?.name || null}
              onPickCase={() => setActiveTab("cases")}
            />
          </>
        )}

        {activeTab === "overview" && (
          <OverviewPanel cases={cases} tier={tier} daysLeft={daysLeft} profile={profile} />
        )}

        {activeTab === "cases" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">My Cases</h2>
                <Button onClick={newCase} className="bg-primary text-primary-foreground text-sm h-9">
                  <Plus className="h-4 w-4" /> New case
                </Button>
              </div>
              {cases.filter((c) => !c.archived_at).length === 0 ? (
                <div className="text-center py-12">
                  <FolderClosed className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No cases yet.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {cases.filter((c) => !c.archived_at).map((c) => (
                    <div key={c.id} onClick={() => { setActiveCaseId(c.id); setActiveTab("chat"); }}
                      className="glass border border-primary/20 rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-primary">{c.name}</h3>
                          {c.case_number && <p className="text-xs text-muted-foreground">#{c.case_number}</p>}
                        </div>
                        <span className={`text-[9px] px-2 py-1 rounded-full font-semibold shrink-0 ml-2 ${
                          c.status === "Active" ? "bg-emerald-500/15 text-emerald-400" :
                          c.status === "Draft"  ? "bg-primary/15 text-primary" :
                          "bg-muted text-muted-foreground"
                        }`}>{c.status}</span>
                      </div>
                      {c.client_name && <p className="text-xs text-muted-foreground">Client: {c.client_name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "clients"    && <ClientsPanel />}
        {activeTab === "teamup"     && <TeamUpPanel />}
        {activeTab === "courtcells" && <CourtCellsPanel />}
        {activeTab === "news"       && <LegalNewsPanel />}
        {activeTab === "finance"    && <FinancePanel />}
        {activeTab === "calendar"   && <CalendarPanel />}
        {activeTab === "notes"      && <NotesPanel notes={notes} saveNotes={saveNotes} activeCaseId={activeCaseId} />}
        {activeTab === "files"      && <FilesPanel />}
        {activeTab === "assistant"  && <AIAssistantPanel />}
        {activeTab === "calls"      && <VideoCallsPanel />}
        {activeTab === "darbar"     && <DarbarPanel activeCaseId={activeCaseId} />}

        {activeTab === "profile" && (
          <ProfilePanel profile={profile} userEmail={user?.email} tier={tier}
            daysLeft={daysLeft} isDevAccount={isDevAccount}
            openPicker={() => setPickerOpen(true)} onLogout={handleLogout}
          />
        )}
      </main>

      {/* Dialogs */}
      <CreateCaseDialog open={createCaseOpen} onOpenChange={setCreateCaseOpen} onCreated={onCaseCreated} />

      {isDevAccount && (
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="glass-strong border-primary/30 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gradient-aurora">Choose dashboard view</DialogTitle>
              <DialogDescription>Dev override for <span className="text-primary">{user?.email}</span>.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-2">
              {([
                { tier: "Free" as Tier, title: "Free Chat",  desc: "5 messages/day", Icon: User      },
                { tier: "Pro"  as Tier, title: "Advocate",   desc: "Cases + AI",     Icon: Crown     },
                { tier: "Firm" as Tier, title: "Firm",       desc: "Team workspace", Icon: Building2 },
              ]).map(({ tier: t, title, desc, Icon }) => (
                <button key={t} onClick={() => chooseTier(t)}
                  className={`text-left p-4 rounded-2xl glass border transition-all hover:scale-[1.01] ${
                    tier === t ? "border-primary/60" : "border-border/60 hover:border-primary/40"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{title}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                    {tier === t && <span className="text-xs text-primary font-bold">CURRENT</span>}
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="glass-strong border-destructive/30 max-w-md">
          <DialogHeader>
            <DialogTitle>Delete case forever?</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{deleteTarget?.name}</span> and all its data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirmDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tier === "Free" && <EmergencyButton variant="floating" />}
    </div>
  );
}
