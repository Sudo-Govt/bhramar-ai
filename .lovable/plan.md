## Goal
Adopt the new "Bhramar — senior advocate" prompt as the master system prompt so every chat (across all tiers, all cases) speaks in that voice and always ends with 2–4 follow-up questions.

## What changes

### 1. `supabase/functions/chat/index.ts` — replace `BASE_SYSTEM`
Replace the current short `BASE_SYSTEM` constant with the full new prompt verbatim (the "senior advocate / warmth of a trusted advisor" version, including the 4-section response structure, the document-prep offers, and the "never do" rules).

This becomes the **built-in default**. It is used whenever the super-admin has not written a custom override in `/admin/settings`.

The existing case-context injection (`ACTIVE CASE FILE`, documents, notes, payments, user demographics, tier label) stays exactly as is — it gets appended after the base prompt, so Bhramar still gets full case ground-truth on every turn.

### 2. `src/pages/AdminSettings.tsx` — seed + helper
- On first load, if `ai_settings.system_prompt` is empty, show the new prompt as a **placeholder / "Load default" button** so you (bhramar123@gmail.com) can see exactly what's running and tweak it without retyping.
- Add a small "Reset to built-in" button that clears the override (sets `system_prompt = null`), so the edge function falls back to the new `BASE_SYSTEM`.

### 3. No DB migration needed
The `ai_settings` row already exists. We're not changing its schema — only changing the fallback constant in code and adding two UI buttons.

## How it will behave after this change

```text
User sends message
   │
   ▼
chat edge function
   │  loads ai_settings.system_prompt
   │     ├── if set → use override
   │     └── if empty → use new BASE_SYSTEM (senior-advocate prompt)
   │  appends: tier + user demographics + active case file
   │  appends: full prior message history from client
   ▼
Gemini / Groq / Lovable Gateway  ──►  streamed reply
```

Every reply will follow the 4-part structure (Acknowledge → Legal Position → Action Items → Follow-up Questions) and will always close with 2–4 questions, exactly as your prompt specifies.

## Out of scope (intentional)
- No change to Anthropic — we don't use it; Gemini/Groq handle this perfectly and your existing routing stays.
- No change to the chat UI, history persistence, or case-context logic. Those already do what your second note describes.
- No change to suggestion chips — those can be a follow-up if you want the questions Bhramar asks to also render as tappable chips. Say the word and I'll add it.

## Files touched
- `supabase/functions/chat/index.ts` — swap `BASE_SYSTEM` constant
- `src/pages/AdminSettings.tsx` — "Load default" + "Reset to built-in" buttons
