import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gavel, Send, Square, Sparkles, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MiniMarkdown } from "@/lib/markdown";
import { useIsMobile } from "@/hooks/use-mobile";

type Mode = "auto" | "bench" | "opposing" | "advisor";
type Pane = "bench" | "opposing" | "advisor";
type Msg = { role: "user" | "assistant"; content: string };

const SECTION_RE = /\*\*(BENCH|OPPOSING|BHRAMAR \(private\)):\*\*([\s\S]*?)(?=\n\*\*(?:BENCH|OPPOSING|BHRAMAR \(private\)):\*\*|$)/g;

function splitAuto(text: string) {
  const out = { bench: "", opposing: "", advisor: "" };
  let m: RegExpExecArray | null;
  const re = new RegExp(SECTION_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const tag = m[1];
    const body = m[2].trim();
    if (tag === "BENCH") out.bench = body;
    else if (tag === "OPPOSING") out.opposing = body;
    else out.advisor = body;
  }
  // Fall back: stream may not yet have all three sections; show whatever is parsed.
  if (!out.bench && !out.opposing && !out.advisor) out.bench = text;
  return out;
}

export default function Darbar() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [caseRow, setCaseRow] = useState<any>(null);
  const [mode, setMode] = useState<Mode>("auto");
  const [mobilePane, setMobilePane] = useState<Pane>("bench");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [ending, setEnding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseId) return;
    supabase.from("cases").select("id, name, case_number, client_name, stage, deadline").eq("id", caseId).maybeSingle()
      .then(({ data }) => setCaseRow(data));
  }, [caseId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant")?.content || "", [messages]);
  const auto = useMemo(() => (mode === "auto" ? splitAuto(lastAssistant) : null), [mode, lastAssistant]);

  async function send() {
    if (!caseId || !input.trim() || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/darbar`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ case_id: caseId, mode, messages: next }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Darbar error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      // Push placeholder
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch { /* sidecar / non-JSON */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message || "Darbar failed");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function endSession() {
    if (!caseId || messages.length === 0) {
      toast.error("Have at least one exchange before ending the session.");
      return;
    }
    setEnding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/darbar`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ case_id: caseId, mode, messages, end_session: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("Prep note saved to case");
      // WhatsApp share
      const summary = (j.body as string) || "";
      const waText = encodeURIComponent(`Bhramar Darbar prep — ${caseRow?.name || ""}\n\n${summary.slice(0, 1500)}`);
      window.open(`https://wa.me/?text=${waText}`, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Could not save prep note");
    } finally {
      setEnding(false);
    }
  }

  if (!caseId) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220 40% 8%)" }}>
      {/* Header */}
      <header className="h-14 border-b border-white/10 px-4 flex items-center justify-between text-foreground bg-black/30 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to={`/dashboard/advocate/cases`} className="text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Gavel className="h-5 w-5 text-gold" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Darbar — moot court</div>
            <div className="text-xs text-white/60 truncate max-w-[40vw]">
              {caseRow?.name || "Loading…"} {caseRow?.case_number ? `· #${caseRow.case_number}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="auto">Full court</TabsTrigger>
              <TabsTrigger value="bench">Bench</TabsTrigger>
              <TabsTrigger value="opposing">Opposing</TabsTrigger>
              <TabsTrigger value="advisor">Advisor</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={endSession} disabled={ending || streaming} className="border-gold/40 text-gold hover:bg-gold/10">
            {ending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />}
            End & save
          </Button>
        </div>
      </header>

      {/* Body — three columns when auto, single transcript otherwise */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-3 gap-3 p-3 overflow-hidden">
        {mode === "auto" ? (
          isMobile ? (
            <>
              <Tabs value={mobilePane} onValueChange={(v) => setMobilePane(v as Pane)} className="shrink-0">
                <TabsList className="grid grid-cols-3 w-full bg-white/5 border border-white/10">
                  <TabsTrigger value="bench">Bench</TabsTrigger>
                  <TabsTrigger value="opposing">Opposing</TabsTrigger>
                  <TabsTrigger value="advisor">Advisor</TabsTrigger>
                </TabsList>
              </Tabs>
              {mobilePane === "bench" && <PaneCard title="Bench" tone="bench" body={auto?.bench || ""} streaming={streaming} />}
              {mobilePane === "opposing" && <PaneCard title="Opposing counsel" tone="opposing" body={auto?.opposing || ""} streaming={streaming} />}
              {mobilePane === "advisor" && <PaneCard title="Bhramar — private notes" tone="advisor" body={auto?.advisor || ""} streaming={streaming} />}
            </>
          ) : (
            <>
              <PaneCard title="Bench" tone="bench" body={auto?.bench || ""} streaming={streaming} />
              <PaneCard title="Opposing counsel" tone="opposing" body={auto?.opposing || ""} streaming={streaming} />
              <PaneCard title="Bhramar — private notes" tone="advisor" body={auto?.advisor || ""} streaming={streaming} />
            </>
          )
        ) : (
          <Card className="lg:col-span-3 bg-white/5 border-white/10 p-4 overflow-y-auto" ref={scrollRef as any}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-white/60 text-sm py-12 text-center">
                  State your opening submission, Counsel. The {mode === "bench" ? "Bench" : mode === "opposing" ? "opposing counsel" : "advisor"} is listening.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : ""}>
                  <Badge variant="secondary" className="mb-1 bg-white/10 text-white/70 border-0">
                    {m.role === "user" ? "You" : mode === "bench" ? "Bench" : mode === "opposing" ? "Opposing" : "Advisor"}
                  </Badge>
                  <div className={`prose prose-invert prose-sm max-w-none rounded-md p-3 ${m.role === "user" ? "bg-gold/10 border border-gold/30 inline-block text-left" : "bg-black/30 border border-white/10"}`}>
                    <MiniMarkdown text={m.content || (streaming && i === messages.length - 1 ? "…" : "")} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 bg-black/40 p-3 flex items-end gap-2">
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="State your submission, Counsel… (Ctrl/Cmd+Enter to send)"
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
          disabled={streaming}
        />
        {streaming ? (
          <Button onClick={stop} variant="destructive" size="sm">
            <Square className="h-4 w-4 mr-1" /> Stop
          </Button>
        ) : (
          <Button onClick={send} disabled={!input.trim()} className="bg-gold hover:bg-gold-bright text-primary-foreground">
            <Send className="h-4 w-4 mr-1" /> Submit
          </Button>
        )}
      </div>
    </div>
  );
}

function PaneCard({ title, tone, body, streaming }: { title: string; tone: "bench" | "opposing" | "advisor"; body: string; streaming: boolean }) {
  const accent =
    tone === "bench" ? "border-gold/40" :
    tone === "opposing" ? "border-red-500/40" :
    "border-emerald-500/40";
  const icon =
    tone === "bench" ? <Gavel className="h-4 w-4 text-gold" /> :
    tone === "opposing" ? <Square className="h-4 w-4 text-red-400" /> :
    <Sparkles className="h-4 w-4 text-emerald-400" />;
  return (
    <Card className={`bg-white/5 border ${accent} flex flex-col overflow-hidden`}>
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 text-white/80 text-xs uppercase tracking-wider">
        {icon}
        <span>{title}</span>
      </div>
      <div className="p-4 overflow-y-auto flex-1 prose prose-invert prose-sm max-w-none">
        {body
          ? <MiniMarkdown text={body} />
          : <p className="text-white/40 italic text-sm">{streaming ? "Listening…" : "Awaiting submission."}</p>}
      </div>
    </Card>
  );
}
