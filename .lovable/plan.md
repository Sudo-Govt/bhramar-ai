
# Bhramar.ai — Major Feature Expansion Plan

This is a very large scope (7 sections + 6 viral features). Building it all in one shot will produce something fragile. I propose to ship it in **5 sequential phases**, each phase being a self-contained, working release. You approve this plan once; I then build phase-by-phase and you can verify each before I move on.

If you want a different ordering, tell me and I'll re-plan.

---

## Phase 1 — Foundation: Advocate ID, Profile, Personalized AI, Dashboard, Auth fix

The cheapest, highest-leverage layer. Nothing else works without it.

### 1.1 Schema additions (migration)
- `profiles`: add `advocate_id` (text, unique), `bar_council`, `enrollment_number`, `years_experience`, `specializations` (text[]), `user_type` (enum: citizen | advocate | firm_member), `firm_id`, `firm_role`, `vakeel_score` (numeric, default 0), `vakeel_reviews_count` (int, default 0).
- DB function `generate_advocate_id(state_code text)` → `BHR-<STATE>-<6 digit>` with uniqueness loop (mirrors existing `generate_case_number`).
- Trigger on `profiles` insert: if `user_type='advocate'` and no `advocate_id`, generate one from `state`.
- Backfill: assign IDs to existing advocate rows.

### 1.2 Profile page
- Show Advocate ID prominently with "copy" button.
- Editable fields: Bar Council, Enrollment Number, Court of Practice (already exists), Years of Experience, Specializations (multi-select chips), User Type.
- Public profile route `/u/:advocateId` (read-only view used by Team Up search and Cells).

### 1.3 Personalized AI context (Section 3 + Section 4)
Edit `supabase/functions/chat/index.ts`:
- Detect `user_type` from profile.
- Build user-type-specific context block (Citizen / Advocate / Firm) with the exact templates in your spec.
- Replace `BASE_SYSTEM` and `BHRAMAR_DEFAULT_PROMPT` with the new master prompt that lists every law in Section 4 (BNS/BNSS/BSA, IPC/CrPC/Evidence, Constitution, Civil, Family, Labour, Corporate, IP, IT/DPDP, National Security, Consumer/other), with the 7 critical rules and tone rules.
- Inject active cases / clients / firm members into context (already partially done — extend it).

### 1.4 Dashboard rebuild (Section 6)
Replace `AdvocateDashboard.tsx` and `EnterpriseDashboard.tsx`:
- Row 1: 4 metric cards (Active Cases, Today's Hearings, Pending Tasks, AI Tokens Today w/ progress).
- Row 2: Today's Hearings timeline (color-coded AM/PM) + Urgent Tasks panel (checkable).
- Row 3: Recent Cases list + Quick Actions buttons.
- Row 4: Financial snapshot — billed, pending, retainers, 6-month bar chart (recharts).
- Row 5: "Bhramar Notices" — server-side scan flagging limitation, missing docs, stale clients.
- Firm dashboard: + Team Members Active, Firm Revenue, All-cases count, Team Tasks; Team Activity Feed; Workload bar chart; Weekly hearings grid.
- Skeleton loaders (`@/components/ui/skeleton`) on every widget.
- Navy + gold theme via existing tokens; semantic colors (red/gold/green/blue) wired to design tokens — no hardcoded hex.

### 1.5 Google OAuth fix
Document is in published-domain state. As part of Phase 1, I'll verify `supabase.auth.signInWithOAuth` config and add a clear error UI on `/auth` if the broker returns a 404 (so users know to use the published domain). The infra-side fix (enabling Google in Cloud Auth Settings) the user must toggle — I'll surface a dev-mode hint banner.

---

## Phase 2 — Team Up (Section 1)

### 2.1 Schema
- `teams` (id, name, owner_id, created_at, plan_limits jsonb).
- `team_members` (team_id, user_id, role, status: pending|active|declined, joined_at).
- `team_cases` (team_id, case_id) — many-to-many for shared cases.
- `team_messages` (team_id, user_id, content, created_at) for chat.
- `team_tasks` (team_id, assignee_id, title, status, due_date).
- `team_documents` (team_id, file_id, version, edited_by, edited_at) for co-edit history.
- RLS: team members can read; only owner can add members beyond limit. Plan limit enforced via DB trigger checking `profiles.subscription_tier`:
  - Advocate: max 3 teams owned, max 3 members each.
  - Firm/Firm Pro: unlimited.

### 2.2 UI
- Sidebar "Team Up" item (visible only to Advocate+ tier).
- Search by Advocate ID → public profile card → "Send Team Request" with case multi-select OR "Open Collaboration".
- Notifications inbox (new table `notifications`): incoming requests with Accept/Decline.
- Team Workspace route `/teams/:id`:
  - Tabs: Cases · Chat · Tasks · Documents.
  - Realtime chat via `supabase.channel` subscription.
  - Document version list per file.

---

## Phase 3 — Advocate Cells & Court Network (Section 2) + Legal News (Section 5)

### 3.1 Cells
- `court_cells` table seeded with: Supreme Court, all 25 High Courts, major district courts (start with ~150 entries; expandable).
- `cell_memberships` auto-derived from `profiles.court_of_practice` (view).
- `cell_notices` (cell_id, title, body, posted_by, created_at).
- `cell_messages` for group chat.
- Routes:
  - `/network` — your Cell home (members list + Notice Board + Group Chat).
  - `/network/browse` — Supreme → High Court → District tree.
  - `/network/cell/:id` — any cell's public view.
- Each member row has a "Team Up" CTA wired to Phase 2.

### 3.2 Legal News (sidebar item, Advocate+)
- Edge function `legal-news` already exists — extend it:
  - Use Lovable AI (`google/gemini-2.5-flash` w/ Google Search grounding) to fetch: SC + 25 HC judgments, BCI/state council circulars, UGC notices, new legislation.
  - Personalize: top section = user's state council + court-of-practice; middle = SC/HC; bottom = national.
  - Cache per (state, court, day) in a `legal_news_cache` table.
- News card UI: headline, source, date, Act/Section tags, Read More, "Ask Bhramar about this" → opens chat with the judgment text pre-injected as context.
- Filters: court, Act, category, state.

---

## Phase 4 — Six Viral Features

### 4.1 Vakeel Score
- `advocate_reviews` table (advocate_id, reviewer_user_id, rating 1-5, comment, case_id, created_at).
- Score formula: weighted blend of `cases_count * 0.2 + win_rate * 0.4 + avg_rating * 0.3 + response_time_score * 0.1`. Materialized in `profiles.vakeel_score`, recomputed by a DB function called on review insert.
- Display: stars + numeric on every public profile, on Cells listings, Team Up search results.

### 4.2 Legal Clock — Limitation Calculator
- Route `/tools/legal-clock` (public, no login).
- Form: incident type (dropdown of common causes), incident date, jurisdiction.
- Lookup table `limitation_periods` seeded from Limitation Act 1963 schedules.
- Output: days remaining, deadline date, court/forum, exact form/section, "Share via WhatsApp" button (uses `wa.me/?text=...`).

### 4.3 Darbar Mode — Hearing Prep
- Route `/cases/:id/darbar`.
- New chat surface that calls `chat` edge function with a special system prompt: "You are simultaneously the opposing counsel AND the bench. Ask hostile questions, raise objections, force the advocate to defend each argument."
- Pre-loads case file as context (already supported in current `chat` function).
- "End Session" produces a markdown summary saved as a note.

### 4.4 Kanoon Ki Pathshala
- Route `/learn`.
- `lessons` table seeded (start with 30 BNS sections in simple Hindi).
- Daily-section view + 5-question quiz (`quiz_attempts` table).
- `learn_leaderboard` view.
- Share-score card generated as PNG (html2canvas) for WhatsApp.

### 4.5 Emergency Legal Button
- Floating red FAB on Citizen dashboard.
- Opens dialog: emergency type, brief description, location (geolocation API).
- Server function `emergency-match`: finds 3 nearest available advocates (by `state`/`district` + `is_available_for_emergency` flag) sorted by Vakeel Score.
- One-tap `tel:` button + in-app paid consultation flow (Razorpay order with 15% platform fee logged in `emergency_consultations` table).

### 4.6 Client WhatsApp Bridge
- Per-advocate WhatsApp Business API setup (requires advocate's own WABA token — stored as a per-user secret in a new `user_integrations` table, encrypted).
- Edge function `wa-send` proxies to `https://graph.facebook.com/v18.0/<phone_number_id>/messages`.
- UI: from any case page, "Update Client on WhatsApp" button → templated message editor → send.
- Audit log entry per send.
- Note: this requires the advocate to have an approved WABA — I'll add an onboarding wizard but actual WABA approval is on them.

---

## Phase 5 — Polish & Hardening

- Mobile responsiveness pass on every new screen.
- Loading skeletons everywhere.
- E2E sanity on existing Razorpay flow + super-admin gating (untouched but verified).
- Toast-based error handling on every new mutation.

---

## Technical Notes (for reference)

- All new tables get RLS. Cross-user reads (Cells, Team Up search, public profile) go through SECURITY DEFINER RPCs that return only public columns.
- Realtime: `team_messages`, `cell_messages`, `notifications` added to `supabase_realtime` publication.
- Roles: continue to use `user_roles` + `has_role`; do **not** store roles on profiles.
- AI: continue using Lovable AI Gateway (no extra keys). News grounding uses `google/gemini-2.5-flash` with Google Search tool.
- Razorpay flow, super-admin (`bhramar123@gmail.com`), existing case/chat/auth: untouched.

---

## What I need from you to start

1. Approve this phased plan (or tell me to merge phases / drop something).
2. Confirm: should the "App download" plan stay cancelled? (You said yes earlier — I'll keep it cancelled.)
3. For Phase 4.6 (WhatsApp Bridge) — confirm you want **per-advocate WABA tokens** (each advocate brings their own) vs a single platform-wide WhatsApp number. Per-advocate is what your spec implies and what makes them look professional, but it requires each advocate to set up WABA. I'll go with per-advocate unless you say otherwise.

Once approved I start Phase 1 immediately.
