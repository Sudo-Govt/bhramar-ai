// Bhramar AI Copilot — case-file scoped chat (advocate + client modes)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BHRAMAR_COPILOT_SYSTEM, buildContextBlock, type CopilotCtx, type SessionType } from '../_shared/bhramarCopilot.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const EMBED_MODEL = 'google/text-embedding-004';
const CHAT_MODEL = 'google/gemini-2.5-flash';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return j({ error: 'LOVABLE_API_KEY missing' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'Unauthorized' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: 'Unauthorized' }, 401);

    const supa = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { case_id, message, session_type = 'advocate' as SessionType, client_id = null } = body as any;
    if (!case_id || !message?.trim()) return j({ error: 'case_id and message required' }, 400);

    // Verify advocate owns the case
    const { data: caseRow } = await supa.from('case_files').select('*').eq('id', case_id).maybeSingle();
    if (!caseRow || caseRow.advocate_id !== user.id) return j({ error: 'Case not found' }, 404);

    // Token gate
    try {
      await supa.rpc('consume_token', { p_amount: 1, p_reason: `bhramar-${session_type}` });
    } catch (e) {
      return j({ error: 'Daily token quota exhausted. Upgrade or buy add-on tokens.' }, 402);
    }

    // Load context
    const [{ data: profile }, { data: clients }, { data: docs }, { data: notes }, { data: hearings }, { data: recent }] = await Promise.all([
      supa.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supa.from('case_clients').select('*').eq('case_id', case_id),
      supa.from('case_documents').select('*').eq('case_id', case_id).order('created_at', { ascending: false }).limit(20),
      supa.from('case_notes').select('*').eq('case_id', case_id).order('created_at', { ascending: false }).limit(20),
      supa.from('case_hearings').select('*').eq('case_id', case_id).order('hearing_date', { ascending: false }).limit(10),
      supa.from('bhramar_chats').select('role, content').eq('case_id', case_id).eq('session_type', session_type).order('created_at', { ascending: false }).limit(6),
    ]);

    const client = client_id
      ? (clients || []).find((c: any) => c.id === client_id) || null
      : (clients || [])[0] || null;

    // RAG retrieval
    let ragChunks: any[] = [];
    try {
      const er = await fetch(`${AI_GATEWAY}/embeddings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, input: [message.slice(0, 6000)] }),
      });
      if (er.ok) {
        const ej = await er.json();
        const vec = ej.data[0].embedding;
        const { data: chunks } = await supa.rpc('match_chunks', {
          query_embedding: vec, match_user_id: user.id, match_count: 5, corpus_weight: 1.0,
        });
        if (Array.isArray(chunks)) ragChunks = chunks;
      }
    } catch (e) { console.warn('RAG fail', (e as Error).message); }

    const ctx: CopilotCtx = {
      session_type,
      user_name: session_type === 'advocate' ? (profile?.full_name || 'Advocate') : (client?.name || 'Client'),
      language_preference: (session_type === 'advocate' ? profile?.preferred_language : client?.preferred_language) || 'en',
      timestamp: new Date().toISOString(),
      advocate: {
        name: profile?.full_name,
        bar_council: profile?.bar_council,
        enrollment: profile?.enrollment_number,
        court: profile?.court_of_practice,
        specializations: profile?.specializations,
        firm: profile?.firm_id ? 'Firm member' : 'Solo',
        language: profile?.preferred_language,
      },
      client: client ? {
        name: client.name, age: client.age, gender: client.gender, occupation: client.occupation,
        district: client.district, state: client.state, language: client.preferred_language,
        is_in_custody: client.is_in_custody, custody_location: client.custody_location,
        legal_aid_eligible: client.legal_aid_eligible, relationship_to_case: client.relationship_to_case,
      } : null,
      case: {
        id: caseRow.id, title: caseRow.case_title, case_number: caseRow.case_number, court: caseRow.court,
        judge: caseRow.judge, case_type: caseRow.case_type, primary_act: caseRow.primary_act,
        sections_charged: caseRow.sections_charged, current_stage: caseRow.current_stage,
        next_date: caseRow.next_date, next_date_purpose: caseRow.next_date_purpose,
        date_of_fir: caseRow.date_of_fir, date_of_arrest: caseRow.date_of_arrest,
        date_of_charge_sheet: caseRow.date_of_charge_sheet, limitation_deadline: caseRow.limitation_deadline,
        is_bailable: caseRow.is_bailable, is_cognizable: caseRow.is_cognizable,
        police_station: caseRow.police_station, io_name: caseRow.io_name, pp_name: caseRow.pp_name,
        opposing_counsel: caseRow.opposing_counsel, key_facts: caseRow.key_facts,
      },
      documents: (docs || []).map((d: any) => ({ doc_type: d.doc_type, filename: d.filename, doc_date: d.doc_date, ai_summary: d.ai_summary })),
      notes: (notes || []).map((n: any) => ({ created_at: n.created_at, note_text: n.note_text })),
      hearings: (hearings || []).map((h: any) => ({ hearing_date: h.hearing_date, court: h.court, what_happened: h.what_happened, order_passed: h.order_passed })),
      rag_chunks: ragChunks.map((c: any) => ({
        source: [c.act_name, c.section_label].filter(Boolean).join(' — ') || 'Corpus',
        relevance: (c.similarity || 0) > 0.78 ? 'High' : 'Medium',
        content: c.content || '',
      })),
      recent_chat: (recent || []).reverse().map((m: any) => ({ role: m.role, content: m.content })),
    };

    const contextBlock = buildContextBlock(ctx);
    const userMessage = `${contextBlock}\n\n[USER_MESSAGE]\n${message}\n[/USER_MESSAGE]`;

    // Save user message (raw text only)
    await supa.from('bhramar_chats').insert({ case_id, session_type, client_id: client?.id || null, role: 'user', content: message });

    // Build prior turns from recent_chat
    const priorTurns = (recent || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));

    const upstream = await fetch(`${AI_GATEWAY}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        stream: true,
        temperature: 0.4,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: BHRAMAR_COPILOT_SYSTEM },
          ...priorTurns,
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text().catch(() => '');
      console.error('gateway err', upstream.status, t.slice(0, 400));
      if (upstream.status === 429) return j({ error: 'Rate limit' }, 429);
      if (upstream.status === 402) return j({ error: 'Credits exhausted' }, 402);
      return j({ error: 'AI gateway failed' }, 500);
    }

    // Tee stream: forward to client AND collect full text for saving
    let fullText = '';
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            const chunk = decoder.decode(value, { stream: true });
            // parse SSE lines for "content"
            for (const line of chunk.split('\n')) {
              const t = line.trim();
              if (!t.startsWith('data:')) continue;
              const payload = t.slice(5).trim();
              if (payload === '[DONE]') continue;
              try {
                const obj = JSON.parse(payload);
                const delta = obj?.choices?.[0]?.delta?.content;
                if (delta) fullText += delta;
              } catch { /* ignore */ }
            }
          }
        } finally {
          controller.close();
          if (fullText.trim()) {
            await supa.from('bhramar_chats').insert({ case_id, session_type, client_id: client?.id || null, role: 'assistant', content: fullText });
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (e) {
    console.error('bhramar-copilot fatal', e);
    return j({ error: (e as Error).message || 'Internal error' }, 500);
  }

  function j(o: any, s = 200) {
    return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
