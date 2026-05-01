
## Goal

1. Implement the approved RAG plan: JSON knowledge upload, "your data first" prompt strategy, and a Groq provider added to the existing Gemini → Lovable AI fallback chain.
2. Add a **SYSTEM** super-admin console (only visible to `bhramar123@gmail.com`) accessible via a button placed under the chat history sidebar on the main chat page (`/app`).

## Part A — RAG knowledge loader (approved earlier)

### A.1 Database migration
- Add `'kb'` to the existing `chunk_source` enum.
- New table `kb_files`: `id, user_id, name, item_count, is_global bool default false, created_at`. RLS: owner read/write; super-admin sees all.
- Add columns to `ai_settings`: `provider text default 'gemini'`, `groq_model text`, `kb_threshold float default 0.72`, `allow_general_fallback bool default true`.
- Rewrite `match_chunks()` to return KB hits (global + caller's), corpus, and the caller's user docs, with a similarity boost on `source='kb'` so your data wins ties.

### A.2 Edge functions
- **`ingest-json-kb`** — accepts `{ name, items, is_global? }`, auto-detects shape (Q/A pairs, `{title,text}`, `{label,text}`, or wrapped `{items:[…]}`), chunks anything > ~1800 chars, embeds in batches of 16 via Lovable AI `text-embedding-004`, inserts as `source='kb'`. Records the file in `kb_files`. `is_global` only honored for super-admin.
- **`kb-admin`** — list / delete / toggle-global for KB files.
- **`chat`** (update) —
  - After retrieval: if any KB hit ≥ `kb_threshold`, prepend a strong "answer from KB first, mark non-KB paragraphs with `[GENERAL]`, refuse if `allow_general_fallback=false` and no KB hit" instruction.
  - Provider chain configurable via `ai_settings.provider`:
    1. **Groq** → `https://api.groq.com/openai/v1/chat/completions` (OpenAI-compatible, streaming) using `GROQ_API_KEY` and `groq_model`.
    2. **Gemini direct** → existing path.
    3. **Lovable AI gateway** → existing fallback.
  - On any non-2xx, fall through to the next provider transparently.
- Will request `GROQ_API_KEY` via the secrets flow once the user confirms they want Groq active.

## Part B — SYSTEM super-admin console

### B.1 Entry point on the chat page
- In `src/pages/Dashboard.tsx`, below the conversation history sidebar, render a **SYSTEM** button (gold accent, `Settings` icon) — visibility gated to `user.email === 'bhramar123@gmail.com'` (matches existing `is_super_admin()` SQL helper).
- Clicking opens `/system` (full-page console, not a modal — too much content).

### B.2 New page `src/pages/SystemConsole.tsx` at `/system`
Tabbed layout (`Tabs` from shadcn):

**Tab 1 — AI engine**
- Provider radio: Groq / Gemini / Lovable.
- Model dropdown (existing list) + free-text Groq model id field.
- "Add / rotate Groq API key" button → triggers secrets flow for `GROQ_API_KEY`.
- System-prompt override textarea (existing).
- Retrieval tuning: KB-strictness slider (0.6–0.85) and "Allow general-knowledge fallback" toggle.
- Live "Test prompt" box to send one query and see which provider answered + KB hits used.

**Tab 2 — RAG knowledge**
- Drop-zone for `.json` (multi-file). Shows live indexing progress.
- Table of all uploaded KB files across all users (super-admin sees everyone): name, owner email, items, scope (Mine / Global), created. Actions: Delete, Toggle global, Re-embed.
- Counter cards: total chunks by source (kb / corpus / user).

**Tab 3 — Chat logs**
- Cross-user reader of `ai_training_logs` (already mirrors every message via `mirror_message_to_training` trigger).
- Filters: user (search by email), date range, role (user/assistant), free-text search in `content`, has-citations toggle.
- Row click → side panel with full conversation thread + citations.
- Export selected rows to CSV / JSON.
- Requires a new SECURITY DEFINER SQL function `admin_list_training_logs(...)` that checks `is_super_admin()` and returns logs joined with `profiles.email`. (Avoids opening `ai_training_logs` to public RLS.)

**Tab 4 — Users & roles**
- Lists `profiles` with email, full_name, tier, subscription dates, state/district, created_at.
- Inline actions: change `subscription_tier`, extend `subscription_expires_at`, grant/revoke role in `user_roles` (`admin` / `moderator` / `user`), force sign-out (calls a new `admin-user-action` edge function using service role).
- Search + paginate.
- Same SECURITY DEFINER pattern for cross-user reads.

**Tab 5 — Audit**
- Reads `audit_log` across all users, filterable. Every super-admin action in this console writes an entry here automatically.

### B.3 New edge function `admin-actions`
Single function with action dispatch (`{action: 'set_tier' | 'extend_subscription' | 'grant_role' | 'revoke_role' | 'force_signout' | 'delete_kb_file' | 'toggle_global_kb' | 'reembed_kb_file'}`).
- Validates JWT.
- Checks super-admin via JWT email match (same rule as `is_super_admin()`).
- Uses service role for the actual mutation.
- Writes an `audit_log` row for every action.

### B.4 Schema additions for the console
- SECURITY DEFINER functions:
  - `admin_list_training_logs(_search text, _from date, _to date, _user uuid, _limit int)` — only callable when `is_super_admin()`.
  - `admin_list_profiles(_search text, _limit int, _offset int)` — same gate.
  - `admin_kb_files()` — same gate, returns kb_files joined with email + chunk count.
- No RLS changes to existing tables; everything routes through these definer functions or the `admin-actions` edge function.

## Files touched

```
supabase/migrations/<new>.sql
  - 'kb' enum value
  - kb_files table + RLS
  - ai_settings columns (provider, groq_model, kb_threshold, allow_general_fallback)
  - match_chunks v2 with kb boost
  - admin_list_* SECURITY DEFINER functions

supabase/functions/ingest-json-kb/index.ts        (new)
supabase/functions/kb-admin/index.ts              (new)
supabase/functions/admin-actions/index.ts         (new)
supabase/functions/chat/index.ts                  (KB-first prompt, Groq provider, 3-tier fallback)
supabase/config.toml                              (register new functions)

src/pages/SystemConsole.tsx                       (new — 5 tabs)
src/pages/Dashboard.tsx                           (SYSTEM button under chat history, super-admin only)
src/pages/AdminSettings.tsx                       (kept; SystemConsole is the new home — old route redirects to /system)
src/components/KbUploader.tsx                     (new shared widget; reused in Profile too)
src/pages/Profile.tsx                             ("My knowledge" tab using KbUploader, scoped to user)
src/App.tsx                                       (add /system route, gated; redirect /admin/ai → /system)
```

## Out of scope this pass

- Live web-search fallback (separate function call; we'll wire Tavily/Brave later if you want).
- Fine-tune training UI for your custom Groq model (Groq hosts fine-tunes, but training is done outside this app).
- Per-message thumbs-up/down feedback collection (easy follow-up).

## After approval

1. Run migration.
2. Deploy `ingest-json-kb`, `kb-admin`, `admin-actions`, updated `chat`.
3. Ship the UI: Dashboard SYSTEM button + `/system` page with 5 tabs.
4. Ask you for `GROQ_API_KEY` via the secrets flow when you flip provider to Groq the first time.
5. You upload a sample JSON, ask a question, and confirm KB-tagged citations come back.
