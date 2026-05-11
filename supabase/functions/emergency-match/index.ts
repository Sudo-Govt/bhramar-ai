import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { issue_type, state, district } = body as { issue_type?: string; state?: string; district?: string };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("profiles")
      .select("id, full_name, advocate_id, vakeel_score, vakeel_reviews_count, bar_council, court_of_practice, state, district, specializations, avatar_url")
      .eq("is_available_for_emergency", true)
      .in("user_type", ["advocate", "firm_member"])
      .order("vakeel_score", { ascending: false })
      .limit(3);

    if (state) query = query.eq("state", state);

    const { data, error } = await query;
    if (error) throw error;

    // Fallback: if state filter returns nothing, try without state
    let advocates = data || [];
    if (advocates.length === 0 && state) {
      const { data: d2 } = await supabase
        .from("profiles")
        .select("id, full_name, advocate_id, vakeel_score, vakeel_reviews_count, bar_council, court_of_practice, state, district, specializations, avatar_url")
        .eq("is_available_for_emergency", true)
        .in("user_type", ["advocate", "firm_member"])
        .order("vakeel_score", { ascending: false })
        .limit(3);
      advocates = d2 || [];
    }

    return new Response(
      JSON.stringify({ advocates, issue_type, state, district }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("emergency-match error", e);
    return new Response(JSON.stringify({ error: (e as Error).message, advocates: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
