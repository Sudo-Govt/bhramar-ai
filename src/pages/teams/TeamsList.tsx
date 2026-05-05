import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, ArrowRight, Inbox, Crown, ArrowLeft } from "lucide-react";

type Team = { id: string; name: string; description: string | null; owner_id: string; created_at: string };
type Invite = {
  id: string;
  team_id: string;
  status: string;
  team: { name: string; description: string | null } | null;
};

export default function TeamsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tier, setTier] = useState<string>("Free");
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const allowed = tier === "Advocate" || tier === "Firm" || tier === "Firm Pro" || tier === "Pro Plus";
  const isAdvocateTier = tier === "Advocate";
  const ownedCount = teams.filter((t) => t.owner_id === user?.id).length;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: memberRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
      supabase.from("team_members").select("team_id, status").eq("user_id", user.id).eq("status", "active"),
      supabase
        .from("team_members")
        .select("id, team_id, status, team:teams(name, description)")
        .eq("user_id", user.id)
        .eq("status", "pending"),
    ]);
    setTier(profile?.subscription_tier ?? "Free");
    const ids = (memberRows ?? []).map((r) => r.team_id);
    if (ids.length) {
      const { data: t } = await supabase.from("teams").select("*").in("id", ids).order("created_at", { ascending: false });
      setTeams(t ?? []);
    } else {
      setTeams([]);
    }
    setInvites((inviteRows ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const create = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), description: desc.trim() || null, owner_id: user.id })
      .select()
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Team created");
    setOpen(false);
    setName("");
    setDesc("");
    if (data) navigate(`/teams/${data.id}`);
  };

  const respondInvite = async (id: string, accept: boolean) => {
    const { error } = await supabase
      .from("team_members")
      .update({ status: accept ? "active" : "declined", joined_at: accept ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(accept ? "Joined team" : "Invite declined");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="font-display text-lg font-semibold">Team Up</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {!allowed ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-gold mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Team Up is an Advocate+ feature</h2>
            <p className="text-muted-foreground mb-6">
              Form private teams with other advocates, share cases and chat in realtime.
            </p>
            <Link to="/pricing"><Button>Upgrade to Advocate</Button></Link>
          </Card>
        ) : (
          <Tabs defaultValue="teams">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="teams">My Teams ({teams.length})</TabsTrigger>
                <TabsTrigger value="invites">
                  Invites {invites.length > 0 && <Badge variant="secondary" className="ml-2">{invites.length}</Badge>}
                </TabsTrigger>
              </TabsList>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> New Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Team name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. POSH Inquiry Panel" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
                    </div>
                    {isAdvocateTier && (
                      <p className="text-xs text-muted-foreground">
                        Advocate plan: {ownedCount}/3 teams · max 3 members per team
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={create} disabled={!name.trim()}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value="teams">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : teams.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No teams yet. Create one to get started.</p>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {teams.map((t) => (
                    <Card
                      key={t.id}
                      className="p-5 cursor-pointer hover:border-gold/40 transition"
                      onClick={() => navigate(`/teams/${t.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{t.name}</h3>
                            {t.owner_id === user?.id && <Crown className="h-3.5 w-3.5 text-gold shrink-0" />}
                          </div>
                          {t.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invites">
              {invites.length === 0 ? (
                <Card className="p-12 text-center">
                  <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending invites.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {invites.map((i) => (
                    <Card key={i.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{i.team?.name ?? "Team"}</h3>
                        {i.team?.description && (
                          <p className="text-xs text-muted-foreground truncate">{i.team.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => respondInvite(i.id, false)}>Decline</Button>
                        <Button size="sm" onClick={() => respondInvite(i.id, true)}>Accept</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
