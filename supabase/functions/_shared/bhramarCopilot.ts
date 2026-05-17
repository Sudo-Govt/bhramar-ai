// Bhramar.ai Copilot — System prompt (Part A) and context builder (Part B)

export const BHRAMAR_COPILOT_SYSTEM = `You are Bhramar — the AI legal copilot built into every advocate's case file.
You are not a judge. You are not a prosecutor. You are not a moral arbiter.
You are a brilliant, tireless legal assistant whose only job is to help the
person in front of you navigate the Indian legal system with maximum intelligence,
dignity, and effectiveness.

You serve two types of users from the same case file:
  ADVOCATE MODE  — You assist the advocate with strategy, research, drafting,
                   and case management. You speak as a trusted junior colleague
                   who has read every document in the file.
  CLIENT MODE    — You assist the client with understanding their case, their
                   rights, next steps, and what to expect. You speak as a
                   compassionate, clear guide — never condescending.

The active user type is specified in the context block sent with every message.
Read it. Adapt immediately. Never confuse the two modes.

CORE VALUES (non-negotiable):
- Serve everyone without judgment. Every person has Article 21 & 22 rights to legal assistance.
- You are not a judge. Never call clients guilty. Build the strongest legal defence regardless of charge.
- Confidentiality is absolute. Never reference one client's data in another's session.
- Accuracy over confidence. If unsure of a section number, say so. Never fabricate citations.

LAW REGIME RULES — POST-1 JULY 2024:
- Offences on/after 1 July 2024 → cite BNS (Bharatiya Nyaya Sanhita 2023), NOT IPC.
- Criminal procedure on/after 1 July 2024 → cite BNSS (Bharatiya Nagarik Suraksha Sanhita 2023), NOT CrPC.
- Evidence on/after 1 July 2024 → cite BSA (Bharatiya Sakshya Adhiniyam 2023), NOT IEA.
- Pre-1 July 2024 offences → IPC / CrPC / IEA continue.
- Cheque bounce → NI Act §138. Workplace harassment → POSH Act 2013.
- Always say which act: "Section 41 BNSS" — not just "Section 41".
- Always cite cases with year + court: "D.K. Basu v. State of WB (1997, SC)".

ADVOCATE MODE — what you do:
- Identify every applicable section, cite landmark cases, flag procedural defences.
- Suggest bail strategy (anticipatory / regular / default), forum, bench.
- Draft bail applications, writs, replies, affidavits — case-specific, not templates.
- Use BNSS/BNS/BSA sections in all drafts unless the offence is pre-1 July 2024.
- Summarise the file, flag deadlines, cross-reference notes vs documents for contradictions.
- Tone: collegial, precise, dense. Lead with the most important insight.
- End with "Next step I recommend:" + one concrete action.

CLIENT MODE — what you do:
- Acknowledge their feeling in one sentence. Then answer in plain language.
- Explain hearings, orders, rights at every stage (arrest, custody, bail, trial).
- Proactively state rights: 24-hr magistrate production, legal aid, silence, medical exam, inform family.
- Never promise outcomes. Never undermine the advocate. Flag disagreements, don't contradict.
- Tone: warm, clear, grounded. Short paragraphs. No legal jargon without immediate explanation.
- End with what they can do RIGHT NOW + "If you have more questions about this, just ask."

LANGUAGE: Detect the user's message language and reply in the SAME language.
Hindi → Hindi (Devanagari). Hinglish → Hinglish. Tamil/Telugu/Bengali/etc → that script.
language_preference in context is a hint; the actual message language always wins.

FORMAT:
- Use markdown. Bold section numbers and case names.
- Advocate mode: structured headings + bullets allowed.
- Client mode: flowing short paragraphs; numbered steps when explaining a process.
- Never start with "Certainly!" / "Great question!" Never end with "Hope this helps!".

NEVER DO:
- Refuse a case because the charge is serious.
- Tell a client their advocate is wrong (flag, don't undermine).
- Predict case outcomes definitively.
- Fabricate citations. Cite IPC when BNSS/BNS applies post-1 July 2024.
- Share one client's data in another session.
- Lecture on morality.`;

export type SessionType = 'advocate' | 'client';

export interface CopilotCtx {
  session_type: SessionType;
  user_name: string;
  language_preference: string;
  timestamp: string;
  advocate: {
    name?: string | null;
    bar_council?: string | null;
    enrollment?: string | null;
    court?: string | null;
    specializations?: string[] | null;
    firm?: string | null;
    language?: string | null;
  };
  client?: {
    name?: string;
    age?: number | null;
    gender?: string | null;
    occupation?: string | null;
    district?: string | null;
    state?: string | null;
    language?: string | null;
    is_in_custody?: boolean;
    custody_location?: string | null;
    legal_aid_eligible?: string | null;
    relationship_to_case?: string | null;
  } | null;
  case: {
    id: string;
    title: string;
    case_number?: string | null;
    court?: string | null;
    judge?: string | null;
    case_type: string;
    primary_act?: string | null;
    sections_charged?: string[] | null;
    current_stage: string;
    next_date?: string | null;
    next_date_purpose?: string | null;
    date_of_fir?: string | null;
    date_of_arrest?: string | null;
    date_of_charge_sheet?: string | null;
    limitation_deadline?: string | null;
    is_bailable?: string | null;
    is_cognizable?: string | null;
    police_station?: string | null;
    io_name?: string | null;
    pp_name?: string | null;
    opposing_counsel?: string | null;
    key_facts?: string | null;
  };
  documents: { doc_type: string; filename: string; doc_date?: string | null; ai_summary?: string | null }[];
  notes: { created_at: string; note_text: string }[];
  hearings: { hearing_date: string; court?: string | null; what_happened?: string | null; order_passed?: string | null }[];
  rag_chunks: { source: string; relevance: string; content: string }[];
  recent_chat: { role: string; content: string }[];
}

export function buildContextBlock(ctx: CopilotCtx): string {
  const lines: string[] = ['[BHRAMAR_CONTEXT]', ''];
  lines.push('SESSION:');
  lines.push(`  user_type: ${ctx.session_type.toUpperCase()}`);
  lines.push(`  user_name: ${ctx.user_name}`);
  lines.push(`  language_preference: ${ctx.language_preference}`);
  lines.push(`  interface: ${ctx.session_type === 'advocate' ? 'advocate_dashboard' : 'client_portal'}`);
  lines.push(`  timestamp: ${ctx.timestamp}`);
  lines.push('');

  lines.push('ADVOCATE:');
  lines.push(`  name: ${ctx.advocate.name || 'Unknown'}`);
  if (ctx.advocate.bar_council) lines.push(`  bar_council_id: ${ctx.advocate.bar_council}`);
  if (ctx.advocate.enrollment) lines.push(`  enrolled_at: ${ctx.advocate.enrollment}`);
  if (ctx.advocate.specializations?.length) lines.push(`  specialisation: ${ctx.advocate.specializations.join(', ')}`);
  if (ctx.advocate.firm) lines.push(`  firm: ${ctx.advocate.firm}`);
  if (ctx.advocate.language) lines.push(`  preferred_language: ${ctx.advocate.language}`);
  lines.push('');

  if (ctx.client) {
    lines.push('CLIENT:');
    lines.push(`  name: ${ctx.client.name}`);
    if (ctx.client.age != null) lines.push(`  age: ${ctx.client.age}`);
    if (ctx.client.gender) lines.push(`  gender: ${ctx.client.gender}`);
    if (ctx.client.occupation) lines.push(`  occupation: ${ctx.client.occupation}`);
    if (ctx.client.district || ctx.client.state) lines.push(`  address: ${[ctx.client.district, ctx.client.state].filter(Boolean).join(', ')}`);
    lines.push(`  preferred_language: ${ctx.client.language || 'en'}`);
    lines.push(`  is_in_custody: ${!!ctx.client.is_in_custody}`);
    if (ctx.client.custody_location) lines.push(`  custody_location: ${ctx.client.custody_location}`);
    lines.push(`  legal_aid_eligible: ${ctx.client.legal_aid_eligible || 'unknown'}`);
    lines.push(`  relationship_to_case: ${ctx.client.relationship_to_case || 'Accused'}`);
    lines.push('');
  }

  const c = ctx.case;
  lines.push('CASE:');
  lines.push(`  case_id: ${c.id}`);
  lines.push(`  case_title: ${c.title}`);
  if (c.case_number) lines.push(`  case_number: ${c.case_number}`);
  if (c.court) lines.push(`  court: ${c.court}`);
  if (c.judge) lines.push(`  judge: ${c.judge}`);
  lines.push(`  case_type: ${c.case_type}`);
  if (c.primary_act) lines.push(`  primary_act: ${c.primary_act}`);
  if (c.sections_charged?.length) lines.push(`  sections_charged: [${c.sections_charged.join(', ')}]`);
  lines.push(`  current_stage: ${c.current_stage}`);
  if (c.next_date) lines.push(`  next_date: ${c.next_date}`);
  if (c.next_date_purpose) lines.push(`  next_date_purpose: ${c.next_date_purpose}`);
  if (c.date_of_fir) lines.push(`  date_of_fir: ${c.date_of_fir}`);
  if (c.date_of_arrest) lines.push(`  date_of_arrest: ${c.date_of_arrest}`);
  if (c.date_of_charge_sheet) lines.push(`  date_of_charge_sheet: ${c.date_of_charge_sheet}`);
  if (c.limitation_deadline) lines.push(`  limitation_deadline: ${c.limitation_deadline}`);
  lines.push(`  is_bailable: ${c.is_bailable || 'unknown'}`);
  lines.push(`  is_cognizable: ${c.is_cognizable || 'unknown'}`);
  if (c.police_station) lines.push(`  police_station: ${c.police_station}`);
  if (c.io_name) lines.push(`  io_name: ${c.io_name}`);
  if (c.pp_name) lines.push(`  pp_name: ${c.pp_name}`);
  if (c.opposing_counsel) lines.push(`  opposing_counsel: ${c.opposing_counsel}`);
  lines.push('');

  lines.push('KEY FACTS:');
  lines.push(c.key_facts ? `  ${c.key_facts.replace(/\n/g, '\n  ')}` : '  No facts entered yet.');
  lines.push('');

  lines.push('DOCUMENTS IN FILE:');
  if (!ctx.documents.length) lines.push('  No documents uploaded yet.');
  else for (const d of ctx.documents) {
    lines.push(`  - type: ${d.doc_type}`);
    lines.push(`    filename: ${d.filename}`);
    if (d.doc_date) lines.push(`    date: ${d.doc_date}`);
    if (d.ai_summary) lines.push(`    summary: ${d.ai_summary.slice(0, 400)}`);
  }
  lines.push('');

  lines.push('ADVOCATE NOTES:');
  if (!ctx.notes.length) lines.push('  No notes entered yet.');
  else for (const n of ctx.notes) {
    lines.push(`  - date: ${n.created_at}`);
    lines.push(`    note: ${n.note_text.slice(0, 600)}`);
  }
  lines.push('');

  lines.push('HEARING HISTORY:');
  if (!ctx.hearings.length) lines.push('  No hearings logged yet.');
  else for (const h of ctx.hearings) {
    lines.push(`  - date: ${h.hearing_date}`);
    if (h.court) lines.push(`    court: ${h.court}`);
    if (h.what_happened) lines.push(`    what_happened: ${h.what_happened.slice(0, 400)}`);
    if (h.order_passed) lines.push(`    order_passed: ${h.order_passed.slice(0, 400)}`);
  }
  lines.push('');

  lines.push('RAG_CONTEXT:');
  if (!ctx.rag_chunks.length) lines.push('  No relevant legal provisions retrieved for this query.');
  else for (const r of ctx.rag_chunks) {
    lines.push(`  - source: ${r.source}`);
    lines.push(`    relevance: ${r.relevance}`);
    lines.push(`    content: ${r.content.slice(0, 1200)}`);
  }
  lines.push('');

  lines.push('RECENT_CHAT:');
  if (!ctx.recent_chat.length) lines.push('  New conversation — no prior messages.');
  else for (const m of ctx.recent_chat) {
    lines.push(`  - role: ${m.role}`);
    lines.push(`    content: ${m.content.slice(0, 200)}`);
  }
  lines.push('[/BHRAMAR_CONTEXT]');
  return lines.join('\n');
}
