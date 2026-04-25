# NyayaAI — Full Build Plan

A premium, production-ready AI legal assistant for Indian advocates. Pixel-perfect 3-panel desktop layout, mobile-responsive, with real authentication, persistent cases/chats/notes, and an AI layer designed so you can swap from Lovable AI (Gemini) to your own Groq/Llama backend later by changing one variable.

---

## 1. Branding & Design System

- **Palette** (HSL tokens in `index.css`): deep navy `#0A1628` background, ink/card surfaces, pure white text, gold `#C9A84C` accent for CTAs, borders, citations.
- **Fonts**: Playfair Display (headings) + Inter (body), loaded from Google Fonts.
- **Feel**: calm, authoritative, premium. Subtle 200–250ms transitions only — no bouncy animations.
- Tailwind config extended with semantic tokens (`navy`, `gold`, `ink`, `surface`, `border-gold`, etc.) and Playfair/Inter font families.
- Custom scrollbars, gold focus rings, soft gold glow on hover for primary actions.

## 2. Pages & Routes

| Route | Purpose |
|---|---|
| `/` | Landing page (hero, features, testimonials, footer) |
| `/auth` | Login + Signup tabs, email/password + Google |
| `/app` | Main 3-panel dashboard (protected) |
| `/pricing` | Free / Pro / Firm tier cards |
| `/profile` | User details, subscription, usage stats, danger zone |

### Landing Page
- Full-screen navy hero, scales-of-justice mark, **"The AI co-pilot for every Indian advocate"**, sub: *"Research faster. Draft smarter. Win more."*
- Two CTAs: **Get Started Free** (gold) and **See How It Works** (outlined gold).
- Three feature cards: *Lightning Fast Research*, *Smart Document Analysis*, *Drafted in Seconds*.
- "Trusted by" section with placeholder advocate testimonials.
- Minimal footer.

### Authentication
- Centered card on dark navy. Login / Signup tabs.
- Email + password fields, **Continue with Google** button, gold submit.
- Includes `/reset-password` page for the recovery flow.

### Dashboard (`/app`) — 3-Panel Layout

**Left sidebar (collapsible)**
- NyayaAI logo + scales icon at top
- Gold **+ New Case** button
- Sectioned chat history (Today / Yesterday / Last 7 Days) grouped under the active case
- List of cases with status badges (Active / Closed / Draft)
- User avatar + name + subscription tier chip at the bottom

**Center panel**
- Top bar: current case name + actions (rename, archive)
- Empty state: centered logo + tagline *"Your AI powered legal companion. Ask anything about Indian law."* + 3 suggestion cards (*Explain Section 302 IPC*, *Draft a legal notice*, *Bail conditions under CrPC 437*)
- Chat thread:
  - User messages: navy bubble, right-aligned
  - AI messages: white card with subtle gold left border, small NyayaAI mark
  - Markdown rendered (headings, lists, bold)
  - **Cited sections highlighted in gold** (e.g. *IPC §302*, *CrPC §438*)
  - Source citation chips below each AI message (Perplexity-style, clickable)
  - Action row: Copy / Save to Notes / Bookmark / Share
- Bottom input: large textarea, attach + voice icons on left, gold send button on right, disclaimer line beneath: *"NyayaAI provides legal information, not legal advice. Always consult a qualified advocate."*

**Right panel (collapsible, tabbed)**
- **Documents**: drag-and-drop zone for PDFs/DOCX/images, list of uploaded files for the active case
- **Research**: relevant statutes & landmark judgements pulled from the latest AI response
- **Notes**: free-text per-case notepad with autosave

### Pricing Page
- Three cards on dark background:
  - **Free** — basic Q&A, 10 queries/day
  - **Pro ₹1,999/month** — unlimited queries, document upload, case folders, *Most Popular*
  - **Firm ₹9,999/month** — multi-user, priority support, custom branding

### Profile Page
- User details, subscription status, usage stats (queries this month, documents uploaded, cases created), Danger Zone (delete account)

## 3. Mobile Responsive
- Single-column stack
- Bottom tab bar: **Cases / Chat / Documents / Profile**
- Sidebar becomes a slide-out drawer (Sheet)
- Right panel becomes a tabbed sheet that slides up

## 4. Backend (Lovable Cloud)

Tables (all with strict RLS — only the owner can read/write their rows):
- `profiles` — name, avatar, subscription tier, query counters
- `cases` — name, status (Active/Closed/Draft), client name, timestamps
- `conversations` — belongs to a case, title, last_message_at
- `messages` — role (user/assistant), content, citations (jsonb), conversation_id
- `documents` — case_id, storage path, filename, mime, size
- `notes` — case_id, body
- `usage_logs` — per-user query counts for daily limit enforcement

Storage: private `case-documents` bucket with per-user RLS.
Auth: email/password + Google sign-in, profile auto-created via signup trigger.

## 5. AI Layer — Swappable Provider (Key Requirement)

Built so you can move from Lovable AI to your own Groq/Llama instance by flipping a single env var.

- **Edge function `chat`** is the only place that talks to an AI provider.
- Inside it, a small **`provider` abstraction** reads `AI_PROVIDER` (default `lovable`, future `groq`).
  - `lovable` → calls `https://ai.gateway.lovable.dev/v1/chat/completions` using the auto-provisioned `LOVABLE_API_KEY` (Gemini, OpenAI-compatible API).
  - `groq` → calls `https://api.groq.com/openai/v1/chat/completions` using a `GROQ_API_KEY` secret you'll add later. Same OpenAI-compatible request/response, so streaming, tool-calls, and message format stay identical.
- Indian-law specialist **system prompt** lives only in the edge function (so you can tune it without redeploying the frontend). It locks the model to:
  - IPC, CrPC, Constitution, Evidence Act, Contract Act, landmark SC/HC judgements
  - Always returns: structured answer → cited sections → disclaimer
  - Refuses non-legal questions politely
- **Streaming** SSE responses to the client for token-by-token rendering.
- Citation extraction: model is instructed to emit a `citations` JSON block we parse and render as gold chips and into the Research tab.
- Daily-limit middleware checks `usage_logs` for Free tier (10/day) and returns a friendly upgrade prompt when exceeded.
- 429 / 402 errors from the gateway are surfaced as toasts.

When you're ready to switch to your Groq model, you'll just: add `GROQ_API_KEY` secret, set `AI_PROVIDER=groq` and optionally `GROQ_MODEL=llama-3.3-70b-versatile`. Zero frontend changes.

## 6. Dummy / Seed Data
On first login, the user gets three sample cases pre-populated so the UI feels alive:
- *Bail Application — Sharma vs State*
- *Property Dispute — Kumar Family*
- *Employment Termination — Ravi vs TechCorp*

Plus one sample conversation in the first case showing a detailed AI response with cited IPC/CrPC sections.

## 7. Polish
- Smooth panel collapse/expand transitions
- Skeleton loaders while messages stream
- Toast notifications via Sonner
- Keyboard shortcuts: `⌘/Ctrl + K` new chat, `Enter` send, `Shift+Enter` newline
- Empty states for every panel
- Full a11y: focus rings, aria labels, semantic HTML

---

**Outcome**: a production-ready, responsive NyayaAI app with auth, persistent cases/chats/notes/documents, and a clean AI provider seam ready for your Groq/Llama swap.