import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Wand2, Database, Users, Briefcase, ScrollText, Settings as SettingsIcon,
  Save, Upload, Trash2, MoreHorizontal, RefreshCw, ChevronLeft, ChevronRight, Eye, FileText,
} from "lucide-react";
import { toast } from "sonner";

const SUPER_ADMIN = "bhramar123@gmail.com";

// ---------------- API helper ----------------
async function adminCall<T = any>(action: string, payload: any = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-dashboard", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ---------------- Layout ----------------
const NAV = [
  { to: "/admin/prompt", label: "Prompt Control", icon: Wand2 },
  { to: "/admin/pipeline", label: "AI Pipeline", icon: SettingsIcon },
  { to: "/admin/rag", label: "RAG Corpus", icon: Database },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/cases", label: "Cases & Chats", icon: Briefcase },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { to: "/admin/config", label: "System Config", icon: SettingsIcon },
];

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if ((user.email || "").toLowerCase() !== SUPER_ADMIN) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            <span className="font-display font-bold">Bhramar Admin</span>
          </div>
          <Badge className="mt-2 bg-gold text-primary-foreground">SUPER ADMIN</Badge>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {user.email}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Navigate to="prompt" replace />} />
          <Route path="prompt" element={<PromptControl />} />
          <Route path="pipeline" element={<AiPipelineSection />} />
          <Route path="rag" element={<RagCorpus />} />
          <Route path="users" element={<UsersSection />} />
          <Route path="cases" element={<CasesSection />} />
          <Route path="audit" element={<AuditSection />} />
          <Route path="config" element={<ConfigSection />} />
        </Routes>
      </main>
    </div>
  );
}

// ---------------- Section: Prompt ----------------
function PromptControl() {
  const [prompt, setPrompt] = useState("");
  const [version, setVersion] = useState("v1.0");
  const [versions, setVersions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const a = await adminCall<{ prompt_text: string; version_label: string }>("prompt_active");
      setPrompt(a.prompt_text || "");
      setVersion(a.version_label || "v1.0");
    } catch (e: any) { toast.error(e.message); }
    try {
      const v = await adminCall<{ items: any[] }>("prompt_versions_list");
      setVersions(v.items || []);
    } catch { /* ignore */ }
    setLoaded(true);
  };
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, []);

  const publish = async () => {
    setSaving(true);
    try {
      await adminCall("prompt_publish", { prompt_text: prompt, version_label: version });
      toast.success("Prompt published");
      await load();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };
  const restore = async (id: string) => {
    if (!confirm("Restore this version? Current prompt will be archived.")) return;
    try {
      await adminCall("prompt_restore", { id });
      toast.success("Restored");
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Prompt Control</h1>
        <p className="text-sm text-muted-foreground">The live master system prompt powering every chat.</p>
      </div>
      <Card className="p-6 space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label>Prompt version label</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v2.1" />
          </div>
          <Button onClick={publish} disabled={saving || !loaded} className="bg-gold hover:bg-gold-bright text-primary-foreground">
            <Save className="h-4 w-4" /> {saving ? "Publishing…" : "Publish Prompt"}
          </Button>
        </div>
        {!loaded ? <Skeleton className="h-80 w-full" /> : (
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={20} className="font-mono text-xs" />
        )}
        <p className="text-xs text-muted-foreground">{prompt.length} chars</p>
      </Card>
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold mb-3">Version history</h2>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Version</TableHead><TableHead>Saved</TableHead><TableHead>Length</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">No history yet.</TableCell></TableRow>}
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono">{v.version_label}</TableCell>
                <TableCell>{new Date(v.created_at).toLocaleString()}</TableCell>
                <TableCell>{v.prompt_text.length}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => restore(v.id)}>Restore</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ---------------- Section: RAG (Tabbed) ----------------
const RAG_TABS = [
  { key: "corpus", label: "Bare Acts / Statutes",       accept: ".md,.txt",        enablePreview: false },
  { key: "kb",     label: "Judgments / Knowledge Base", accept: ".md,.txt,.pdf",   enablePreview: false },
  { key: "pipeline", label: "AI Pipeline Rules",        accept: ".md,.txt",        enablePreview: true  },
] as const;

function RagCorpus() {
  const [activeTab, setActiveTab] = useState<"corpus" | "kb" | "pipeline">("corpus");
  const tab = RAG_TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-8 pt-8 pb-0">
        <h1 className="font-display text-2xl font-bold">RAG Corpus Upload</h1>
        <p className="text-sm text-muted-foreground mb-5">Manage Bare Acts, Judgments, and Pipeline configs.</p>

        {/* Tab bar */}
        <div className="flex border-b border-border">
          {RAG_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.key
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Full-page tab content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <RagZone
          key={activeTab}
          source={tab.key}
          title={tab.label}
          accept={tab.accept}
          enablePreview={tab.enablePreview}
          fullPage
        />
      </div>
    </div>
  );
}

function RagZone({
  source, title, accept, enablePreview, fullPage,
}: {
  source: string; title: string; accept: string; enablePreview?: boolean; fullPage?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ filename: string; content: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ragPage, setRagPage] = useState(0);
  const [ragPageSize, setRagPageSize] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await adminCall<{ items: any[] }>("rag_list", { source }); setItems(r.items || []); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [source]);
  const totalPages = ragPageSize === -1 ? 1 : Math.ceil(items.length / ragPageSize);
  const visibleItems = ragPageSize === -1 ? items : items.slice(ragPage * ragPageSize, (ragPage + 1) * ragPageSize);

  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const uploadMany = async (files: FileList) => {
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = ""; for (let k = 0; k < buf.length; k++) bin += String.fromCharCode(buf[k]);
        await adminCall("rag_upload", {
          source, original_filename: file.name, mime_type: file.type,
          file_size_bytes: file.size, file_b64: btoa(bin),
        });
        ok++;
      } catch (e: any) { fail++; console.error(file.name, e.message); }
      setProgress({ done: i + 1, total: files.length });
    }
    toast.success(`Uploaded ${ok}/${files.length}${fail ? ` (${fail} failed)` : ""}`);
    setUploading(false);
    setProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
    await load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try { await adminCall("rag_delete", { id }); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const reprocess = async (id: string) => {
    try { await adminCall("rag_reprocess", { id }); toast.success("Re-queued"); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const showPreview = async (id: string) => {
    try { const r = await adminCall<{ filename: string; content: string }>("rag_preview", { id }); setPreview(r); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      {/* Toolbar row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{items.length} files</Badge>
          <Select
            value={String(ragPageSize)}
            onValueChange={(v) => { setRagPageSize(Number(v)); setRagPage(0); }}
          >
            <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Show 10</SelectItem>
              <SelectItem value="50">Show 50</SelectItem>
              <SelectItem value="100">Show 100</SelectItem>
              <SelectItem value="-1">Show All</SelectItem>
            </SelectContent>
          </Select>

          {/* Selection buttons */}
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set(items.map((i) => i.id)))}>
            Select All
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set(items.filter((i) => i.status === "pending").map((i) => i.id)))}>
            Select Pending
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set(items.filter((i) => i.status === "failed").map((i) => i.id)))}>
            Select Failed
          </Button>
          {selected.size > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear ({selected.size})
            </Button>
          )}

          {/* Bulk actions — only visible when something is selected */}
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={async () => {
                for (const id of selected) await adminCall("rag_reprocess", { id }).catch(() => {});
                toast.success(`Re-queued ${selected.size} files`); setSelected(new Set()); await load();
              }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Run Worker ({selected.size})
              </Button>
              <Button size="sm" variant="outline" onClick={async () => {
                await adminCall("rag_run_now"); toast.success("Worker triggered"); setTimeout(load, 2000);
              }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
              <Button size="sm" variant="destructive" onClick={async () => {
                if (!confirm(`Delete ${selected.size} files?`)) return;
                for (const id of selected) {
                  const item = items.find((i) => i.id === id);
                  await adminCall("rag_delete", { id, name: item?.original_filename }).catch(() => {});
                }
                toast.success(`Deleted ${selected.size} files`); setSelected(new Set()); await load();
              }}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete ({selected.size})
              </Button>
            </>
          )}
        </div>

        {/* Upload button */}
        <div>
          <input
            ref={fileRef} type="file" accept={accept} multiple className="hidden"
            onChange={(e) => { const fs = e.target.files; if (fs && fs.length) uploadMany(fs); }}
          />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? `Uploading ${progress.done}/${progress.total}…` : `Upload ${accept}`}
          </Button>
        </div>
      </div>

      {/* File table — full width, no card wrapper so it fills the page */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-[40%]">Filename</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-sm text-center py-12">
                    No files yet. Upload your first file above.
                  </TableCell>
                </TableRow>
              )}
              {visibleItems.map((i) => (
                <TableRow key={i.id} className={`hover:bg-muted/30 ${selected.has(i.id) ? "bg-muted/50" : ""}`}>
                  <TableCell>
                    <input type="checkbox" checked={selected.has(i.id)}
                      onChange={(e) => setSelected((prev) => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(i.id) : next.delete(i.id);
                        return next;
                      })}
                    />
                  </TableCell>
                  <TableCell className="text-xs font-mono">{i.original_filename}</TableCell>
                  <TableCell className="text-xs">{i.file_size_bytes ? `${(i.file_size_bytes / 1024).toFixed(1)} KB` : "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(i.uploaded_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={i.status === "done" ? "default" : i.status === "failed" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(i.status === "failed" || i.status === "pending") && (
                        <Button size="sm" variant="ghost" onClick={() => reprocess(i.id)} title="Re-queue">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      {enablePreview && (
                        <Button size="sm" variant="ghost" onClick={() => showPreview(i.id)} title="Preview">
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(i.id, i.original_filename)} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
{/* Pagination footer */}
      {ragPageSize !== -1 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted-foreground text-xs">
            Showing {ragPage * ragPageSize + 1}–{Math.min((ragPage + 1) * ragPageSize, items.length)} of {items.length}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={ragPage === 0} onClick={() => setRagPage(0)}>
              «
            </Button>
            <Button size="sm" variant="outline" disabled={ragPage === 0} onClick={() => setRagPage((p) => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-3 py-1 text-xs border border-border rounded-md bg-muted">
              {ragPage + 1} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={ragPage + 1 >= totalPages} onClick={() => setRagPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" disabled={ragPage + 1 >= totalPages} onClick={() => setRagPage(totalPages - 1)}>
              »
            </Button>
          </div>
        </div>
      )}
      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader><SheetTitle>{preview?.filename}</SheetTitle></SheetHeader>
          <pre className="mt-4 text-xs whitespace-pre-wrap font-mono overflow-auto max-h-[80vh]">{preview?.content}</pre>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------- Section: Users ----------------
function UsersSection() {
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [chatUser, setChatUser] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminCall<{ items: any[]; count: number }>("users_list", {
        search, user_type: userType || undefined, tier: tier || undefined, limit, offset: page * limit,
      });
      setItems(r.items || []); setCount(r.count || 0);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [page, userType, tier]);

  const openChat = async (u: any) => {
    setChatUser(u);
    try { const r = await adminCall<{ items: any[] }>("user_chat_history", { user_id: u.id }); setChatHistory(r.items || []); }
    catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirmDel || confirmText !== confirmDel.email) return;
    try { await adminCall("user_delete", { user_id: confirmDel.id }); toast.success("Deleted"); setConfirmDel(null); setConfirmText(""); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="font-display text-2xl font-bold">User Management</h1>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(0), load())} className="max-w-xs" />
        <Button variant="outline" onClick={() => { setPage(0); load(); }}>Search</Button>
        <Select value={userType || "all"} onValueChange={(v) => { setUserType(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="User type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="citizen">Citizen</SelectItem>
            <SelectItem value="advocate">Advocate</SelectItem>
            <SelectItem value="firm_member">Firm member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tier || "all"} onValueChange={(v) => { setTier(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="Free">Free</SelectItem>
            <SelectItem value="Pro">Pro</SelectItem>
            <SelectItem value="Firm">Firm</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="p-0">
        {loading ? <Skeleton className="h-96 w-full" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Type</TableHead>
                <TableHead>Tier</TableHead><TableHead>State</TableHead><TableHead>Created</TableHead>
                <TableHead>Score</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>{u.user_type}</TableCell>
                  <TableCell><Badge variant="outline">{u.subscription_tier}</Badge></TableCell>
                  <TableCell>{u.state || "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{u.vakeel_score || 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setEditing(u)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          const days = prompt("Extend by how many days?", "30");
                          if (days) { try { await adminCall("user_extend_subscription", { user_id: u.id, days: Number(days) }); toast.success("Extended"); load(); } catch (e: any) { toast.error(e.message); } }
                        }}>Extend Subscription</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openChat(u)}>View Chat History</DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => { try { await adminCall("user_reset_password", { email: u.email }); toast.success("Reset email sent"); } catch (e: any) { toast.error(e.message); } }}>Reset Password</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDel(u)}>Delete User</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Pager page={page} setPage={setPage} count={count} limit={limit} />

      <UserEditSheet user={editing} onClose={() => setEditing(null)} onSaved={load} />

      <Sheet open={!!chatUser} onOpenChange={(o) => !o && setChatUser(null)}>
        <SheetContent className="w-[700px] sm:max-w-[700px] overflow-auto">
          <SheetHeader><SheetTitle>Chat history — {chatUser?.email}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            {chatHistory.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
            {chatHistory.map((m) => (
              <div key={m.id} className="border-l-2 border-gold pl-3">
                <div className="text-xs text-muted-foreground">{m.role} · {new Date(m.created_at).toLocaleString()}</div>
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!confirmDel} onOpenChange={(o) => { if (!o) { setConfirmDel(null); setConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete user?</DialogTitle></DialogHeader>
          <p className="text-sm">Type <span className="font-mono font-bold">{confirmDel?.email}</span> to confirm.</p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" disabled={confirmText !== confirmDel?.email} onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserEditSheet({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [patch, setPatch] = useState<any>({});
  useEffect(() => { setPatch(user || {}); }, [user]);
  if (!user) return null;
  const save = async () => {
    try {
      await adminCall("user_update", { user_id: user.id, patch: {
        full_name: patch.full_name, user_type: patch.user_type, subscription_tier: patch.subscription_tier,
        state: patch.state, district: patch.district,
        specializations: typeof patch.specializations === "string" ? patch.specializations.split(",").map((s: string) => s.trim()).filter(Boolean) : patch.specializations,
        is_available_for_emergency: patch.is_available_for_emergency,
      } });
      toast.success("Saved"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] space-y-3 overflow-auto">
        <SheetHeader><SheetTitle>Edit user</SheetTitle></SheetHeader>
        <div><Label>Full name</Label><Input value={patch.full_name || ""} onChange={(e) => setPatch({ ...patch, full_name: e.target.value })} /></div>
        <div><Label>User type</Label>
          <Select value={patch.user_type} onValueChange={(v) => setPatch({ ...patch, user_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="citizen">Citizen</SelectItem>
              <SelectItem value="advocate">Advocate</SelectItem>
              <SelectItem value="firm_member">Firm member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Tier</Label>
          <Select value={patch.subscription_tier} onValueChange={(v) => setPatch({ ...patch, subscription_tier: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Firm">Firm</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>State</Label><Input value={patch.state || ""} onChange={(e) => setPatch({ ...patch, state: e.target.value })} /></div>
          <div><Label>District</Label><Input value={patch.district || ""} onChange={(e) => setPatch({ ...patch, district: e.target.value })} /></div>
        </div>
        <div><Label>Specializations (comma-separated)</Label>
          <Input value={Array.isArray(patch.specializations) ? patch.specializations.join(", ") : (patch.specializations || "")}
            onChange={(e) => setPatch({ ...patch, specializations: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!patch.is_available_for_emergency} onCheckedChange={(c) => setPatch({ ...patch, is_available_for_emergency: c })} />
          <Label>Available for emergency</Label>
        </div>
        <Button onClick={save} className="w-full bg-gold hover:bg-gold-bright text-primary-foreground">Save</Button>
      </SheetContent>
    </Sheet>
  );
}

// ---------------- Section: Cases ----------------
function CasesSection() {
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try { const r = await adminCall<{ items: any[]; count: number }>("cases_list", { search, limit, offset: page * limit }); setItems(r.items || []); setCount(r.count || 0); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [page]);

  const view = async (c: any) => {
    try { const r = await adminCall("case_detail", { case_id: c.id }); setViewing(r); }
    catch (e: any) { toast.error(e.message); }
  };
  const doDelete = async () => {
    if (!confirmDel || confirmText !== (confirmDel.case_number || confirmDel.name)) return;
    try { await adminCall("case_delete", { case_id: confirmDel.id }); toast.success("Deleted"); setConfirmDel(null); setConfirmText(""); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="font-display text-2xl font-bold">Cases & Chats</h1>
      <div className="flex gap-2">
        <Input placeholder="Search title, number, client…" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(0), load())} className="max-w-xs" />
        <Button variant="outline" onClick={() => { setPage(0); load(); }}>Search</Button>
      </div>
      <Card className="p-0">
        {loading ? <Skeleton className="h-96 w-full" /> : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Number</TableHead><TableHead>Advocate</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.name}</TableCell>
                  <TableCell className="text-xs font-mono">{c.case_number}</TableCell>
                  <TableCell className="text-xs">{c.advocate_name}</TableCell>
                  <TableCell className="text-xs">{c.client_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => view(c)}>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(c)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDel(c)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Pager page={page} setPage={setPage} count={count} limit={limit} />

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-[800px] sm:max-w-[800px] overflow-auto">
          <SheetHeader><SheetTitle>{viewing?.case?.name}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-4 space-y-4 text-sm">
              <div><b>Number:</b> {viewing.case.case_number} · <b>Status:</b> {viewing.case.status}</div>
              <div><b>Complaint:</b> <p className="text-muted-foreground whitespace-pre-wrap">{viewing.case.complaint || "—"}</p></div>
              <div><b>AI Summary:</b> <p className="text-muted-foreground whitespace-pre-wrap">{viewing.case.ai_summary || "—"}</p></div>
              <div><b>Documents ({viewing.documents.length}):</b> <ul className="list-disc pl-5">{viewing.documents.map((d: any) => <li key={d.id}>{d.filename}</li>)}</ul></div>
              <div><b>Notes:</b><p className="text-muted-foreground whitespace-pre-wrap">{viewing.notes.map((n: any) => n.body).join("\n---\n") || "—"}</p></div>
              <div><b>Tasks ({viewing.tasks.length}):</b> <ul className="list-disc pl-5">{viewing.tasks.map((t: any) => <li key={t.id}>{t.title} — {t.status}</li>)}</ul></div>
              <div><b>Conversations:</b>
                {viewing.conversations.map((conv: any) => (
                  <div key={conv.id} className="mt-2 border-l-2 pl-3 border-gold">
                    <div className="text-xs font-semibold">{conv.title}</div>
                    {(conv.messages || []).map((m: any) => (
                      <div key={m.id} className="mt-1 text-xs">
                        <span className="font-semibold">{m.role}:</span> <span className="whitespace-pre-wrap">{m.content?.slice(0, 500)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CaseEditSheet caseRow={editing} onClose={() => setEditing(null)} onSaved={load} />

      <Dialog open={!!confirmDel} onOpenChange={(o) => { if (!o) { setConfirmDel(null); setConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete case?</DialogTitle></DialogHeader>
          <p className="text-sm">Type <span className="font-mono font-bold">{confirmDel?.case_number || confirmDel?.name}</span> to confirm. This cascades to messages, notes, tasks, and documents.</p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" disabled={confirmText !== (confirmDel?.case_number || confirmDel?.name)} onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaseEditSheet({ caseRow, onClose, onSaved }: { caseRow: any; onClose: () => void; onSaved: () => void }) {
  const [patch, setPatch] = useState<any>({});
  useEffect(() => { setPatch(caseRow || {}); }, [caseRow]);
  if (!caseRow) return null;
  const save = async () => {
    try {
      await adminCall("case_update", { case_id: caseRow.id, patch: {
        name: patch.name, status: patch.status, stage: patch.stage, priority: patch.priority, deadline: patch.deadline,
      } });
      toast.success("Saved"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] space-y-3">
        <SheetHeader><SheetTitle>Edit case</SheetTitle></SheetHeader>
        <div><Label>Title</Label><Input value={patch.name || ""} onChange={(e) => setPatch({ ...patch, name: e.target.value })} /></div>
        <div><Label>Status</Label><Input value={patch.status || ""} onChange={(e) => setPatch({ ...patch, status: e.target.value })} /></div>
        <div><Label>Stage</Label><Input value={patch.stage || ""} onChange={(e) => setPatch({ ...patch, stage: e.target.value })} /></div>
        <div><Label>Priority</Label><Input value={patch.priority || ""} onChange={(e) => setPatch({ ...patch, priority: e.target.value })} /></div>
        <div><Label>Deadline</Label><Input type="date" value={patch.deadline || ""} onChange={(e) => setPatch({ ...patch, deadline: e.target.value })} /></div>
        <Button onClick={save} className="w-full bg-gold hover:bg-gold-bright text-primary-foreground">Save</Button>
      </SheetContent>
    </Sheet>
  );
}

// ---------------- Section: Audit ----------------
function AuditSection() {
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminCall<{ items: any[]; count: number }>("audit_list", {
        action_filter: actionFilter || undefined, from: from || undefined, to: to || undefined,
        limit, offset: page * limit,
      });
      setItems(r.items || []); setCount(r.count || 0);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [page]);

  return (
    <div className="p-8 space-y-4">
      <h1 className="font-display text-2xl font-bold">Audit Log</h1>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="action…" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="max-w-xs" />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="outline" onClick={() => { setPage(0); load(); }}>Apply</Button>
      </div>
      <Card className="p-0">
        {loading ? <Skeleton className="h-96 w-full" /> : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>ID</TableHead><TableHead>Metadata</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.user_email}</TableCell>
                  <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity_type}</TableCell>
                  <TableCell className="text-xs font-mono">{r.entity_id?.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      {expanded === r.id ? "Hide" : "Show"}
                    </Button>
                    {expanded === r.id && (
                      <pre className="text-[10px] mt-1 bg-muted p-2 rounded max-w-md overflow-auto">{JSON.stringify(r.metadata, null, 2)}</pre>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Pager page={page} setPage={setPage} count={count} limit={limit} />
    </div>
  );
}

// ---------------- Section: Config ----------------
function ConfigSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const load = async () => {
    setLoading(true);
    try { const r = await adminCall<{ items: any[] }>("config_list"); setItems(r.items || []); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (key: string, value: string) => {
    try { await adminCall("config_set", { key, value }); toast.success("Saved"); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const del = async (key: string) => {
    if (!confirm(`Delete config key "${key}"?`)) return;
    try { await adminCall("config_delete", { key }); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-8 space-y-4 max-w-4xl">
      <h1 className="font-display text-2xl font-bold">System Config</h1>
      <Card className="p-0">
        {loading ? <Skeleton className="h-72 w-full" /> : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Key</TableHead><TableHead>Value</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <ConfigRow key={c.key} row={c} onSave={save} onDelete={del} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Add new key</h3>
        <div className="flex gap-2">
          <Input placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Input placeholder="value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Button onClick={async () => { if (!newKey) return; await save(newKey, newValue); setNewKey(""); setNewValue(""); }}>Add</Button>
        </div>
      </Card>
    </div>
  );
}

function ConfigRow({ row, onSave, onDelete }: { row: any; onSave: (k: string, v: string) => void; onDelete: (k: string) => void }) {
  const [v, setV] = useState(row.value);
  useEffect(() => { setV(row.value); }, [row.value]);
  const isMaster = row.key === "master_prompt";
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.key}</TableCell>
      <TableCell>
        {isMaster ? (
          <NavLink to="/admin/prompt" className="text-gold underline text-sm">Edit in Prompt Control →</NavLink>
        ) : (
          <Input value={v} onChange={(e) => setV(e.target.value)} className="text-xs" />
        )}
      </TableCell>
      <TableCell className="text-xs">{new Date(row.updated_at).toLocaleDateString()}</TableCell>
      <TableCell className="flex gap-1">
        {!isMaster && <Button size="sm" variant="outline" onClick={() => onSave(row.key, v)}>Save</Button>}
        {!isMaster && <Button size="sm" variant="ghost" onClick={() => onDelete(row.key)}><Trash2 className="h-3 w-3" /></Button>}
      </TableCell>
    </TableRow>
  );
}

// ---------------- Pager ----------------
function Pager({ page, setPage, count, limit }: { page: number; setPage: (n: number) => void; count: number; limit: number }) {
  const max = Math.ceil(count / limit);
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{count} total · page {page + 1} / {Math.max(1, max)}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3 w-3" /></Button>
        <Button size="sm" variant="outline" disabled={page + 1 >= max} onClick={() => setPage(page + 1)}><ChevronRight className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

// ---------------- Section: AI Pipeline ----------------
const PROVIDERS = [
  { value: "lovable", label: "Lovable AI Gateway" },
  { value: "google", label: "Google AI (Gemini)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "cohere", label: "Cohere" },
  { value: "custom", label: "Other (custom URL)" },
];
const SLOTS: { key: "primary" | "secondary" | "failsafe"; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary (fallback)" },
  { key: "failsafe", label: "Failsafe" },
];

function AiPipelineSection() {
  const [cfg, setCfg] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminCall<{ items: any[] }>("config_list");
      const map: Record<string, any> = {};
      for (const it of r.items) {
        if (it.key.startsWith("ai_pipeline_")) {
          try { map[it.key] = JSON.parse(it.value); } catch { map[it.key] = { provider: it.value }; }
        }
      }
      setCfg(map);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setSlot = (kind: "chat" | "embed", slot: string, patch: any) => {
    const key = `ai_pipeline_${kind}_${slot}`;
    setCfg((c) => ({ ...c, [key]: { ...(c[key] || {}), ...patch } }));
  };
  const saveSlot = async (kind: "chat" | "embed", slot: string) => {
    const key = `ai_pipeline_${kind}_${slot}`;
    try {
      await adminCall("config_set", { key, value: JSON.stringify(cfg[key] || {}) });
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); }
  };

  const renderSlot = (kind: "chat" | "embed", slot: string, label: string) => {
    const key = `ai_pipeline_${kind}_${slot}`;
    const v = cfg[key] || {};
    return (
      <Card key={key} className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">{label}</div>
          <Button size="sm" variant="outline" onClick={() => saveSlot(kind, slot)}>Save</Button>
        </div>
        <div>
          <Label className="text-xs">Provider</Label>
          <Select value={v.provider || "lovable"} onValueChange={(p) => setSlot(kind, slot, { provider: p })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Model / Endpoint</Label>
          <Input value={v.model || ""} onChange={(e) => setSlot(kind, slot, { model: e.target.value })}
            placeholder={kind === "embed" ? "models/text-embedding-004" : "google/gemini-2.5-flash"} />
        </div>
        {v.provider === "custom" && (
          <div>
            <Label className="text-xs">Custom base URL</Label>
            <Input value={v.url || ""} onChange={(e) => setSlot(kind, slot, { url: e.target.value })} placeholder="https://api.example.com/v1" />
          </div>
        )}
        <div>
          <Label className="text-xs">API key secret name</Label>
          <Input value={v.secret_name || ""} onChange={(e) => setSlot(kind, slot, { secret_name: e.target.value })}
            placeholder="GOOGLE_AI_API_KEY" />
          <p className="text-[10px] text-muted-foreground mt-1">Add the actual secret value via Lovable Cloud secrets. Never paste keys into this field.</p>
        </div>
      </Card>
    );
  };

  if (loading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold">AI Pipeline Configuration</h1>
        <p className="text-sm text-muted-foreground">Primary, fallback, and failsafe providers for chat completion and RAG embeddings.</p>
      </div>
      <section>
        <h2 className="font-semibold mb-3">Chat completion</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SLOTS.map((s) => renderSlot("chat", s.key, s.label))}
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-3">RAG embeddings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SLOTS.map((s) => renderSlot("embed", s.key, s.label))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Active embedding (hard-wired): Google AI <code>text-embedding-004</code> via <code>GOOGLE_AI_API_KEY</code> (or <code>GEMINI_API_KEY</code> fallback).
        </p>
      </section>
    </div>
  );
}
