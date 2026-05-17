// FILE: src/pages/AdminSettings.tsx
// Bhramar.ai — Admin Settings with working AI Model Switcher + Document Uploader

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, ShieldCheck, FileText, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminUploader } from "@/components/AdminUploader";

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (default, fast)", provider: "google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (deep reasoning)", provider: "google" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "anthropic" },
  { id: "anthropic/claude-3-opus", label: "Claude 3 Opus", provider: "anthropic" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (cheap)", provider: "openai" },
];

const PROVIDER_STATUS = [
  { key: "lovable", label: "Lovable Gateway", secretKey: "LOVABLE_API_KEY" },
  { key: "google", label: "Google AI", secretKey: "GOOGLE_AI_API_KEY" },
  { key: "anthropic", label: "Anthropic", secretKey: "ANTHROPIC_API_KEY" },
  { key: "openai", label: "OpenAI", secretKey: "OPENAI_API_KEY" },
];

export default function AdminSettings() {
  const { user, loading } = useAuth();
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      // Check super admin status
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const { data } = await supabase.functions.invoke("admin-dashboard", {
            body: { action: "check_admin" },
          });
          setIsSuperAdmin(data?.is_super_admin || false);
        } catch (e) {
          console.error("Admin check failed:", e);
        }
      }

      // Load AI settings
      const { data } = await supabase.from("ai_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setModel(data.model || "google/gemini-2.5-flash");
        setSystemPrompt(data.system_prompt || "");
      }

      // Check provider status (which API keys are configured)
      try {
        const { data: configData } = await supabase.functions.invoke("admin-dashboard", {
          body: { action: "config_list" },
        });
        const configs = configData?.items || [];
        const status: Record<string, boolean> = {};
        for (const provider of PROVIDER_STATUS) {
          // Check if key exists in system_config or env vars
          const hasKey = configs.some((c: any) => c.key === provider.secretKey || c.key === `${provider.secretKey}_configured`);
          status[provider.key] = hasKey;
        }
        setProviderStatus(status);
      } catch (e) {
        console.error("Provider status check failed:", e);
      }

      setLoaded(true);
    };
    init();
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

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
        .upsert({ 
          id: 1, 
          model, 
          system_prompt: systemPrompt, 
          updated_at: new Date().toISOString(),
          updated_by: user.id
        });

      if (error) throw error;
      toast.success("AI settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setModel("google/gemini-2.5-flash");
    setSystemPrompt("");
    toast.info("Reset to defaults — click Save to apply");
  };

  const testModel = async () => {
    toast.info("Testing model connection...");
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [{ role: "user", content: "Say 'Bhramar AI is working' and nothing else." }],
          preferred_model: model,
        },
      });
      if (error) throw error;
      toast.success("Model responded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Model test failed");
    }
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
          {/* Provider Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PROVIDER_STATUS.map((p) => (
                  <div key={p.key} className="flex items-center gap-2 p-2 rounded-lg border">
                    {providerStatus[p.key] ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm">{p.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Green = API key configured. Amber = not configured. Add keys in Lovable Secrets.
              </p>
            </CardContent>
          </Card>

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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {m.provider}
                          </Badge>
                          {m.label}
                        </div>
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
                <Button variant="secondary" onClick={testModel}>
                  Test Model
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
