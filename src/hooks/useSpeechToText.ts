import { useRef, useState, useCallback } from "react";

/**
 * useSpeechToText
 *
 * Fixes applied vs. previous version:
 * 1. Language is now "en-IN" (English, India) — browser picks the FIRST
 *    entry in the lang string, so "hi-IN,en-IN" caused Hindi transcription
 *    even when the user spoke English.  Setting a single "en-IN" value makes
 *    the browser use English while still understanding Indian accents.
 *    If you want to explicitly allow both languages let the user toggle via
 *    the `lang` prop (see below).
 * 2. Exported a `lang` parameter so callers can override (e.g. for a
 *    Hindi-mode button in the future) without changing this file.
 */
export function useSpeechToText(
  onResult: (text: string) => void,
  lang = "en-IN",          // ← callers can pass "hi-IN" for a Hindi toggle
) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      : null;

  const supported = !!SpeechRecognition;

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = false;
    r.interimResults = false;
    r.lang = lang;                     // ← single language, not a comma list
    r.onstart  = () => setListening(true);
    r.onend    = () => setListening(false);
    r.onerror  = () => setListening(false);
    r.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      if (transcript) onResult(transcript);
    };
    r.start();
    recognitionRef.current = r;
  }, [SpeechRecognition, onResult, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}
