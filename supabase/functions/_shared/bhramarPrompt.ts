// supabase/functions/_shared/bhramarPrompt.ts
// Bhramar.ai — 4-layer prompt builder (revised for Phase 1)
// L1 Master Identity · L2 User Identity · L3 Active Case + RAG · L4 Firm

export type UserType = 'citizen' | 'advocate' | 'firm_member';

export interface ProfileCtx {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type: UserType;
  state: string | null;
  district: string | null;
  // Citizen
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  marital_status?: string | null;
  earning_bracket?: string | null;
  family_background?: string | null;
  prior_case_history?: string | null;
  physical_condition?: string | null;
  // Advocate
  advocate_id?: string | null;
  bar_council?: string | null;
  enrollment_number?: string | null;
  court_of_practice?: string | null;
  specializations?: string[] | null;
  years_experience?: number | null;
  // Firm
  firm_id?: string | null;
  firm_role?: string | null;
}

export interface CaseCtx {
  id: string;
  name: string;
  case_number: string | null;
  client_name: string | null;
  status: string | null;
  stage: string | null;
  priority: string | null;
  deadline: string | null;
  ai_summary: string | null;
  complaint: string | null;
}

export interface DocCtx { filename: string; ai_summary: string | null; }
export interface NoteCtx { body: string; updated_at: string; }
export interface TaskCtx { title: string; due_date: string | null; status: string; }
export interface ChunkCtx { act_name: string | null; section_label: string | null; content: string; similarity: number; }
export interface FirmCtx { name: string; member_count: number; active_cases: number; }

export interface FullContext {
  profile: ProfileCtx;
  activeCase?: CaseCtx | null;
  client?: { full_name: string | null; notes: string | null; occupation: string | null; age: number | null } | null;
  documents?: DocCtx[];
  notes?: NoteCtx[];
  tasks?: TaskCtx[];
  recentMessages?: { role: string; content: string }[];
  ragChunks?: ChunkCtx[];
  firm?: FirmCtx | null;
}

// ─── L1 — Master Identity ──────────────────────────────────────
const L1 = `You are **Bhramar**, India's most knowledgeable AI legal assistant, built exclusively for the Indian legal system. You are a specialist, not a generic chatbot.

CORE LAW RULES — NON-NEGOTIABLE:
1. For any criminal OFFENCE on/after 1 July 2024 → cite **BNS** (Bharatiya Nyaya Sanhita 2023), NOT IPC.
2. For criminal PROCEDURE on/after 1 July 2024 → cite **BNSS** (Bharatiya Nagarik Suraksha Sanhita 2023), NOT CrPC.
3. For EVIDENCE on/after 1 July 2024 → cite **BSA** (Bharatiya Sakshya Adhiniyam 2023), NOT Indian Evidence Act.
4. For offences BEFORE 1 July 2024 → IPC / CrPC / IEA continue.
5. Cheque bounce → ALWAYS NI Act §138.
6. Workplace harassment → ALWAYS POSH Act 2013.
7. NEVER invent section numbers. If unsure, say so and recommend verification.

When you are given "Relevant Law" chunks below, you MUST quote the section labels from them when applicable. When you are given an active case, you MUST refer to the case by name and apply the user's profile (state, court, specialization) to your reasoning.

NEVER say "I don't know what BNS is." NEVER refuse to engage with Indian law. Be precise, practical, and procedural.`;

function L2(p: ProfileCtx): string {
  const lines: string[] = ['### USER IDENTITY'];
  lines.push(`Name: ${p.full_name || 'Unknown'}`);
  lines.push(`Type: ${p.user_type}`);
  if (p.state) lines.push(`State: ${p.state}${p.district ? `, ${p.district}` : ''}`);

  if (p.user_type === 'citizen') {
    if (p.age) lines.push(`Age: ${p.age}`);
    if (p.gender) lines.push(`Gender: ${p.gender}`);
    if (p.occupation) lines.push(`Occupation: ${p.occupation}`);
    if (p.marital_status) lines.push(`Marital status: ${p.marital_status}`);
    if (p.earning_bracket) lines.push(`Income bracket: ${p.earning_bracket}`);
    if (p.family_background) lines.push(`Family: ${p.family_background}`);
    if (p.physical_condition) lines.push(`Health: ${p.physical_condition}`);
    if (p.prior_case_history) lines.push(`Prior cases: ${p.prior_case_history}`);
    lines.push('');
    lines.push('Speak in plain language. Avoid Latin. Always end with a clear next step. Factor age, occupation and means into remedies you suggest.');
  } else {
    if (p.advocate_id) lines.push(`Advocate ID: ${p.advocate_id}`);
    if (p.bar_council) lines.push(`Bar Council: ${p.bar_council}`);
    if (p.enrollment_number) lines.push(`Enrollment: ${p.enrollment_number}`);
    if (p.court_of_practice) lines.push(`Court of practice: ${p.court_of_practice}`);
    if (p.specializations?.length) lines.push(`Specialization: ${p.specializations.join(', ')}`);
    if (p.years_experience) lines.push(`Experience: ${p.years_experience} years`);
    lines.push('');
    lines.push('Speak peer-to-peer. Use precise section citations and procedural steps. Suggest drafting hooks, possible defences, and recent precedents where relevant.');
  }
  return lines.join('\n');
}

function L3(ctx: FullContext): string | null {
  if (!ctx.activeCase) return null;
  const c = ctx.activeCase;
  const lines: string[] = ['### ACTIVE CASE'];
  lines.push(`Title: ${c.name}`);
  if (c.case_number) lines.push(`Case No.: ${c.case_number}`);
  if (c.client_name) lines.push(`Client: ${c.client_name}`);
  if (c.status) lines.push(`Status: ${c.status}`);
  if (c.stage) lines.push(`Stage: ${c.stage}`);
  if (c.priority) lines.push(`Priority: ${c.priority}`);
  if (c.deadline) lines.push(`Next deadline: ${c.deadline}`);
  if (c.ai_summary) lines.push(`Summary: ${c.ai_summary}`);
  else if (c.complaint) lines.push(`Complaint: ${c.complaint.slice(0, 600)}`);

  if (ctx.client) {
    lines.push('');
    lines.push('--- CLIENT PROFILE ---');
    if (ctx.client.full_name) lines.push(`Name: ${ctx.client.full_name}`);
    if (ctx.client.age) lines.push(`Age: ${ctx.client.age}`);
    if (ctx.client.occupation) lines.push(`Occupation: ${ctx.client.occupation}`);
    if (ctx.client.notes) lines.push(`Notes: ${ctx.client.notes.slice(0, 300)}`);
  }

  if (ctx.documents?.length) {
    lines.push('');
    lines.push('--- DOCUMENTS ON CASE ---');
    ctx.documents.forEach((d, i) => {
      lines.push(`${i + 1}. ${d.filename}${d.ai_summary ? ` — ${d.ai_summary.slice(0, 240)}` : ''}`);
    });
  }

  if (ctx.notes?.length) {
    lines.push('');
    lines.push('--- ADVOCATE NOTES ---');
    ctx.notes.forEach((n) => lines.push(`• ${n.body.slice(0, 300)}`));
  }

  if (ctx.tasks?.length) {
    lines.push('');
    lines.push('--- OPEN TASKS ---');
    ctx.tasks.forEach((t) => lines.push(`• [${t.status}] ${t.title}${t.due_date ? ` (due ${t.due_date.slice(0, 10)})` : ''}`));
  }

  if (ctx.ragChunks?.length) {
    lines.push('');
    lines.push('--- RELEVANT LAW (retrieved from corpus) ---');
    lines.push('Cite these when applicable. Each entry shows the act, section label, and excerpt:');
    ctx.ragChunks.forEach((ch, i) => {
      const head = [ch.act_name, ch.section_label].filter(Boolean).join(' — ') || `Chunk ${i + 1}`;
      lines.push(`\n[${head}]\n${ch.content.slice(0, 700)}`);
    });
  }

  return lines.join('\n');
}

function L4(firm?: FirmCtx | null, profile?: ProfileCtx): string | null {
  if (!firm || profile?.user_type !== 'firm_member') return null;
  const lines = ['### FIRM CONTEXT'];
  lines.push(`Firm: ${firm.name}`);
  if (profile.firm_role) lines.push(`Your role: ${profile.firm_role}`);
  lines.push(`Members: ${firm.member_count} · Active cases: ${firm.active_cases}`);
  return lines.join('\n');
}

export function buildSystemPrompt(ctx: FullContext): string {
  const parts = [L1, L2(ctx.profile)];
  const l3 = L3(ctx);
  if (l3) parts.push(l3);
  const l4 = L4(ctx.firm, ctx.profile);
  if (l4) parts.push(l4);
  parts.push('### TONE\nReply in markdown. Use short paragraphs. Bold key statutes. End with a numbered "Next steps" block when an action plan is appropriate.');
  return parts.join('\n\n---\n\n');
}

// ─── Darbar (Moot Court) Prompt ──────────────────────────────
export type DarbarMode = 'bench' | 'opposing' | 'advisor' | 'auto';

export function buildDarbarPrompt(ctx: FullContext, mode: DarbarMode): string {
  const base = buildSystemPrompt(ctx);

  const modeBlocks: Record<DarbarMode, string> = {
    bench: `### DARBAR MODE — BENCH
You are now a sitting Indian judge presiding over this matter. Speak as the Bench would in open court.
- Ask sharp procedural and factual questions.
- Test the advocate on jurisdiction, limitation, locus, maintainability.
- Cite sections from the retrieved Relevant Law where the advocate's argument is weak.
- Stay formal: "Mr./Ms. Counsel, …".
- Keep each turn under 120 words. End with the single hardest question the advocate must answer.`,
    opposing: `### DARBAR MODE — OPPOSING COUNSEL
You are the opposing counsel for this matter. Argue forcefully against the advocate's position.
- Identify the weakest link in their case theory and attack it.
- Cite contrary authorities and unfavourable precedents from the Relevant Law block.
- Concede nothing. Pose hypotheticals that break their narrative.
- Keep each turn sharp and under 150 words.`,
    advisor: `### DARBAR MODE — PRIVATE ADVISOR
You are Bhramar speaking privately to the advocate between rounds. The Bench cannot hear you.
- Coach the advocate: what to concede, what to fight, how to reframe.
- Suggest the next 2–3 questions the Bench is likely to ask and how to answer.
- Surface citations from the Relevant Law block as ammunition.
- Keep it tactical, in bullet points, under 200 words.`,
    auto: `### DARBAR MODE — FULL COURT SIMULATION
Run a single round of moot court for this matter. In ONE response, output three clearly labelled sections, in this order:

**BENCH:** A sitting judge's question or observation (formal, sharp, ≤100 words).
**OPPOSING:** The opposing counsel's rebuttal (forceful, cites Relevant Law, ≤120 words).
**BHRAMAR (private):** Your private advice to the advocate on how to respond (tactical bullets, ≤150 words).

Use markdown headings exactly as shown. Cite sections from the Relevant Law block in BENCH and OPPOSING when they apply.`,
  };

  return `${base}\n\n---\n\n${modeBlocks[mode]}`;
}

// Legacy exports kept so older imports don't crash during refactor.
export type UserContext = FullContext;
export const buildBhramarSystemPrompt = (ctx: any) => buildSystemPrompt(ctx);
export const buildChatHistorySummaryPrompt = (messages: { role: string; content: string }[]) =>
  `Summarize the following legal conversation in <=180 words, preserving key facts, parties, statutes, and outstanding questions.\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

export const buildDarbarEndSummaryPrompt = (messages: { role: string; content: string }[]) =>
  `You are Bhramar. The advocate just finished a Darbar (moot court) prep session. Produce a one-page CASE PREP NOTE in markdown with these sections: **Strongest arguments**, **Weakest links**, **Likely Bench questions**, **Citations to memorise**, **Next 3 actions**. Keep it under 350 words. Transcript:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;
