// supabase/functions/chat/index.ts
// Bhramar.ai — Chat edge function (Phase 1: 4-layer context + pgvector RAG + SSE streaming via Lovable AI Gateway)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildSystemPrompt,
  type FullContext,
  type ProfileCtx,
  type CaseCtx,
  type ChunkCtx,
  buildChatHistorySummaryPrompt,
} from '../_shared/bhramarPrompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const GOOGLE_AI_KEY = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY') || '';
const GOOGLE_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
const DEFAULT_CHAT_MODEL = 'google/gemini-2.5-flash';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not set');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError('Unauthorized', 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonError('Unauthorized', 401);

    const supa = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { messages, case_id, summarize_history } = body as {
      messages: { role: string; content: string }[];
      case_id?: string;
      summarize_history?: boolean;
    };
    if (!Array.isArray(messages) || messages.length === 0) return jsonError('messages required', 400);

    // Summarize-only mode (non-streaming JSON)
    if (summarize_history) {
      const summary = await callChatJSON(LOVABLE_API_KEY, DEFAULT_CHAT_MODEL, [
        { role: 'user', content: buildChatHistorySummaryPrompt(messages) },
      ]);
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Build 4-layer context ───────────────────────────────
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const ctx = await buildContext(supa, user.id, case_id);

    // ── RAG: embed + match_chunks (fail-soft) ───────────────
    if (lastUser.trim()) {
      try {
        const vec = await embed(lastUser);
        const { data: chunks } = await supa.rpc('match_chunks', {
          query_embedding: vec as unknown as string,
          match_user_id: user.id,
          match_count: 5,
          corpus_weight: 1.0,
        });
        if (Array.isArray(chunks)) {
          ctx.ragChunks = chunks.map((c: any): ChunkCtx => ({
            act_name: c.act_name ?? null,
            section_label: c.section_label ?? null,
            content: c.content ?? '',
            similarity: c.similarity ?? 0,
          }));
        }
      } catch (e) {
        console.warn('RAG retrieval failed (continuing without):', (e as Error).message);
      }
    }

    const systemPrompt = buildSystemPrompt(ctx);

    // Resolve model (prefer ai_settings)
    let model = DEFAULT_CHAT_MODEL;
    try {
      const { data: s } = await supa.from('ai_settings').select('model').eq('id', 1).single();
      if (s?.model) model = s.model;
    } catch { /* ignore */ }

    // ── Stream from Lovable AI Gateway, prefix with sources sidecar ──
    const upstream = await fetch(`${AI_GATEWAY}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.4,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text().catch(() => '');
      console.error('Gateway error', upstream.status, t.slice(0, 500));
      if (upstream.status === 429) return jsonError('Rate limit', 429);
      if (upstream.status === 402) return jsonError('Credits exhausted', 402);
      return jsonError('AI gateway failed', 500);
    }

    const sources = (ctx.ragChunks || []).map((c) => ({
      label: [c.act_name, c.section_label].filter(Boolean).join(' — ') || 'Corpus chunk',
      similarity: c.similarity,
    }));

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        // sidecar: emit sources first
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ sources })}\n\n`));

        const reader = upstream.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error('stream pipe err', e);
        } finally {
          controller.close();
        }
      },
    });

    // Fire-and-forget usage log
    supa.from('usage_logs').insert({ user_id: user.id, kind: 'chat' }).then(() => {});

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    console.error('chat fn fatal', e);
    return jsonError((e as Error).message || 'Internal error', 500);
  }
});

// ─────────────────────────────────────────────────────────────
function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function embed(apiKey: string, text: string): Promise<number[]> {
  const r = await fetch(`${AI_GATEWAY}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: [text.slice(0, 6000)] }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}`);
  const j = await r.json();
  return j.data[0].embedding as number[];
}

async function callChatJSON(apiKey: string, model: string, messages: any[]): Promise<string> {
  const r = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });
  if (!r.ok) throw new Error(`chat ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

// ─── Context loader ──────────────────────────────────────────
async function buildContext(
  supa: ReturnType<typeof createClient>,
  userId: string,
  caseId?: string,
): Promise<FullContext> {
  const { data: profileRow } = await supa.from('profiles').select('*').eq('id', userId).maybeSingle();
  const profile: ProfileCtx = {
    id: userId,
    full_name: profileRow?.full_name ?? null,
    email: profileRow?.email ?? null,
    user_type: (profileRow?.user_type as any) || 'citizen',
    state: profileRow?.state ?? null,
    district: profileRow?.district ?? null,
    age: profileRow?.age,
    gender: profileRow?.gender,
    occupation: profileRow?.occupation,
    marital_status: profileRow?.marital_status,
    earning_bracket: profileRow?.earning_bracket,
    family_background: profileRow?.family_background,
    prior_case_history: profileRow?.prior_case_history,
    physical_condition: profileRow?.physical_condition,
    advocate_id: profileRow?.advocate_id,
    bar_council: profileRow?.bar_council,
    enrollment_number: profileRow?.enrollment_number,
    court_of_practice: profileRow?.court_of_practice,
    specializations: profileRow?.specializations,
    years_experience: profileRow?.years_experience,
    firm_id: profileRow?.firm_id,
    firm_role: profileRow?.firm_role,
  };

  const ctx: FullContext = { profile };

  if (caseId) {
    const { data: c } = await supa
      .from('cases')
      .select('id, name, case_number, client_name, client_id, status, stage, priority, deadline, ai_summary, complaint')
      .eq('id', caseId)
      .maybeSingle();

    if (c) {
      ctx.activeCase = {
        id: c.id, name: c.name, case_number: c.case_number, client_name: c.client_name,
        status: c.status, stage: c.stage, priority: c.priority, deadline: c.deadline,
        ai_summary: c.ai_summary, complaint: c.complaint,
      } as CaseCtx;

      if (c.client_id) {
        const { data: cl } = await supa.from('clients')
          .select('full_name, notes, occupation, age').eq('id', c.client_id).maybeSingle();
        if (cl) ctx.client = cl as any;
      }

      const [{ data: docs }, { data: notes }, { data: tasks }] = await Promise.all([
        supa.from('documents').select('filename, ai_summary').eq('case_id', caseId).order('created_at', { ascending: false }).limit(5),
        supa.from('notes').select('body, updated_at').eq('case_id', caseId).order('updated_at', { ascending: false }).limit(5),
        supa.from('tasks').select('title, due_date, status').eq('case_id', caseId).neq('status', 'done').order('due_date', { ascending: true }).limit(8),
      ]);
      ctx.documents = (docs as any) || [];
      ctx.notes = (notes as any) || [];
      ctx.tasks = (tasks as any) || [];
    }
  }

  if (profile.user_type === 'firm_member' && profile.firm_id) {
    const [{ data: firm }, { count: members }, { count: active }] = await Promise.all([
      supa.from('firms').select('name').eq('id', profile.firm_id).maybeSingle(),
      supa.from('firm_members').select('id', { count: 'exact', head: true }).eq('firm_id', profile.firm_id),
      supa.from('cases').select('id', { count: 'exact', head: true }).eq('firm_id', profile.firm_id).eq('status', 'Active'),
    ]);
    if (firm) {
      ctx.firm = { name: firm.name as string, member_count: members || 0, active_cases: active || 0 };
    }
  }

  return ctx;
}
