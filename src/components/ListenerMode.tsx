// src/components/ListenerMode.tsx
// Drop this file into src/components/
// Then import and use it anywhere with: <ListenerMode caseId={activeCaseId} onClose={() => setListenerOpen(false)} />

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Save, Clock, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Web Speech API types ──────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const MAX_MS = 60 * 60 * 1000; // 60 minutes

export function ListenerMode({
  caseId,
  onClose,
}: {
  caseId?: string | null;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [interim, setInterim]         = useState("");
  const [duration, setDuration]       = useState(0);
  const [saveOpen, setSaveOpen]       = useState(false);
  const [title, setTitle]             = useState("");
  const [audioBlob, setAudioBlob]     = useState<Blob | null>(null);
  const [saving, setSaving]           = useState(false);

  const recogRef      = useRef<SpeechRecognition | null>(null);
  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);
  const streamRef     = useRef<MediaStream | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef  = useRef(0);
  const pausedMs      = useRef(0);

  // ── Helpers ────────────────────────────────────────────────────
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const extractEntities = (text: string) => {
    const people   = [...new Set(text.match(/\b(?:Mr\.|Mrs\.|Ms\.|Adv\.|Shri|Smt\.)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [])];
    const sections = [...new Set(text.match(/\b(?:Section|Sec\.|Article)\s*\d+[A-Z]?\b/gi) || [])];
    const dates    = [...new Set(text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g) || [])];
    return { people: people.slice(0, 8), sections: sections.slice(0, 8), dates: dates.slice(0, 6) };
  };

  // ── Speech recognition ────────────────────────────────────────
  const buildRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported. Please use Chrome or Edge.");
      return null;
    }
    const r = new SR();
    r.lang            = "en-IN";
    r.continuous      = true;
    r.interimResults  = true;
    r.maxAlternatives = 1;

    r.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else inter += t;
      }
      if (final) setTranscript((p) => p + final);
      setInterim(inter);
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      toast.error(`Mic error: ${e.error}`);
    };

    // Chrome stops after ~60 s — auto-restart
    r.onend = () => {
      if (isListening && !isPaused) r.start();
    };

    return r;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, isPaused]);

  // ── Start ─────────────────────────────────────────────────────
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr   = new MediaRecorder(stream, { mimeType: mime });
      audioChunks.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && audioChunks.current.push(e.data);
      mr.onstop = () => setAudioBlob(new Blob(audioChunks.current, { type: mime }));
      mr.start(1000);
      mediaRecRef.current = mr;

      const recog = buildRecognition();
      if (!recog) return;
      recogRef.current = recog;
      recog.start();

      setIsListening(true);
      setIsPaused(false);
      startTimeRef.current = Date.now() - pausedMs.current;

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDuration(elapsed);
        if (elapsed >= MAX_MS) stop();
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  // ── Pause / Resume ────────────────────────────────────────────
  const togglePause = () => {
    if (isPaused) {
      recogRef.current?.start();
      mediaRecRef.current?.resume();
      startTimeRef.current = Date.now() - pausedMs.current;
      timerRef.current = setInterval(() => setDuration(Date.now() - startTimeRef.current), 1000);
      setIsPaused(false);
    } else {
      recogRef.current?.stop();
      mediaRecRef.current?.pause();
      pausedMs.current = Date.now() - startTimeRef.current;
      clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  // ── Stop ──────────────────────────────────────────────────────
  const stop = () => {
    recogRef.current?.stop();
    mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
    setIsListening(false);
    setIsPaused(false);
    setSaveOpen(true);
    // Auto-title from first 6 words
    if (!title && transcript) {
      setTitle(transcript.trim().split(" ").slice(0, 6).join(" ") + "…");
    }
  };

  // ── Save session ──────────────────────────────────────────────
  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let audioUrl: string | null = null;

      if (audioBlob) {
        const path = `${user.id}/audio/listener-${Date.now()}.webm`;
        const { data: up, error: upErr } = await supabase.storage
          .from("case-documents")
          .upload(path, audioBlob, { upsert: false });
        if (!upErr && up) {
          const { data: urlData } = supabase.storage.from("case-documents").getPublicUrl(up.path);
          audioUrl = urlData.publicUrl;
        }
      }

      const fullText = (transcript + interim).trim();
      const entities = extractEntities(fullText);

      const { data: session, error } = await supabase
        .from("listener_sessions")
        .insert({
          user_id:          user.id,
          case_id:          caseId || null,
          title:            title || "Untitled Session",
          transcript:       fullText,
          audio_url:        audioUrl,
          duration_seconds: Math.floor(duration / 1000),
          entities,
          status:           "completed",
        })
        .select()
        .single();

      if (error) throw error;

      // If linked to a case, save an auto-note
      if (caseId && session) {
        await supabase.from("notes").update({
          body: `🎙️ **Listener Session: ${title || "Untitled"}**\n\n${fullText.slice(0, 2000)}${fullText.length > 2000 ? "…" : ""}\n\n*Auto-saved from Listener Mode*`,
        }).eq("case_id", caseId);
      }

      toast.success("Session saved to case archive.");
      setSaveOpen(false);
      onClose?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recogRef.current?.abort();
      mediaRecRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  const fullText  = transcript + interim;
  const entities  = extractEntities(fullText);
  const pct       = (duration / MAX_MS) * 100;
  const nearLimit = duration > MAX_MS - 5 * 60 * 1000;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 420, maxHeight: "80vh" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full ${isListening && !isPaused ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30"}`} />
          <span className="font-semibold text-sm">Listener Mode</span>
          {caseId && (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Linked to case</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className={nearLimit ? "text-red-400 font-medium" : ""}>{fmt(duration)} / 60:00</span>
          {onClose && (
            <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Progress ── */}
      <Progress value={pct} className="h-0.5 rounded-none shrink-0" />

      {/* ── Live transcript ── */}
      <ScrollArea className="flex-1 px-4 py-3 bg-background/30">
        {fullText ? (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{transcript}</p>
            {interim && (
              <p className="text-sm leading-relaxed text-muted-foreground/60 italic">{interim}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-36 text-muted-foreground/40">
            <Mic className="h-8 w-8 mb-2" />
            <p className="text-sm">Press the red button to start capturing…</p>
          </div>
        )}
      </ScrollArea>

      {/* ── Live entity pills ── */}
      {fullText && (entities.people.length > 0 || entities.sections.length > 0) && (
        <div className="px-4 py-2 border-t border-border/40 flex flex-wrap gap-1.5 shrink-0">
          {entities.people.map((p, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-0">👤 {p}</Badge>
          ))}
          {entities.sections.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">⚖️ {s}</Badge>
          ))}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="px-4 py-4 border-t border-border/60 flex items-center justify-center gap-4 shrink-0">
        {!isListening ? (
          <Button onClick={start} className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg p-0">
            <Mic className="h-6 w-6" />
          </Button>
        ) : (
          <>
            <Button onClick={togglePause} variant="outline" className="h-11 w-11 rounded-full p-0">
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button onClick={stop} className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg p-0">
              <Square className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* ── Save dialog ── */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="glass border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Save Listener Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">Session title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Witness examination – Sharma case"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Duration: {fmt(duration)}</p>
              <p>Transcript: {fullText.length} characters</p>
              {audioBlob && <p>Audio: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Discard</Button>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving…" : "Save to case archive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
