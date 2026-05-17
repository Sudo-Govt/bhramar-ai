// src/hooks/useAutoSync.ts
// Drop into src/hooks/
// This powers the "Auto Sync" checkbox in the chat bar.

import { supabase } from "@/integrations/supabase/client";

export const AUTO_SYNC_KEY = "bhramar.autoSync";

export function getAutoSync(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTO_SYNC_KEY) !== "false";
}

export function setAutoSync(val: boolean) {
  localStorage.setItem(AUTO_SYNC_KEY, val.toString());
}

// ── What the AI extracts from each chat message ───────────────────
export interface ExtractedCase {
  clientName:        string | null;
  caseType:          string | null;
  state:             string | null;
  district:          string | null;
  description:       string;
  ipcSections:       string[];
  financials:        Array<{ amount: number; currency: string; context: string }>;
  deadlines:         Array<{ date: string; description: string }>;
  priority:          "low" | "medium" | "high" | "critical";
  custodyStatus:     string | null;
}

// ── Ask AI to extract structured case data from conversation text ─
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
  "deadlines": [{"date": "2026-06-15", "description": "bail hearing scheduled"}],
  "priority": "low or medium or high or critical",
  "custodyStatus": "free or judicial_custody or police_custody or on_bail or null"
}

Do NOT include markdown, code fences, or explanation. Just the JSON.

Conversation:
${text.slice(0, 3000)}`;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || data.content || "";

    // Strip markdown fences if model wraps in them
    const clean = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as ExtractedCase;
    return parsed;
  } catch {
    return null;
  }
}

// ── Create a new case from extracted data ────────────────────────
export async function createAutoCase(
  extracted: ExtractedCase,
  userId: string,
  originalMessage: string,
  aiReply: string,
): Promise<string | null> {
  const caseName = [
    extracted.caseType || "General",
    "Matter",
    extracted.clientName ? `– ${extracted.clientName}` : "",
  ].filter(Boolean).join(" ");

  const { data: caseRow, error } = await supabase
    .from("cases")
    .insert({
      user_id:      userId,
      name:         caseName,
      client_name:  extracted.clientName,
      status:       "Active",
      type:         extracted.caseType,
      state:        extracted.state,
      district:     extracted.district,
      auto_created: true,
      source_chat:  originalMessage.slice(0, 500),
      priority:     extracted.priority,
    })
    .select("id")
    .single();

  if (error || !caseRow) return null;
  const caseId = caseRow.id;

  // Save the triggering chat as a note
  try {
    await supabase.from("notes").insert({
      case_id:   caseId,
      user_id:   userId,
      body: `🤖 **Auto-created from chat**\n\n**Summary:** ${extracted.description}\n\n**Original message:**\n${originalMessage}\n\n**Bhramar response:**\n${aiReply}`,
      note_type: "auto_sync",
    });
  } catch { /* non-fatal */ }

  // Save financial mentions
  for (const fin of extracted.financials) {
    try {
      // Uses the payments table if it exists, else silently skips
      await supabase.from("case_payments").insert({
        case_id:     caseId,
        amount:      fin.amount,
        currency:    fin.currency,
        description: fin.context,
        status:      "quoted",
        type:        "expected",
      });
    } catch { /* table may not exist yet */ }
  }

  // Save deadlines as tasks
  for (const dl of extracted.deadlines) {
    try {
      await supabase.from("tasks").insert({
        case_id:      caseId,
        title:        dl.description,
        due_date:     dl.date,
        status:       "pending",
        priority:     "high",
        auto_created: true,
      });
    } catch { /* non-fatal */ }
  }

  return caseId;
}

// ── Sync new financial/deadline mentions into an existing case ────
export async function syncToCase(
  caseId: string,
  userId: string,
  userMessage: string,
  aiReply: string,
  extracted: ExtractedCase,
): Promise<void> {
  // Always save the chat turn as a note
  try {
    await supabase.from("notes").upsert(
      {
        case_id:   caseId,
        user_id:   userId,
        body: `**Chat update:**\n${userMessage}\n\n**Bhramar:**\n${aiReply}`,
        note_type: "chat_sync",
      },
      { onConflict: "case_id" }
    );
  } catch { /* non-fatal */ }

  // Sync new financials
  for (const fin of extracted.financials) {
    try {
      await supabase.from("case_payments").insert({
        case_id:     caseId,
        amount:      fin.amount,
        currency:    fin.currency,
        description: fin.context,
        status:      "quoted",
        type:        "expected",
      });
    } catch { /* non-fatal */ }
  }
  // ADD THIS AT THE BOTTOM of src/components/AutoSyncToggle.tsx

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  // Sync new deadlines (skip duplicates by due_date)
  for (const dl of extracted.deadlines) {
    try {
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("case_id", caseId)
        .eq("due_date", dl.date)
        .maybeSingle();
      if (!existing) {
        await supabase.from("tasks").insert({
          case_id:      caseId,
          title:        dl.description,
          due_date:     dl.date,
          status:       "pending",
          auto_created: true,
        });
      }
    } catch { /* non-fatal */ }
  }
}
