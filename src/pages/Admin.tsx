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

// ---------------- Section: RAG ----------------
function RagCorpus() {
  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">RAG Corpus Upload</h1>
        <p className="text-sm text-muted-foreground">Manage Bare Acts, Judgments, and Pipeline configs.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RagZone source="corpus" title="Bare Acts / Statutes" accept=".md,.txt" />
        <RagZone source="kb" title="Judgments / Knowledge Base" accept=".md,.txt,.pdf" />
        <RagZone source="pipeline" title="AI Pipeline Rules" accept=".md,.txt" enablePreview />
      </div>
    </div>
  );
}

function RagZone({ source, title, accept, enablePreview }: { source: string; title: string; accept: string; enablePreview?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ filename: string; content: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await adminCall<{ items: any[] }>("rag_list", { source }); setItems(r.items || []); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [source]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const file_b64 = btoa(bin);
      await adminCall("rag_upload", {
        source, original_filename: file.name, mime_type: file.type, file_size_bytes: file.size, file_b64,
      });
      toast.success(`Uploaded ${file.name}`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try { await adminCall("rag_delete", { id }); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const showPreview = async (id: string) => {
    try { const r = await adminCall<{ filename: string; content: string }>("rag_preview", { id }); setPreview(r); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <div className="border-2 border-dashed border-border rounded-md p-6 text-center mb-4">
        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <input ref={fileRef} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : `Upload ${accept}`}
        </Button>
      </div>
      {loading ? <Skeleton className="h-24 w-full" /> : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>Filename</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">No files yet.</TableCell></TableRow>}
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="text-xs">{i.original_filename}</TableCell>
                <TableCell className="text-xs">{i.file_size_bytes ? `${(i.file_size_bytes/1024).toFixed(1)}KB` : "—"}</TableCell>
                <TableCell className="text-xs">{new Date(i.uploaded_at).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant={i.status === "done" ? "default" : "secondary"}>{i.status}</Badge></TableCell>
                <TableCell className="flex gap-1">
                  {enablePreview && <Button size="sm" variant="ghost" onClick={() => showPreview(i.id)}><Eye className="h-3 w-3" /></Button>}
                  <Button size="sm" variant="ghost" onClick={() => remove(i.id, i.original_filename)}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader><SheetTitle>{preview?.filename}</SheetTitle></SheetHeader>
          <pre className="mt-4 text-xs whitespace-pre-wrap font-mono overflow-auto max-h-[80vh]">{preview?.content}</pre>
        </SheetContent>
      </Sheet>
    </Card>
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
