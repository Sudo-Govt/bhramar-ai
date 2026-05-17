import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const AUTO_SYNC_KEY = "bhramar.autoSync";

export function getAutoSync(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTO_SYNC_KEY) !== "false";
}

export function setAutoSync(val: boolean) {
  localStorage.setItem(AUTO_SYNC_KEY, val.toString());
}

export interface ExtractedCase {
  clientName: string | null;
  caseType: string | null;
  state: string | null;
  district: string | null;
  description: string;
  ipcSections: string[];
  financials: Array<{ amount: number; currency: string; context: string }>;
  deadlines: Array<{ date: string; description: string }>;
  priority: "low" | "medium" | "high" | "critical";
  custodyStatus: string | null;
}

export async function extractCaseData(
  text: string,
  token: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<ExtractedCase | null> {
  const prompt = `You are a legal intake assistant for an Indian law firm. 
Analyze the following conversation and extract structured case information.

Return ONLY a valid JSON object with exactly these keys (use null if unknown):
{
  "clientName": "full name of the client or accused or complainant, or null",
  "caseType": "one of: Criminal, Civil, Family, Property, Corporate, Labour, Constitutional, or null",
  "state": "Indian state name or null",
  "district": "district name or null",
  "description": "2-sentence summary of the legal matter",
  "ipcSections": ["Section 420", "Section 406"],
  "financials": [{"amount": 50000, "currency": "INR", "context": "bail surety mentioned"}],
  "deadlines": [{"date": "2026-06-15", "description": "next hearing date"}],
  "priority": "low | medium | high | critical",
  "custodyStatus": "in custody | on bail | not arrested | null"
}

Conversation: "${text}"

Return valid JSON only. No markdown, no explanations.`;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": anonKey,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        extract_only: true,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    const raw = data.choices?.[0]?.message?.content || data.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      clientName: parsed.clientName || null,
      caseType: parsed.caseType || null,
      state: parsed.state || null,
      district: parsed.district || null,
      description: parsed.description || "",
      ipcSections: Array.isArray(parsed.ipcSections) ? parsed.ipcSections : [],
      financials: Array.isArray(parsed.financials) ? parsed.financials : [],
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
      priority: ["low", "medium", "high", "critical"].includes(parsed.priority) ? parsed.priority : "medium",
      custodyStatus: parsed.custodyStatus || null,
    };
  } catch (e) {
    console.error("extractCaseData failed:", e);
    return null;
  }
}

export function AutoSyncToggle() {
  const [enabled, setEnabled] = useState(() => getAutoSync());

  useEffect(() => {
    setAutoSync(enabled);
  }, [enabled]);

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="auto-sync"
        checked={enabled}
        onCheckedChange={setEnabled}
      />
      <Label htmlFor="auto-sync" className="text-sm cursor-pointer">
        Auto Sync
      </Label>
    </div>
  );
}
