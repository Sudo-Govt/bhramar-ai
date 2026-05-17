import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { session_id, transcript } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call AI for structured analysis
    const aiPrompt = `Analyze this courtroom/witness conversation transcript. Extract:
1. Case summary (2-3 sentences)
2. Key legal issues identified
3. Suggested IPC/BNS sections applicable
4. List of people mentioned with their roles
5. Important dates and deadlines
6. Recommended next steps for the advocate
7. Any financial amounts mentioned (fees, settlements, damages)

Transcript:
${transcript.slice(0, 8000)}`;

    // Use existing chat function or direct AI gateway
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: aiPrompt }],
        stream: false
      })
    });

    const analysis = await response.json();
    const summary = analysis.choices?.[0]?.message?.content || "Analysis pending...";

    // Update session with analysis
    await supabase
      .from("listener_sessions")
      .update({
        ai_summary: summary,
        status: "completed"
      })
      .eq("id", session_id);

    // If linked to case, create a note
    const { data: session } = await supabase
      .from("listener_sessions")
      .select("case_id")
      .eq("id", session_id)
      .single();

    if (session?.case_id) {
      await supabase.from("notes").insert({
        case_id: session.case_id,
        content: `🎙️ **Listener Session Analysis**\n\n${summary}\n\n---\n*Auto-generated from listener session*`,
        type: "ai_analysis"
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
