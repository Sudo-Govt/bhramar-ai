import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BhramarLogo } from "@/components/BhramarLogo";
import { ArrowLeft, MessageSquare, FileText, FolderClosed, LogOut, AlertTriangle, Save, ShieldCheck, Copy, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { DemographicsForm, type Demographics } from "@/components/DemographicsForm";
import { VakeelBadge } from "@/components/VakeelBadge";
import { Switch } from "@/components/ui/switch";

const SUPER_ADMIN = "bhramar123@gmail.com";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ queries: 0, docs: 0, cases: 0 });
  const [reviews, setReviews] = useState<any[]>([]);

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
      const { data: rv } = await supabase
        .from("advocate_reviews")
        .select("id, rating, comment, created_at")
        .eq("advocate_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setReviews(rv || []);
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
              <div className="font-display text-lg font-semibold flex items-center gap-2 flex-wrap">
                {profile?.full_name || "Advocate"}
                {(profile?.user_type === "advocate" || profile?.user_type === "firm_member") && (
                  <VakeelBadge score={profile?.vakeel_score} reviewsCount={profile?.vakeel_reviews_count} size="sm" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-semibold">
              {profile?.subscription_tier || "Free"} Plan
            </span>
          </div>
        </Card>

        <Card className="p-6 border-gold/40 bg-gradient-to-br from-gold/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <BadgeCheck className="h-6 w-6 text-gold mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold">Advocate identity</h2>
              <p className="text-sm text-muted-foreground">Your professional profile on the bhramar.ai network.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">User type</Label>
              <Select
                value={profile?.user_type || "citizen"}
                onValueChange={(v) => setProfile({ ...(profile || {}), user_type: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="advocate">Advocate</SelectItem>
                  <SelectItem value="firm_member">Firm member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {profile?.advocate_id && (profile?.user_type === "advocate" || profile?.user_type === "firm_member") && (
              <div className="sm:col-span-2 p-4 rounded-lg bg-card border border-gold/30">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your Advocate ID</div>
                <div className="flex items-center gap-3">
                  <code className="font-display text-2xl font-bold text-gold tracking-wider">{profile.advocate_id}</code>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(profile.advocate_id); toast.success("Advocate ID copied"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Share this ID so other advocates can find you for Team Up.</p>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bar Council</Label>
              <Input className="mt-1" placeholder="Bar Council of Kerala" value={profile?.bar_council || ""} onChange={(e) => setProfile({ ...(profile || {}), bar_council: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Enrollment Number</Label>
              <Input className="mt-1" placeholder="K/1234/2018" value={profile?.enrollment_number || ""} onChange={(e) => setProfile({ ...(profile || {}), enrollment_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Court of practice</Label>
              <Input className="mt-1" placeholder="Kerala High Court" value={profile?.court_of_practice || ""} onChange={(e) => setProfile({ ...(profile || {}), court_of_practice: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Years of experience</Label>
              <Input className="mt-1" type="number" min={0} value={profile?.years_experience ?? ""} onChange={(e) => setProfile({ ...(profile || {}), years_experience: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specializations (comma separated)</Label>
              <Input className="mt-1" placeholder="Criminal, Family, Property" value={(profile?.specializations || []).join(", ")} onChange={(e) => setProfile({ ...(profile || {}), specializations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>

            {(profile?.user_type === "advocate" || profile?.user_type === "firm_member") && (
              <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Available for emergency consultations
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Citizens in distress will see you in emergency matches.</p>
                </div>
                <Switch
                  checked={!!profile?.is_available_for_emergency}
                  onCheckedChange={async (v) => {
                    setProfile({ ...(profile || {}), is_available_for_emergency: v });
                    if (!user) return;
                    const { error } = await supabase.from("profiles").update({ is_available_for_emergency: v }).eq("id", user.id);
                    if (error) toast.error(error.message); else toast.success(v ? "You're now available for emergencies" : "Emergency availability off");
                  }}
                />
              </div>
            )}
          </div>

          <Button
            className="mt-4 bg-gold hover:bg-gold-bright text-primary-foreground"
            onClick={async () => {
              if (!user) return;
              const { error } = await supabase.from("profiles").update({
                user_type: profile?.user_type || "citizen",
                bar_council: profile?.bar_council ?? null,
                enrollment_number: profile?.enrollment_number ?? null,
                court_of_practice: profile?.court_of_practice ?? null,
                years_experience: profile?.years_experience ?? null,
                specializations: profile?.specializations || [],
              }).eq("id", user.id);
              if (error) { toast.error(error.message); return; }
              const { data: refreshed } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
              setProfile(refreshed);
              toast.success("Advocate identity saved");
            }}
          >
            <Save className="h-4 w-4" /> Save identity
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-1">Your details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These details are sent to the AI with every question so its guidance is tailored to your situation, jurisdiction, and circumstances.
          </p>
          <DemographicsForm
            value={profile || {}}
            onChange={(next) => setProfile({ ...(profile || {}), ...next })}
          />
          <Button
            className="mt-4 bg-gold hover:bg-gold-bright text-primary-foreground"
            onClick={async () => {
              if (!user) return;
              const payload: Demographics & { id: string } = {
                id: user.id,
                full_name: profile?.full_name ?? null,
                age: profile?.age ?? null,
                gender: profile?.gender ?? null,
                religion: profile?.religion ?? null,
                marital_status: profile?.marital_status ?? null,
                has_children: profile?.has_children ?? null,
                occupation: profile?.occupation ?? null,
                earning_bracket: profile?.earning_bracket ?? null,
                family_background: profile?.family_background ?? null,
                physical_condition: profile?.physical_condition ?? null,
                prior_case_history: profile?.prior_case_history ?? null,
                state: profile?.state ?? null,
                district: profile?.district ?? null,
              };
              const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
              if (error) toast.error(error.message); else toast.success("Profile saved");
            }}
          >
            <Save className="h-4 w-4" /> Save details
          </Button>
        </Card>

        {(user?.email || "").toLowerCase() === SUPER_ADMIN && (
          <Card className="p-6 border-gold/40">
            <div className="flex items-start gap-3 mb-3">
              <ShieldCheck className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-semibold text-gold">Super-admin tools</h2>
                <p className="text-sm text-muted-foreground mt-1">Edit AI model and system prompt for the entire app.</p>
              </div>
            </div>
            <Link to="/admin/ai"><Button variant="outline" className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">Open AI controls</Button></Link>
          </Card>
        )}

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

        <TwoFactorSetup />

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