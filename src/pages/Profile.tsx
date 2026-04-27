import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BhramarLogo } from "@/components/BhramarLogo";
import { ArrowLeft, MessageSquare, FileText, FolderClosed, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ queries: 0, docs: 0, cases: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p);
      const since = new Date(); since.setDate(1);
      const [{ count: q }, { count: d }, { count: c }] = await Promise.all([
        supabase.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since.toISOString()),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({ queries: q || 0, docs: d || 0, cases: c || 0 });
    })();
  }, [user]);

  const handleDelete = async () => {
    if (!confirm("Permanently delete your account and all data? This cannot be undone.")) return;
    await supabase.from("cases").delete().eq("user_id", user!.id);
    await signOut();
    toast.success("Account data cleared");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/app"><BhramarLogo /></Link>
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl space-y-6">
        <h1 className="font-display text-3xl font-bold">Your profile</h1>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-gold flex items-center justify-center text-primary-foreground font-display text-xl font-bold">
              {(profile?.full_name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <div className="font-display text-lg font-semibold">{profile?.full_name || "Advocate"}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-semibold">
              {profile?.subscription_tier || "Free"} Plan
            </span>
          </div>
        </Card>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <MessageSquare className="h-5 w-5 text-gold mb-3" />
            <div className="font-display text-2xl font-bold">{stats.queries}</div>
            <div className="text-xs text-muted-foreground mt-1">Queries this month</div>
          </Card>
          <Card className="p-5">
            <FileText className="h-5 w-5 text-gold mb-3" />
            <div className="font-display text-2xl font-bold">{stats.docs}</div>
            <div className="text-xs text-muted-foreground mt-1">Documents uploaded</div>
          </Card>
          <Card className="p-5">
            <FolderClosed className="h-5 w-5 text-gold mb-3" />
            <div className="font-display text-2xl font-bold">{stats.cases}</div>
            <div className="text-xs text-muted-foreground mt-1">Cases created</div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Subscription</h2>
          <p className="text-sm text-muted-foreground mb-4">You're on the {profile?.subscription_tier || "Free"} plan. Upgrade for unlimited queries and document analysis.</p>
          <Link to="/pricing"><Button className="bg-gold hover:bg-gold-bright text-primary-foreground">View plans</Button></Link>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Session</h2>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </Card>

        <Card className="p-6 border-destructive/40">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-semibold text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all associated data.</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleDelete}>Delete account</Button>
        </Card>
      </main>
    </div>
  );
}