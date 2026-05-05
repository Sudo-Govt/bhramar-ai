import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeft, Send, UserPlus, Crown, Briefcase, MessageSquare, ListChecks, Trash2, Plus, Search,
} from "lucide-react";

type Team = { id: string; name: string; description: string | null; owner_id: string };
type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profile?: { full_name: string | null; advocate_id: string | null; email: string | null; avatar_url: string | null };
};
type Msg = { id: string; user_id: string; content: string; created_at: string };
type TaskRow = { id: string; title: string; status: string; due_date: string | null; assignee_id: string | null; created_by: string };
type CaseRow = { id: string; case_id: string; shared_at: string; case?: { name: string; case_number: string | null } };

export default function TeamWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [casesShared, setCasesShared] = useState<CaseRow[]>([]);
  const [text, setText] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [myCases, setMyCases] = useState<{ id: string; name: string; case_number: string | null }[]>([]);
  const [pickedCases, setPickedCases] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isOwner = team?.owner_id === user?.id;

  const load = async () => {
    if (!id) return;
    const { data: t } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
    if (!t) return navigate("/teams");
    setTeam(t);

    const { data: mems } = await supabase
      .from("team_members")
      .select("id, user_id, role, status")
      .eq("team_id", id);
    const userIds = (mems ?? []).map((m) => m.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, advocate_id, email, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    setMembers(
      (mems ?? []).map((m) => ({
        ...m,
        profile: (profs ?? []).find((p: any) => p.id === m.user_id),
      })) as Member[]
    );

    const { data: msgs } = await supabase
      .from("team_messages")
      .select("*")
      .eq("team_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(msgs ?? []);

    const { data: tk } = await supabase
      .from("team_tasks")
      .select("*")
      .eq("team_id", id)
      .order("created_at", { ascending: false });
    setTasks(tk ?? []);

    const { data: tc } = await supabase
      .from("team_cases")
      .select("id, case_id, shared_at")
      .eq("team_id", id);
    if (tc?.length) {
      const { data: caseRows } = await supabase
        .from("cases")
        .select("id, name, case_number")
        .in("id", tc.map((x) => x.case_id));
      setCasesShared(
        tc.map((x) => ({ ...x, case: caseRows?.find((c) => c.id === x.case_id) })) as CaseRow[]
      );
    } else {
      setCasesShared([]);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // Realtime chat
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`team-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim() || !user || !id) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("team_messages").insert({ team_id: id, user_id: user.id, content });
    if (error) toast.error(error.message);
  };

  const invite = async () => {
    if (!inviteId.trim() || !id || !user) return;
    const { data: adv } = await supabase.rpc("find_advocate_by_id", { _advocate_id: inviteId.trim() });
    const found = Array.isArray(adv) ? adv[0] : adv;
    if (!found) {
      toast.error("Advocate ID not found");
      return;
    }
    if (found.id === user.id) {
      toast.error("You cannot invite yourself");
      return;
    }
    const { error } = await supabase.from("team_members").insert({
      team_id: id,
      user_id: found.id,
      status: "pending",
      role: "member",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: found.id,
      type: "team_invite",
      title: "Team invitation",
      body: `You've been invited to join "${team?.name}"`,
      payload: { team_id: id },
    });
    toast.success(`Invited ${found.full_name ?? found.advocate_id}`);
    setInviteId("");
    setInviteOpen(false);
    load();
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    load();
  };

  const addTask = async () => {
    if (!taskTitle.trim() || !id || !user) return;
    const { error } = await supabase.from("team_tasks").insert({
      team_id: id,
      title: taskTitle.trim(),
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setTaskTitle("");
    load();
  };

  const toggleTask = async (t: TaskRow) => {
    const next = t.status === "done" ? "todo" : "done";
    await supabase.from("team_tasks").update({ status: next }).eq("id", t.id);
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
  };

  const openShare = async () => {
    if (!user) return;
    const { data } = await supabase.from("cases").select("id, name, case_number").eq("user_id", user.id).order("created_at", { ascending: false });
    setMyCases(data ?? []);
    setPickedCases([]);
    setShareOpen(true);
  };

  const shareCases = async () => {
    if (!id || !user || !pickedCases.length) return;
    const rows = pickedCases.map((cid) => ({ team_id: id, case_id: cid, shared_by: user.id }));
    const { error } = await supabase.from("team_cases").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Cases shared with team");
    setShareOpen(false);
    load();
  };

  const unshareCase = async (rowId: string) => {
    await supabase.from("team_cases").delete().eq("id", rowId);
    load();
  };

  if (!team) return null;

  const memberById = (uid: string) => members.find((m) => m.user_id === uid);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/teams" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Teams
          </Link>
          <div className="text-center">
            <h1 className="font-display font-semibold">{team.name}</h1>
            {team.description && <p className="text-xs text-muted-foreground">{team.description}</p>}
          </div>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-6 max-w-6xl w-full">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-2" />Chat</TabsTrigger>
            <TabsTrigger value="cases"><Briefcase className="h-4 w-4 mr-2" />Cases ({casesShared.length})</TabsTrigger>
            <TabsTrigger value="tasks"><ListChecks className="h-4 w-4 mr-2" />Tasks ({tasks.filter(t=>t.status!=='done').length})</TabsTrigger>
            <TabsTrigger value="members">Members ({members.filter(m=>m.status==='active').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card className="flex flex-col h-[60vh]">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">No messages yet — say hello.</p>
                )}
                {messages.map((m) => {
                  const mine = m.user_id === user?.id;
                  const author = memberById(m.user_id)?.profile;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine && (
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{(author?.full_name ?? "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                      )}
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-gold/15 border border-gold/30" : "bg-muted"}`}>
                        {!mine && <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">{author?.full_name ?? "Member"}</div>}
                        <div className="whitespace-pre-wrap">{m.content}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} />
                <Button onClick={send} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openShare}><Plus className="h-4 w-4 mr-2" />Share a case</Button>
            </div>
            {casesShared.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">No cases shared yet.</Card>
            ) : (
              <div className="grid gap-2">
                {casesShared.map((c) => (
                  <Card key={c.id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.case?.name ?? "Case"}</div>
                      <div className="text-xs text-muted-foreground">{c.case?.case_number}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => unshareCase(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </Card>
                ))}
              </div>
            )}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Share cases with team</DialogTitle></DialogHeader>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {myCases.map((c) => {
                    const checked = pickedCases.includes(c.id);
                    return (
                      <label key={c.id} className={`flex items-center gap-3 p-2 rounded border cursor-pointer ${checked ? "border-gold bg-gold/5" : "border-border"}`}>
                        <Checkbox checked={checked} onCheckedChange={(v) => setPickedCases(v ? [...pickedCases, c.id] : pickedCases.filter(x => x !== c.id))} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.case_number}</div>
                        </div>
                      </label>
                    );
                  })}
                  {!myCases.length && <p className="text-sm text-muted-foreground p-4 text-center">No cases yet.</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
                  <Button onClick={shareCases} disabled={!pickedCases.length}>Share {pickedCases.length || ""}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card className="p-4">
              <div className="flex gap-2 mb-4">
                <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task…" onKeyDown={(e) => e.key === "Enter" && addTask()} />
                <Button onClick={addTask} disabled={!taskTitle.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tasks yet.</p>
              ) : (
                <div className="space-y-1">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40">
                      <Checkbox checked={t.status === "done"} onCheckedChange={() => toggleTask(t)} />
                      <span className={`flex-1 text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4 space-y-3">
            {isOwner && (
              <div className="flex justify-end">
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" />Invite by Advocate ID</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Invite an advocate</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Label>Advocate ID</Label>
                      <div className="flex gap-2">
                        <Input value={inviteId} onChange={(e) => setInviteId(e.target.value.toUpperCase())} placeholder="BHR-KA-001234" />
                        <Button onClick={invite} disabled={!inviteId.trim()}><Search className="h-4 w-4" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Ask your colleague for their Advocate ID — it's on their profile page.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <div className="grid gap-2">
              {members.map((m) => (
                <Card key={m.id} className="p-3 flex items-center gap-3">
                  <Avatar><AvatarFallback>{(m.profile?.full_name ?? "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{m.profile?.full_name ?? m.profile?.email ?? "Member"}</span>
                      {m.user_id === team.owner_id && <Crown className="h-3.5 w-3.5 text-gold" />}
                      {m.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                    </div>
                    {m.profile?.advocate_id && <div className="text-xs text-muted-foreground font-mono">{m.profile.advocate_id}</div>}
                  </div>
                  {isOwner && m.user_id !== team.owner_id && (
                    <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
