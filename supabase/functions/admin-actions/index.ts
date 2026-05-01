// Super-admin command center actions.
// All actions gated by JWT email == SUPER_ADMIN. Writes to audit_log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPER_ADMIN = "bhramar123@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user || (u.user.email || "").toLowerCase() !== SUPER_ADMIN) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();
    const action = String(body?.action || "");

    const audit = (entity_type: string, entity_id: string | null, metadata: any) =>
      admin.from("audit_log").insert({
        user_id: u.user!.id, action, entity_type, entity_id, metadata,
      });

    switch (action) {
      case "set_tier": {
        const { user_id, tier } = body;
        await admin.from("profiles").update({
          subscription_tier: tier,
          subscription_started_at: new Date().toISOString(),
        }).eq("id", user_id);
        await audit("profile", user_id, { tier });
        break;
      }
      case "extend_subscription": {
        const { user_id, days } = body;
        const { data: p } = await admin.from("profiles").select("subscription_expires_at").eq("id", user_id).single();
        const base = p?.subscription_expires_at ? new Date(p.subscription_expires_at) : new Date();
        const end = base > new Date() ? base : new Date();
        end.setDate(end.getDate() + Number(days || 30));
        await admin.from("profiles").update({ subscription_expires_at: end.toISOString() }).eq("id", user_id);
        await audit("profile", user_id, { extended_days: days });
        break;
      }
      case "grant_role": {
        const { user_id, role } = body;
        await admin.from("user_roles").insert({ user_id, role });
        await audit("user_roles", user_id, { role, op: "grant" });
        break;
      }
      case "revoke_role": {
        const { user_id, role } = body;
        await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
        await audit("user_roles", user_id, { role, op: "revoke" });
        break;
      }
      case "delete_kb_file": {
        const { file_id } = body;
        await admin.from("document_chunks").delete().eq("source", "kb").eq("act_name", file_id);
        await admin.from("kb_files").delete().eq("id", file_id);
        await audit("kb_file", file_id, {});
        break;
      }
      case "toggle_global_kb": {
        const { file_id, is_global } = body;
        await admin.from("kb_files").update({ is_global: !!is_global }).eq("id", file_id);
        await audit("kb_file", file_id, { is_global });
        break;
      }
      case "delete_user": {
        const { user_id } = body;
        await admin.auth.admin.deleteUser(user_id);
        await audit("user", user_id, { op: "delete" });
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-actions", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
