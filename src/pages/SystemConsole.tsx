import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const SUPER_ADMIN = "bhramar123@gmail.com";
const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5.2",
];

export default function SystemConsole() {
  const { user, loading } = useAuth();
  const isAdmin = (user?.email || "").toLowerCase() === SUPER_ADMIN;

  // AI settings
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState(MODELS[0]);
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  // Logs / users / audit
  const [logs, setLogs] = useState<any[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profileSearch, setProfileSearch] = useState("");
  const [audit, setAudit] = useState<any[]>([]);
  const [stats, setStats] = useState<{ users: number; chunks: number; messages24h: number } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from("ai_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setProvider(data.provider || "gemini");
        setModel(data.model || MODELS[0]);
        setGroqModel(data.groq_model || "llama-3.3-70b-versatile");
        setSystemPrompt(data.system_prompt || "");
        setKbThreshold(data.kb_threshold ?? 0.72);
        setAllowFallback(data.allow_general_fallback ?? true);
      }
      reloadKb();
      reloadLogs();
      reloadProfiles();
      reloadAudit();
      loadStats();
    })();
  }, [isAdmin]);

  const reloadAudit = async () => {
    const { data } = await supabase.rpc("admin_list_audit", { _limit: 200 });
    setAudit(data || []);
  };
  const loadStats = async () => {
    const since = new Date(Date.now() - 86400000).toISOString();
    const [{ count: users }, { count: chunks }, { count: messages24h }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("document_chunks").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }).gte("created_at", since),
    ]);
    setStats({ users: users || 0, chunks: chunks || 0, messages24h: messages24h || 0 });
  };

  const reloadKb = async () => {
    const { data } = await supabase.rpc("admin_kb_files");
    setKbFiles(data || []);
  };
  const reloadLogs = async () => {
    const { data } = await supabase.rpc("admin_list_training_logs", { _limit: 200 });
    setLogs(data || []);
  };
  const reloadProfiles = async () => {
    const { data } = await supabase.rpc("admin_list_profiles", { _limit: 200, _offset: 0 });
    setProfiles(data || []);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md p-8 text-center">
          <ShieldCheck className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold mb-2">Restricted</h1>
          <p className="text-sm text-muted-foreground mb-4">Super-admin only.</p>
          <Link to="/app"><Button variant="outline">Back</Button></Link>
        </Card>
      </div>
    );
  }

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("ai_settings").update({
      provider, model, groq_model: groqModel, system_prompt: systemPrompt || null,
      kb_threshold: kbThreshold, allow_general_fallback: allowFallback,
      updated_at: new Date().toISOString(), updated_by: user.id,
    }).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("AI settings saved.");
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { toast.error(`${file.name}: invalid JSON`); continue; }
        const { data, error } = await supabase.functions.invoke("ingest-json-kb", {
          body: { name: file.name, items: parsed, is_global: true },
        });
        if (error) toast.error(`${file.name}: ${error.message}`);
        else toast.success(`${file.name}: ${data?.items} items, ${data?.chunks} chunks indexed`);
      }
      reloadKb();
    } finally { setUploading(false); }
  };

  const deleteKb = async (file_id: string) => {
    const { error } = await supabase.functions.invoke("admin-actions", { body: { action: "delete_kb_file", file_id } });
    if (error) toast.error(error.message); else { toast.success("Deleted"); reloadKb(); }
  };
  const toggleGlobal = async (file_id: string, is_global: boolean) => {
    const { error } = await supabase.functions.invoke("admin-actions", { body: { action: "toggle_global_kb", file_id, is_global } });
    if (error) toast.error(error.message); else reloadKb();
  };

  const setTier = async (user_id: string, tier: string) => {
    const { error } = await supabase.functions.invoke("admin-actions", { body: { action: "set_tier", user_id, tier } });
    if (error) toast.error(error.message); else { toast.success("Tier updated"); reloadProfiles(); }
  };
  const extendSub = async (user_id: string) => {
    const { error } = await supabase.functions.invoke("admin-actions", { body: { action: "extend_subscription", user_id, days: 30 } });
    if (error) toast.error(error.message); else { toast.success("+30 days"); reloadProfiles(); }
  };

  const filteredLogs = logs.filter((l) =>
    !logSearch || l.content?.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(logSearch.toLowerCase()));
  const filteredProfiles = profiles.filter((p) =>
    !profileSearch ||
    p.email?.toLowerCase().includes(profileSearch.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(profileSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to chat
          </Link>
          <div className="text-xs text-gold font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> SYSTEM · super-admin
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold mb-6">SYSTEM Console</h1>

        <Tabs defaultValue="ai">
          <TabsList>
            <TabsTrigger value="ai">AI engine</TabsTrigger>
            <TabsTrigger value="logs">Chat logs</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="ai">
            {stats && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="p-4"><div className="text-xs text-muted-foreground">Users</div><div className="text-2xl font-bold">{stats.users}</div></Card>
                <Card className="p-4"><div className="text-xs text-muted-foreground">Document chunks</div><div className="text-2xl font-bold">{stats.chunks}</div></Card>
                <Card className="p-4"><div className="text-xs text-muted-foreground">Messages · 24h</div><div className="text-2xl font-bold">{stats.messages24h}</div></Card>
              </div>
            )}
            <Card className="p-6 space-y-5">
              <div>
                <Label className="text-base font-semibold">Master system prompt</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Drives every chat platform-wide. Leave blank to use the built-in Bhramar Master Prompt.
                </p>
                <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={18}
                  placeholder="Empty = built-in Bhramar Master Prompt" className="font-mono text-xs" />
                <div className="text-xs text-muted-foreground mt-1">
                  {systemPrompt ? `${systemPrompt.length} chars — overrides built-in.` : "Using built-in prompt."}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Primary AI provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groq">Groq (fastest)</SelectItem>
                      <SelectItem value="gemini">Gemini direct</SelectItem>
                      <SelectItem value="lovable">Lovable AI Gateway</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Auto-falls back to the others on failure.</p>
                </div>
                <div>
                  <Label>Default model (Gemini / Lovable)</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Groq model id</Label>
                  <Input className="mt-1.5" value={groqModel} onChange={(e) => setGroqModel(e.target.value)}
                    placeholder="llama-3.3-70b-versatile" />
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="bg-gold hover:bg-gold-bright text-primary-foreground">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-6 space-y-3">
              <Input placeholder="Search content or email…" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
              <div className="border border-border rounded-md max-h-[60vh] overflow-y-auto divide-y divide-border">
                {filteredLogs.map((l) => (
                  <div key={l.id} className="p-3 text-sm">
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{l.user_email || l.user_id?.slice(0, 8)} · <span className="uppercase">{l.role}</span></span>
                      <span>{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap line-clamp-4">{l.content}</div>
                  </div>
                ))}
                {filteredLogs.length === 0 && <div className="p-4 text-sm text-muted-foreground">No logs.</div>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6 space-y-3">
              <Input placeholder="Search email or name…" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)} />
              <div className="border border-border rounded-md max-h-[60vh] overflow-y-auto divide-y divide-border">
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.full_name || "—"} <span className="text-muted-foreground">· {p.email}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {p.subscription_tier} · {[p.district, p.state].filter(Boolean).join(", ") || "—"} ·
                        {p.subscription_expires_at ? ` expires ${new Date(p.subscription_expires_at).toLocaleDateString()}` : " no expiry"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Select value={p.subscription_tier} onValueChange={(t) => setTier(p.id, t)}>
                        <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Free">Free</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="Firm">Firm</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => extendSub(p.id)}>+30d</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="audit">
            <Card className="p-6 space-y-3">
              <div className="text-xs text-muted-foreground">Last 200 admin actions and significant events.</div>
              <div className="border border-border rounded-md max-h-[60vh] overflow-y-auto divide-y divide-border">
                {audit.length === 0 && <div className="p-4 text-sm text-muted-foreground">No audit entries yet.</div>}
                {audit.map((a) => (
                  <div key={a.id} className="p-3 text-sm">
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{a.user_email || a.user_id?.slice(0, 8)} · <span className="font-medium text-foreground">{a.action}</span></span>
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    {a.entity_type && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.entity_type}{a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}
                      </div>
                    )}
                    {a.metadata && Object.keys(a.metadata).length > 0 && (
                      <pre className="text-[10px] mt-1 bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(a.metadata, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
