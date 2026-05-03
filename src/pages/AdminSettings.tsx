import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ShieldCheck, FileText, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { BHRAMAR_DEFAULT_PROMPT } from "@/lib/bhramarPrompt";

const SUPER_ADMIN = "bhramar123@gmail.com";

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

  useEffect(() => {
    (async () => {
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
  if ((user.email || "").toLowerCase() !== SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md p-8 text-center">
          <ShieldCheck className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold mb-2">Restricted</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This area is only accessible to the Bhramar super-admin.
          </p>
          <Link to="/app"><Button variant="outline">Back to app</Button></Link>
        </Card>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_settings")
      .update({ model, system_prompt: systemPrompt || null, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("AI settings updated. New chats will use these immediately.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <div className="text-xs text-gold font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Super-admin
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-10 max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">AI engine controls</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live-edit the AI model and the master system prompt used by every chat. Changes take effect on the next message.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <Label className="text-sm">AI model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">All models route through Lovable AI Gateway — no API key needed.</p>
          </div>
          <div>
            <Label className="text-sm">System prompt override</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={20}
              placeholder="Leave empty to use the built-in Bhramar Master Prompt. Anything you write here completely replaces it."
              className="mt-1.5 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {systemPrompt ? `${systemPrompt.length} chars — will replace built-in prompt.` : "Empty — built-in Bhramar Master Prompt is in use."}
            </p>
          </div>
          <Button onClick={save} disabled={!loaded || saving} className="bg-gold hover:bg-gold-bright text-primary-foreground">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
          </Button>
        </Card>
      </main>
    </div>
  );
}
