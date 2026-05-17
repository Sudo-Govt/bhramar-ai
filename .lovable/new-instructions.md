═══════════════════════════════════════════════════════════════════
BHARAMAR.AI — PROJECT CONTEXT PACKET
═══════════════════════════════════════════════════════════════════

PROJECT: Bhramar.ai — India's AI Legal Assistant (SaaS)
STATUS: Pre-launch, 1-week sprint (Day 0 of 7)
YOUR ROLE: Senior AI Engineer + Full-Stack Developer
USER ROLE: Non-technical founder, prompt engineer, copy-paster

═══════════════════════════════════════════════════════════════════
ARCHITECTURE (READ-ONLY CONTEXT)
═══════════════════════════════════════════════════════════════════

Stack: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
Backend: Supabase (Auth, Postgres, Edge Functions, Storage, Realtime, pgvector)
AI Gateway: Lovable AI Gateway (https://ai.gateway.lovable.dev/v1)
Fallback AI: Google Gemini (gemini-2.5-flash)
Embedding: text-embedding-004 (Google) or text-embedding-3-small (OpenAI)
Payments: Razorpay (edge functions: razorpay-create-order, razorpay-verify-payment)

Key Files:
- src/App.tsx — Routing (Landing, Dashboard, Cases, Chat, Settings, Pricing, etc.)
- src/hooks/useAuth.tsx — Auth context (Supabase auth, 3 roles: citizen/advocate/firm_member)
- src/pages/Dashboard.tsx — Main dashboard
- src/pages/Landing.tsx — Marketing site
- supabase/functions/chat/index.ts — AI chat edge function (SSE streaming, 4-layer prompt)
- supabase/functions/_shared/bhramarPrompt.ts — L1-L4 prompt builder
- supabase/functions/ingest-document/index.ts — [NOT YET BUILT — priority #1]
- tailwind.config.ts — Custom theme (navy/gold legal aesthetic, 6 theme variants planned)
- src/components/CreateCaseDialog.tsx — Case creation with AI extraction
- src/components/AutoSyncToggle.tsx — Auto-sync chat to case (has hook debt)

Database: 30+ migrations, key tables:
- profiles (citizen/advocate/firm fields)
- cases (auto-numbered, AI summary, complaint text)
- documents (storage paths, AI summary)
- document_chunks (pgvector embedding vector(1536), match_chunks RPC)
- messages (chat history)
- tasks, notes, audit_log, social_profiles

Super Admin: bhramar123@gmail.com (currently hardcoded — MUST move to env var)

═══════════════════════════════════════════════════════════════════
CURRENT SPRINT: 1-WEEK LAUNCH PLAN
═══════════════════════════════════════════════════════════════════

PHASE 1 (Days 1-2): SECURITY + RAG FOUNDATION
□ Move super admin email to env var
□ Add rate limiting to chat edge function
□ Verify RLS policies on all sensitive tables
□ Build ingest-document edge function (PDF/DOCX/URL → chunks → embeddings)
□ Build frontend admin uploader (only visible to super admin)
□ Test RAG with uploaded legal documents

PHASE 2 (Days 3-4): AI + DASHBOARD
□ AI engine switcher (Gemini/Claude/GPT) — super admin only
□ "Today's Cases" dashboard (today's hearings + AI prep summary)
□ Calendar component (left panel, event/task/meeting CRUD)
□ Indian court holidays JSON

PHASE 3 (Days 5-6): DOCUMENTS + MOBILE
□ Document auto-generation (bail apps, etc.) in Hindi/English/Gujarati
□ Strict formatting: Times New Roman or Century Gothic, 10pt, Legal page
□ Margins: TRBL 5/1/3/4cm (A4 general), TRBL 16/1.5/2.5/3.5cm (stamp paper)
□ Export to PDF with proper margins
□ Mobile polish (PWA prep, thumb-sized buttons, offline draft viewing)

PHASE 4 (Day 7): LAUNCH
□ Landing page final polish
□ Payment flow verification
□ Soft launch to 5 lawyer friends

═══════════════════════════════════════════════════════════════════
CRITICAL RULES — NON-NEGOTIABLE
═══════════════════════════════════════════════════════════════════

1. LEGAL ACCURACY:
   - Offences on/after 1 July 2024 → cite BNS (Bharatiya Nyaya Sanhita 2023), NOT IPC
   - Criminal procedure on/after 1 July 2024 → cite BNSS, NOT CrPC
   - Evidence on/after 1 July 2024 → cite BSA, NOT IEA
   - NEVER cite repealed laws without explicit "repealed" warning

2. SECURITY:
   - NEVER hardcode credentials in output code
   - ALWAYS use Deno.env.get() for secrets in edge functions
   - ALWAYS verify auth headers before any DB operation
   - RLS policies must be present on: cases, documents, messages, profiles

3. CODE STYLE:
   - TypeScript strict mode
   - Use existing shadcn/ui components (don't invent new UI patterns)
   - Use cn() utility for Tailwind class merging
   - Match existing file structure and naming conventions

4. OUTPUT FORMAT:
   - Provide COMPLETE file contents, not diffs
   - Include exact file path as header: "// FILE: src/components/X.tsx"
   - If multiple files, separate with: "// ===================="
   - Include brief "WHERE TO PASTE" instructions
   - Include "TEST: [how to verify this works]" for each deliverable

═══════════════════════════════════════════════════════════════════
CURRENT TASK CONTEXT (UPDATE THIS EACH SESSION)
═══════════════════════════════════════════════════════════════════

[USER WILL FILL THIS SECTION AT START OF EACH NEW CHAT]

Example:
- Last completed: Security patch (super admin moved to env var)
- Currently working on: ingest-document edge function
- Blocker: None
- Next up: Frontend uploader component

═══════════════════════════════════════════════════════════════════
TODOS FROM FOUNDER (ORIGINAL BACKLOG)
═══════════════════════════════════════════════════════════════════

1. Admin RAG upload system (PDF/eBook/article/URL → AI training corpus)
2. AI engine switcher (super admin: bhramar123@gmail.com)
3. Theme skins: dark, light, dark-blue, dark-green, modern-saas, black-white
4. Court dropdown in advocate profile (all Indian courts)
5. Calendar with court holidays + event/task/meeting CRUD
6. "Today's Cases" dashboard + hearing reminders + AI prep summary
7. Legal intelligence: similar cases, judge tendencies, risk scoring
8. Multi-language document generation (Hindi/English/Gujarati/etc.)
9. Status/progression stats ("You drafted 18 cases this month")
10. Trust layer: source citations, case references, "Verify sources" button
11. Mobile-first: big buttons, quick actions, offline draft viewing
12. Voice input (Hindi: "mere client ke liye bail application bana ke do")
13. WhatsApp share to client

═══════════════════════════════════════════════════════════════════
COMPLIANCE NOTES
═══════════════════════════════════════════════════════════════════

- India DPDP Act 2023: Full enforcement May 13, 2027
- Current phase (Nov 2025-May 2027): IT Act + Privacy Rules still govern
- Must implement: consent management, data retention policies, breach notification (72hr)
- Children's data: parental consent required for under-18 (higher than GDPR's 16)

═══════════════════════════════════════════════════════════════════
HOW TO USE THIS PACKET
═══════════════════════════════════════════════════════════════════

1. Paste this ENTIRE block at the TOP of your message
2. Attach/paste the repomix XML codebase below this block
3. Fill the "CURRENT TASK CONTEXT" section
4. Ask your question or request the next deliverable
5. The AI will respond as if continuing from the previous session

═══════════════════════════════════════════════════════════════════

[PASTE THE PACKET ABOVE]

CURRENT TASK CONTEXT:
- Last completed: [fill in]
- Currently working on: [fill in]
- Blocker: [fill in or "None"]
- Next up: [fill in]

ATTACHED: repomix-output-Sudo-Govt-bhramar-ai.git.xml

REQUEST: [Your specific ask — e.g., "Build the ingest-document edge function"]
