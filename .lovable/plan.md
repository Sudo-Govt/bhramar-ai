# Path to Public Launch — Production Hardening Sweep

Goal: close every blocker between today and a public launch. Skipping `GROQ_API_KEY` and custom email domain (you'll add those later — code already handles their absence gracefully).

---

## 1. Security & data integrity (blockers)

- Run `supabase--linter` + `security--run_security_scan`. Fix every error/warn the scanners flag (likely candidates: missing RLS on `ai_training_logs` and `case_deletion_logs`, function search_path on a couple of helpers).
- Add RLS to `ai_training_logs` (super-admin select only; insert via trigger continues to work because trigger is `SECURITY DEFINER`).
- Add RLS to `case_deletion_logs` (owner-only select; insert via `delete_case_with_log` definer continues to work).
- Enable **Leaked Password Protection** (HIBP) via `configure_auth`.
- Confirm email verification is **on** (no auto-confirm) — verify with `configure_auth`.

## 2. Rate limiting & abuse protection (blocker)

- Add a `rate_limits` table (`user_id`, `bucket`, `window_start`, `count`) plus a SECURITY DEFINER `check_and_increment_rate_limit(_bucket, _max, _window_seconds)` RPC.
- Wire into `chat/index.ts`: tier-based caps
  - Free: 20 messages / day
  - Pro: 500 / day
  - Firm: unlimited
- Same wrapper around `ingest-document` and `ingest-json-kb` (10 uploads/hour for non-admin) to stop AI-budget burn.
- Return HTTP 429 with a clear toast on the client.

## 3. Legal pages (Razorpay live-mode requirement)

Three new public routes, linked from the Landing footer + Pricing checkout:
- `/terms` — Terms of Service (DPDP-compliant boilerplate, India jurisdiction).
- `/privacy` — Privacy Policy (DPDP Act 2023 disclosures, AI-data usage clause).
- `/refund` — Refund / Cancellation Policy (Razorpay needs this URL on file).
- `/contact` — support@ + business address placeholder.

Ship these as plain Markdown-rendered pages with a shared `LegalLayout` component. User can edit copy later.

## 4. Resilience & UX polish

- **Global error boundary** (`src/components/ErrorBoundary.tsx`) wrapping the router — friendly fallback, "Reload" button, sends error to console with conversation id.
- **Loading skeletons** on Dashboard chat list, Profile, SystemConsole tabs.
- **Empty states** with CTAs ("No conversations yet — start your first chat").
- **Toast on AI failure** instead of silent retry — surface which provider answered.
- **Mobile sweep** at 375 / 414 widths: Dashboard sidebar collapses to a Sheet, Pricing cards stack, SystemConsole tabs scroll horizontally.
- **404 page** polish with logo + "Back to chat" CTA.

## 5. Onboarding & SEO

- Landing page: real `<title>`, meta description, OpenGraph image (use existing logo), `og:title`, Twitter card tags.
- Add `robots.txt` allow + `sitemap.xml` with public routes.
- First-login redirect: if profile demographics empty, route to `/profile` with a one-line banner "Complete your profile so Bhramar can give you sharper answers."

## 6. Admin / observability hooks

- SystemConsole → new **Audit** tab pulling `admin_list_audit()` (function already exists).
- SystemConsole → AI Engine: small "live status" card showing which provider succeeded last, KB chunk count, today's request count.
- Daily auto-cleanup edge function `cleanup-old-logs` (cron via pg_cron) — purges `usage_logs` older than 90 days.

## 7. Razorpay go-live checklist (in-app)

- Add a banner inside SystemConsole → Users tab: "Razorpay mode: TEST / LIVE" detected from key prefix (`rzp_test_` vs `rzp_live_`). No code change needed when you swap secrets — just visibility.
- Verify webhook path exists; if not, add `razorpay-webhook` edge function for payment-failed / refund events.

## 8. Final QA gate

- `supabase--linter` clean.
- `security--run_security_scan` clean (or every finding triaged).
- Manual smoke test script in chat (signup → verify email → chat → upload doc → upgrade tier → admin login → SYSTEM tab).
- Confirm `/system` is gated to your email even if URL is guessed (already enforced via `is_super_admin()` SQL + UI check).

---

## Files this sweep will touch

```
supabase/migrations/<new>.sql
  - RLS on ai_training_logs, case_deletion_logs
  - rate_limits table + check_and_increment_rate_limit RPC

supabase/functions/chat/index.ts                 (rate-limit gate)
supabase/functions/ingest-document/index.ts      (rate-limit gate)
supabase/functions/ingest-json-kb/index.ts       (rate-limit gate)
supabase/functions/cleanup-old-logs/index.ts     (new, cron)
supabase/functions/razorpay-webhook/index.ts     (new, optional)

src/components/ErrorBoundary.tsx                 (new)
src/components/LegalLayout.tsx                   (new)
src/pages/legal/Terms.tsx                        (new)
src/pages/legal/Privacy.tsx                      (new)
src/pages/legal/Refund.tsx                       (new)
src/pages/legal/Contact.tsx                      (new)
src/pages/NotFound.tsx                           (polish)
src/pages/Landing.tsx                            (SEO + footer links)
src/pages/Dashboard.tsx                          (mobile sheet, skeletons, empty states)
src/pages/SystemConsole.tsx                      (Audit tab + live status card + Razorpay mode badge)
src/App.tsx                                      (ErrorBoundary wrap + 4 legal routes)
index.html                                       (OG/meta tags)
public/robots.txt, public/sitemap.xml            (SEO)
```

---

## What's deliberately deferred

- **GROQ_API_KEY** — you'll add later; provider already falls through to Gemini.
- **Custom email domain** — auth emails will keep using Lovable defaults until you add a domain.
- **Sentry / external error tracking** — optional, can wire after launch.
- **Web-search fallback** (Tavily/Brave) — post-launch v1.1.

---

## Order of work (one continuous build)

1. Migration: RLS gaps + `rate_limits` + cleanup grants.
2. Edge functions: rate-limit middleware, cleanup cron, optional webhook.
3. Frontend: ErrorBoundary, legal pages + routes, Landing SEO, footer links.
4. Mobile + skeleton + empty-state pass on Dashboard, Profile, SystemConsole.
5. SystemConsole Audit tab + live status + Razorpay mode badge.
6. Run linter + security scan, fix anything new.
7. Hand back a launch-readiness checklist with each item ticked.

After this pass you'll be at **public-launch grade**. Add `GROQ_API_KEY` and the email domain whenever you're ready — no further code changes needed for either.

Approve and I'll execute the whole pass in one go.