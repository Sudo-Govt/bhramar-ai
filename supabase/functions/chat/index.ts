// supabase/functions/chat/index.ts
// Bhramar.ai — Chat Edge Function
// Fetches full user context (profile, clients, cases, documents, chat history)
// Builds personalized system prompt and calls Groq llama-3.1-70b

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildBhramarSystemPrompt,
  buildChatHistorySummaryPrompt,
  UserContext,
  ClientProfile,
  CaseSummary,
  DocumentSummary,
} from '../_shared/bhramarPrompt.ts';

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────
// GROQ CONFIG
// ─────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-70b-versatile';
const MAX_TOKENS = 2048;

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse request body
    const body = await req.json();
    const {
      messages,           // array of {role, content} — the current conversation
      case_id,            // optional: if user is chatting in context of a specific case
      summarize_history,  // optional: if true, just return a history summary
    } = body;

    if (!messages || !Array.isArray(messages)) {
      throw new Error('messages array is required');
    }

    // ─────────────────────────────────────────────────────────
    // AUTH — get the calling user
    // ─────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use user-scoped client to verify JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for fetching data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────
    // SUMMARIZE MODE — return a compressed summary of messages
    // Used by frontend to compress long chat history
    // ─────────────────────────────────────────────────────────
    if (summarize_history) {
      const summaryPrompt = buildChatHistorySummaryPrompt(messages);
      const summaryResponse = await callGroq(groqKey, [
        { role: 'user', content: summaryPrompt }
      ], 300);
      return new Response(JSON.stringify({ summary: summaryResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────────────────────────────────
    // FETCH USER CONTEXT
    // ─────────────────────────────────────────────────────────
    const ctx = await buildUserContext(supabase, user.id, case_id);

    // ─────────────────────────────────────────────────────────
    // BUILD SYSTEM PROMPT
    // ─────────────────────────────────────────────────────────
    const systemPrompt = buildBhramarSystemPrompt(ctx);

    // ─────────────────────────────────────────────────────────
    // CALL GROQ
    // ─────────────────────────────────────────────────────────
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const reply = await callGroq(groqKey, groqMessages, MAX_TOKENS);

    // ─────────────────────────────────────────────────────────
    // SAVE MESSAGE TO DB (async, don't block response)
    // ─────────────────────────────────────────────────────────
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      saveMessages(supabase, user.id, case_id, lastUserMessage.content, reply).catch(console.error);
    }

    // ─────────────────────────────────────────────────────────
    // CHECK IF AUTO-SUMMARY IS NEEDED
    // If this is message 10+, trigger background summarization
    // ─────────────────────────────────────────────────────────
    if (messages.length >= 10 && messages.length % 10 === 0) {
      triggerHistorySummary(supabase, groqKey, user.id, case_id, messages).catch(console.error);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// FETCH USER CONTEXT — all personalization data
// ─────────────────────────────────────────────────────────────
async function buildUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  caseId?: string,
): Promise<UserContext> {

  // Run all queries in parallel for speed
  const [profileResult, clientsResult, casesResult, docsResult, historyResult] = await Promise.allSettled([
    fetchProfile(supabase, userId),
    fetchClients(supabase, userId),
    fetchCases(supabase, userId, caseId),
    fetchDocuments(supabase, userId, caseId),
    fetchChatHistorySummary(supabase, userId, caseId),
  ]);

  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
  const cases = casesResult.status === 'fulfilled' ? casesResult.value : [];
  const docs = docsResult.status === 'fulfilled' ? docsResult.value : [];
  const historySummary = historyResult.status === 'fulfilled' ? historyResult.value : null;

  const ctx: UserContext = {
    user_id: userId,
    name: profile?.full_name || profile?.name || 'User',
    email: profile?.email,
    plan: normalizePlan(profile?.plan || profile?.subscription_plan || 'citizen'),
    clients,
    cases,
    document_summaries: docs,
    chat_history_summary: historySummary || undefined,
  };

  // Advocate-specific fields
  if (profile) {
    if (profile.advocate_id) ctx.advocate_id = profile.advocate_id;
    if (profile.bar_council) ctx.bar_council = profile.bar_council;
    if (profile.enrollment_number) ctx.enrollment_number = profile.enrollment_number;
    if (profile.court_of_practice) ctx.court_of_practice = profile.court_of_practice;
    if (profile.specializations) ctx.specializations = profile.specializations;
    if (profile.years_of_experience) ctx.years_of_experience = profile.years_of_experience;
    if (profile.state) ctx.state = profile.state;
    if (profile.preferred_language) ctx.preferred_language = profile.preferred_language;
    if (profile.firm_name) ctx.firm_name = profile.firm_name;
    if (profile.role_in_firm) ctx.role_in_firm = profile.role_in_firm;
  }

  return ctx;
}

// ─────────────────────────────────────────────────────────────
// FETCH PROFILE
// ─────────────────────────────────────────────────────────────
async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  // Try profiles table first, then users table as fallback
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // Fallback to users table if profiles doesn't exist
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return userData;
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// FETCH CLIENTS — with all fields that affect legal strategy
// ─────────────────────────────────────────────────────────────
async function fetchClients(supabase: ReturnType<typeof createClient>, userId: string): Promise<ClientProfile[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, age, sex, gender, occupation, phone, email, address, notes')
    .eq('user_id', userId)
    .order('name', { ascending: true })
    .limit(50); // Limit to avoid token overflow

  if (error || !data) return [];

  return data.map(c => ({
    id: c.id,
    name: c.name,
    age: c.age,
    sex: c.sex || c.gender,
    occupation: c.occupation,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes,
  }));
}

// ─────────────────────────────────────────────────────────────
// FETCH CASES
// ─────────────────────────────────────────────────────────────
async function fetchCases(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  specificCaseId?: string,
): Promise<CaseSummary[]> {

  let query = supabase
    .from('cases')
    .select('id, title, case_number, client_name, court, status, next_hearing_date, matter_type, description')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (specificCaseId) {
    // If in context of a specific case, put that case first (fetch it + 9 others)
    const { data: specificCase } = await supabase
      .from('cases')
      .select('id, title, case_number, client_name, court, status, next_hearing_date, matter_type, description')
      .eq('id', specificCaseId)
      .single();

    const { data: otherCases } = await query.neq('id', specificCaseId).limit(9);

    const allCases = [specificCase, ...(otherCases || [])].filter(Boolean);
    return allCases.map(mapCase);
  }

  const { data, error } = await query.limit(15); // top 15 recent cases
  if (error || !data) return [];
  return data.map(mapCase);
}

function mapCase(c: Record<string, unknown>): CaseSummary {
  return {
    id: c.id as string,
    title: c.title as string,
    case_number: c.case_number as string | undefined,
    client_name: c.client_name as string | undefined,
    court: c.court as string | undefined,
    status: c.status as string | undefined,
    next_hearing_date: c.next_hearing_date as string | undefined,
    matter_type: c.matter_type as string | undefined,
    description: c.description as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// FETCH DOCUMENTS — OCR summaries only (not full text)
// ─────────────────────────────────────────────────────────────
async function fetchDocuments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  caseId?: string,
): Promise<DocumentSummary[]> {

  let query = supabase
    .from('documents')
    .select('id, name, ocr_summary, case_id, created_at')
    .eq('user_id', userId)
    .not('ocr_summary', 'is', null)
    .order('created_at', { ascending: false });

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  const { data, error } = await query.limit(10);
  if (error || !data) return [];

  return data.map(d => ({
    id: d.id,
    name: d.name,
    // Truncate OCR summary to 300 chars to save tokens
    ocr_summary: d.ocr_summary ? String(d.ocr_summary).substring(0, 300) + (d.ocr_summary.length > 300 ? '...' : '') : undefined,
    case_id: d.case_id,
    uploaded_at: d.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────
// FETCH CHAT HISTORY SUMMARY
// Stored in chat_summaries table after auto-summarization
// ─────────────────────────────────────────────────────────────
async function fetchChatHistorySummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  caseId?: string,
): Promise<string | null> {

  let query = supabase
    .from('chat_summaries')
    .select('summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  const { data, error } = await query.single();
  if (error || !data) return null;
  return data.summary;
}

// ─────────────────────────────────────────────────────────────
// SAVE MESSAGES TO DB
// ─────────────────────────────────────────────────────────────
async function saveMessages(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  caseId: string | undefined,
  userMessage: string,
  aiReply: string,
) {
  const rows = [
    {
      user_id: userId,
      case_id: caseId || null,
      role: 'user',
      content: userMessage,
    },
    {
      user_id: userId,
      case_id: caseId || null,
      role: 'assistant',
      content: aiReply,
    },
  ];

  const { error } = await supabase.from('chat_messages').insert(rows);
  if (error) {
    console.error('Failed to save messages:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────
// TRIGGER BACKGROUND HISTORY SUMMARIZATION
// Called every 10 messages to keep context compact
// ─────────────────────────────────────────────────────────────
async function triggerHistorySummary(
  supabase: ReturnType<typeof createClient>,
  groqKey: string,
  userId: string,
  caseId: string | undefined,
  messages: Array<{ role: string; content: string }>,
) {
  const { buildChatHistorySummaryPrompt } = await import('../_shared/bhramarPrompt.ts');
  const summaryPrompt = buildChatHistorySummaryPrompt(messages);
  const summary = await callGroq(groqKey, [{ role: 'user', content: summaryPrompt }], 300);

  if (summary) {
    await supabase.from('chat_summaries').upsert({
      user_id: userId,
      case_id: caseId || null,
      summary,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,case_id' });
  }
}

// ─────────────────────────────────────────────────────────────
// CALL GROQ
// ─────────────────────────────────────────────────────────────
async function callGroq(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = MAX_TOKENS,
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,      // Lower = more precise legal answers, less hallucination
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from Groq');
  }

  return content;
}

// ─────────────────────────────────────────────────────────────
// NORMALIZE PLAN — handle any naming variation
// ─────────────────────────────────────────────────────────────
function normalizePlan(plan: string): UserContext['plan'] {
  const p = plan?.toLowerCase().trim();
  if (p === 'citizen' || p === 'free') return 'citizen';
  if (p === 'basic') return 'basic';
  if (p === 'advocate' || p === 'pro') return 'advocate';
  if (p === 'firm') return 'firm';
  if (p === 'firm_pro' || p === 'firm pro') return 'firm_pro';
  if (p === 'enterprise') return 'enterprise';
  return 'citizen';
}
