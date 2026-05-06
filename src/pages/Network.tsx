import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Building2, Megaphone, MessageSquare, Network as NetworkIcon, Send, Users, UserPlus } from "lucide-react";

type Cell = { id: string; court_name: string; state: string | null; city: string | null; level: string; slug: string; description: string | null };
type Member = { profile_id: string; full_name: string | null; advocate_id: string | null; court_of_practice: string | null; specializations: string[] | null; vakeel_score: number | null };
type Notice = { id: string; title: string; body: string; created_at: string; pinned: boolean };
type CellMessage = { id: string; user_id: string; content: string; created_at: string };

export default function Network() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const db = supabase as any;
  const [cells, setCells] = useState<Cell[]>([]);
  const [active, setActive] = useState<Cell | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [messages, setMessages] = useState<CellMessage[]>([]);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [chat, setChat] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: all }, { data: mine }] = await Promise.all([
        db.from("court_cells").select("*").order("level").order("court_name"),
        db.rpc("my_court_cell"),
      ]);
      setCells(all ?? []);
      const selected = id ? (all ?? []).find((c: Cell) => c.id === id || c.slug === id) : mine?.[0] ?? all?.[0];
      setActive(selected ?? null);
    })();
  }, [user?.id, id]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const [{ data: m }, { data: n }, { data: ch }] = await Promise.all([
        db.rpc("list_cell_members", { _cell_id: active.id }),
        db.from("cell_notices").select("*").eq("cell_id", active.id).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(25),
        db.from("cell_messages").select("*").eq("cell_id", active.id).order("created_at", { ascending: true }).limit(100),
      ]);
      setMembers(m ?? []);
      setNotices(n ?? []);
      setMessages(ch ?? []);
    })();
    const channel = supabase
      .channel(`court-cell-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cell_messages", filter: `cell_id=eq.${active.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as CellMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id]);

  const grouped = useMemo(() => ({
    supreme: cells.filter((c) => c.level === "supreme_court"),
    high: cells.filter((c) => c.level === "high_court"),
    district: cells.filter((c) => c.level === "district_court"),
  }), [cells]);

  const postNotice = async () => {
    if (!user || !active || !noticeTitle.trim() || !noticeBody.trim()) return;
    const { error } = await db.from("cell_notices").insert({ cell_id: active.id, posted_by: user.id, title: noticeTitle.trim(), body: noticeBody.trim() });
    if (error) return toast.error(error.message);
    setNoticeTitle(""); setNoticeBody(""); toast.success("Notice posted");
    const { data } = await db.from("cell_notices").select("*").eq("cell_id", active.id).order("created_at", { ascending: false });
    setNotices(data ?? []);
  };

  const sendMessage = async () => {
    if (!user || !active || !chat.trim()) return;
    const text = chat.trim();
    setChat("");
    const { error } = await db.from("cell_messages").insert({ cell_id: active.id, user_id: user.id, content: text });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/70 backdrop-blur">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          <h1 className="font-display text-lg font-semibold">Advocate Cells</h1>
          <Link to="/teams"><Button size="sm" variant="outline"><UserPlus className="h-4 w-4" /> Team Up</Button></Link>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8 grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="p-4 h-fit">
          <div className="flex items-center gap-2 mb-4"><NetworkIcon className="h-5 w-5 text-gold" /><h2 className="font-semibold">Court network</h2></div>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {[...grouped.supreme, ...grouped.high, ...grouped.district].map((cell) => (
              <button key={cell.id} onClick={() => navigate(`/network/cell/${cell.slug}`)} className={`w-full text-left p-3 rounded-md border transition ${active?.id === cell.id ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30"}`}>
                <div className="text-sm font-medium">{cell.court_name}</div>
                <div className="text-xs text-muted-foreground">{cell.city || cell.state || "India"}</div>
              </button>
            ))}
          </div>
        </Card>

        <section className="space-y-5">
          {active && (
            <>
              <Card className="p-6 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
                <Badge variant="secondary" className="mb-3">{active.level.replace("_", " ")}</Badge>
                <h2 className="font-display text-3xl font-bold">{active.court_name}</h2>
                <p className="text-muted-foreground mt-2">{active.description || "Your court cell for notices, local updates, group chat, and collaboration."}</p>
              </Card>

              <Tabs defaultValue="members">
                <TabsList className="grid grid-cols-3 w-full max-w-xl"><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="notices">Notices</TabsTrigger><TabsTrigger value="chat">Chat</TabsTrigger></TabsList>
                <TabsContent value="members" className="grid md:grid-cols-2 gap-3 mt-4">
                  {members.map((m) => <Card key={m.profile_id} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{m.full_name || "Advocate"}</div><div className="text-xs text-gold font-mono">{m.advocate_id || "ID pending"}</div><div className="text-xs text-muted-foreground mt-1">{m.court_of_practice}</div></div><Link to="/teams"><Button size="sm" variant="outline"><Users className="h-4 w-4" /> Team</Button></Link></div><div className="flex flex-wrap gap-1 mt-3">{(m.specializations || []).slice(0, 3).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></Card>)}
                  {members.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2">No members visible yet for this cell.</Card>}
                </TabsContent>
                <TabsContent value="notices" className="grid lg:grid-cols-[1fr_320px] gap-4 mt-4">
                  <div className="space-y-3">{notices.map((n) => <Card key={n.id} className="p-4"><div className="flex items-center gap-2 mb-1"><Megaphone className="h-4 w-4 text-gold" /><h3 className="font-semibold">{n.title}</h3></div><p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p></Card>)}{notices.length === 0 && <Card className="p-8 text-center text-muted-foreground">No notices yet.</Card>}</div>
                  <Card className="p-4 h-fit space-y-3"><Input placeholder="Notice title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} /><Textarea placeholder="Post court update, cause-list note, local filing alert…" value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} rows={5} /><Button onClick={postNotice} className="w-full"><Megaphone className="h-4 w-4" /> Post notice</Button></Card>
                </TabsContent>
                <TabsContent value="chat" className="mt-4"><Card className="p-4"><div className="h-[420px] overflow-y-auto space-y-3 mb-3">{messages.map((m) => <div key={m.id} className={`flex ${m.user_id === user?.id ? "justify-end" : "justify-start"}`}><div className="max-w-[80%] rounded-md border border-border bg-card px-3 py-2 text-sm">{m.content}</div></div>)}{messages.length === 0 && <div className="h-full flex items-center justify-center text-muted-foreground text-sm"><MessageSquare className="h-4 w-4 mr-2" /> Start the cell discussion.</div>}</div><div className="flex gap-2"><Input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }} placeholder="Message your court cell…" /><Button onClick={sendMessage}><Send className="h-4 w-4" /></Button></div></Card></TabsContent>
              </Tabs>
            </>
          )}
          {!active && <Card className="p-12 text-center"><Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No court cell found.</p></Card>}
        </section>
      </main>
    </div>
  );
}