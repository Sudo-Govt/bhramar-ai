// FILE: src/pages/AdminSettings.tsx
// Bhramar.ai — Admin Settings with AI Model Switcher + Document Uploader

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ShieldCheck, FileText, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AdminUploader } from "@/components/AdminUploader";

// REMOVED: const SUPER_ADMIN = "bhramar123@gmail.com";
// Now uses env-based check via edge functions

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (default, fast)" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (deep reasoning)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (cheapest)" },
  { id: "openai/gpt-5", label: "GPT-5 (premium)" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "openai/gpt-5.2", label: "GPT-5.2 (latest reasoning)" },
];

export default function AdminSettings() {
  const { user, loading } = useAuth();
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      // Check super admin status via edge function (secure, not hardcoded)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.functions.invoke("chat", {
          body: { check_admin: true },
        });
        setIsSuperAdmin(data?.is_super_admin || false);
      }

      const { data } = await supabase.from("ai_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setModel(data.model || "google/gemini-3-flash-preview");
        setSystemPrompt(data.system_prompt || "");
      }
      setLoaded(true);
    })();
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // If not super admin, show restricted message
  if (loaded && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access admin settings.
            </p>
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ai_settings")
        .upsert({ id: 1, model, system_prompt: systemPrompt, updated_at: new Date().toISOString() });

      if (error) throw error;
      toast.success("AI settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setModel("google/gemini-3-flash-preview");
    setSystemPrompt("");
    toast.info("Reset to defaults — click Save to apply");
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-gold" />
              Admin Settings
            </h1>
            <p className="text-muted-foreground">Manage AI engine and training documents</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* AI Model Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Engine Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Chat Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This model will be used for all new chat sessions. Super admin can override per-message.
                </p>
              </div>

              <div className="space-y-2">
                <Label>System Prompt Override (Optional)</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Leave empty to use default Bhramar legal prompt..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Advanced: Override the L1 Master Identity prompt. Empty = use default.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document Uploader Section */}
          <AdminUploader />

          {/* Stats / Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Logged in as:</span>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Admin Status:</span>
                  <p className="font-medium text-green-600">Super Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
