# Bhramar.ai "Must-Have" Overhaul — 5-Phase Plan (Revised)

Three corrections from the previous draft are now baked in:
- **Phase 1:** Layer 3 now explicitly includes a pgvector similarity search against `document_chunks` (existing table — already has `embedding vector` column, `match_chunks` RPC, and `corpus`/`kb`/`user` sources). Top-5 chunks are injected per turn.
- **Phase 2:** Darbar runs as its own edge function with a `mode` flag, distinct from `chat`.
- **Phase 3:** Legal Clock seeded with the **full 18 limitation entries** from the spec (not 14).

Earlier turns already shipped: onboarding, court cells, basic news panel, teams, `vakeel_score`/`is_available_for_emergency` columns on `profiles`, advocate ID generator. We extend, never duplicate.

---

## Phase 1 — Personalized AI Engine + RAG (Parts 1 + 2)
**Goal:** Every reply is grounded in WHO is asking, WHICH case, and the relevant LAW chunks.

### Prompt assembly — `supabase/functions/_shared/bhramarPrompt.ts` (rewrite)
Four layers, joined with `\n\n---\n\n`:
1. **L1 Master Identity** — the "7 rules" block from the spec (BNS/BNSS/BSA + 2024 switch logic).
2. **L2 Advocate / Citizen Identity** — pulled from `profiles`. Two variants by `user_type`.
3. **L3 Active Case Context** — only when `case_id` is present:
   - `cases` row (title, number, court, stage, next_hearing_date, opposing party, summary)
   - `clients` row (name, notes, demographics)
   - Last 5 `documents` for the case (filename + `ai_summary`)
   - Last 5 `notes` (newest first)
   - Open `tasks` (title + due_date)
   - Last 10 `messages` for the case's conversation
   - **NEW — RAG chunks:** embed the latest user message via Lovable AI Gateway (`text-embedding-3-small` or Gemini equivalent), then call existing `match_chunks(query_embedding, user_id, 5)` RPC and inject the top-5 hits as a "Relevant Law" sub-block with `act_name + section_label + content`.
4. **L4 Firm Context** — only when `user_type='firm_member'`: firm name, role, active case count, team list.

### Edge function — `supabase/functions/chat/index.ts`
- Embed query → run `match_chunks` → assemble L1-L4 → call AI provider (existing Lovable AI Gateway path).
- Cache the embedding for the request lifetime (don't re-embed for retries).
- Fail-soft: if embedding fails, still send L1+L2+L3 (without RAG) rather than erroring out.

### UI — Dashboard chat
- **AI Context panel** above the input: ✓ Profile chip · ✓ Case chip (or "No case loaded") · doc/note/task counts · "Change case" link.
- **Smart prompt suggestions** strip — 5 chips generated once per case via a lightweight call, cached in a new `case_prompt_suggestions(case_id pk, suggestions jsonb, generated_at)` table.

### Migration P1
```sql
create table case_prompt_suggestions (
  case_id uuid primary key references cases(id) on delete cascade,
  suggestions jsonb not null default '[]',
  generated_at timestamptz not null default now()
);
-- RLS: select/insert/update if user owns the case.
```

**Acceptance:** Inside a case, AI replies cite at least one section from injected RAG chunks AND mention the case by name.

---

## Phase 2 — Dashboard Rebuild + Darbar Mode (Parts 3 + 7)

### Dashboards
- **AdvocateDashboard.tsx** — 5 rows: Numbers · War Room (hearings + urgent tasks) · Case Intelligence (recent + quick actions) · Financial Snapshot (recharts on `case_payments`) · Bhramar Notices.
- **`dashboard-notices` edge function** — scans the user's cases + tasks + limitation periods, returns flagged items ("hearing in 3 days, 0 tasks", "limitation expires in N days", "doc not summarized").
- **EnterpriseDashboard.tsx** extensions: team online count, firm revenue, workload bar chart, activity feed via Realtime on `audit_log`, weekly hearings grid.

### Darbar Mode — `/cases/:id/darbar`
- New edge function **`supabase/functions/darbar/index.ts`** with a **`mode` flag** in body (`"bench" | "opposing" | "advisor" | "auto"`, default `auto`). Same 4-layer context loader as `chat`, plus a Darbar-specific system prompt that simulates Bench + Opposing + Advisor in a single turn.
- Three-column dark-courtroom UI (navy/gold tokens already in theme): Bench questions | Advocate chat | Bhramar private notes.
- "End Session" → AI summary saved as a `notes` row on the case + WhatsApp share card.

**Acceptance:** A 10-turn moot session ends with a saved prep note linked to the case.

---

## Phase 3 — Viral & Trust Tools (Parts 4 + 5 + 6)

### Legal Clock — public route `/tools/legal-clock`
Seed `limitation_periods` with **all 18 entries** from the spec:
1. Suit on a contract — 3y (Art. 55)
2. Recovery of money lent — 3y (Art. 19)
3. Cheque bounce / NI Act — 1m for complaint (S. 142)
4. Consumer complaint — 2y (CPA 2019)
5. Motor accident claim — 6m before MACT
6. Service matter / Government — 3y
7. Property possession — 12y (Art. 64/65)
8. Rent recovery — 3y
9. Matrimonial — divorce cooling-off — 1y
10. Appeal HC from Sessions — 60d (CrPC)
11. Appeal SC from HC — 90d
12. Writ petition — no strict limit, laches flagged
13. POCSO complaint — no limitation, flagged
14. Habeas corpus — none, urgent flag
15. Specific performance — 3y (Art. 54)
16. Recovery of immovable property by mortgagee — 12y
17. Industrial dispute reference — 3y from cause
18. Arbitration award challenge (Sec 34) — 3m + 30d grace

### Vakeel Score
- New table `advocate_reviews` + DB trigger that recomputes `profiles.vakeel_score` on insert using the spec formula.
- `<VakeelBadge />` component used on profile, network cards, team-up search, emergency results.

### Emergency Legal Button
- Citizen FAB + dialog (type / description / state-district / optional geolocation).
- New edge function `emergency-match` filters `is_available_for_emergency=true` + state, ordered by `vakeel_score`, returns top 3.
- Result cards: name + Vakeel badge + `tel:` button + "Paid Consultation" → reuses existing Razorpay order function with new plan code `emergency`.
- New table `emergency_consultations` logging every request.

### Migration P3
```sql
create table limitation_periods ( ... 18 rows seeded );
create table advocate_reviews (... unique(advocate_id, reviewer_user_id, case_id));
create or replace function recompute_vakeel_score(_advocate uuid) returns void ...;
create trigger trg_review_recompute after insert on advocate_reviews ...;
create table emergency_consultations ( ... );
create table notifications ( ... );  -- used by P4 too
```
RLS: `limitation_periods` public read; `advocate_reviews` insert by reviewer; `emergency_consultations` visible to both citizen + matched advocate; `notifications` per-user.

**Acceptance:** Public WhatsApp link computes a deadline; a citizen can reach a top-rated advocate in under 60 seconds.

---

## Phase 4 — Network + Onboarding Polish (Parts 8 + 9)

- **Onboarding "Watch Bhramar learn about you"** screen — animated 4-line summary using their actual profile + a hardcoded sample interaction templated to their court/specialization.
- **Network.tsx upgrade** — three tabs: My Cell · Browse Cells (SC → 25 HCs → District tree) · **Find a Colleague** (filters: specialization, court, district, score range). Cards include Vakeel badge + "Team Up" + "Refer Case" (writes to `notifications`).

**Acceptance:** New advocate finishes onboarding in 90s with a visible "aha" moment; network browsable as a tree.

---

## Phase 5 — Polish & Hardening
- Mobile responsive audit on every new page (AI Context panel, Darbar, Legal Clock, Network, Dashboard rows).
- Skeleton loaders on dashboard rows, Darbar, Legal Clock results, Network listings.
- Toast error handling on every new mutation (suggestions, review, emergency, darbar end, notification).
- RLS verification on `case_prompt_suggestions`, `advocate_reviews`, `emergency_consultations`, `notifications`, `limitation_periods`.
- Tone pass — "AI" → "Bhramar" in all new strings.

---

## What we will NOT touch
Razorpay flow, super-admin gating (`bhramar123@gmail.com`), auth flow, `CreateCaseDialog`, `ingest-document`, `summarize-conversation`, RLS on existing tables.

---

**Ready to start Phase 1 on approval.** Each phase ends with a working preview before moving on.
