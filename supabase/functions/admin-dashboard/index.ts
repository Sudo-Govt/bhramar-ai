// Super Admin Dashboard backend. Gated by email == SUPER_ADMIN.
// All admin reads/writes go through this single endpoint.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPER_ADMIN = "bhramar123@gmail.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    const email = (u?.user?.email || "").toLowerCase();
    if (!u?.user || email !== SUPER_ADMIN) return json({ error: "Forbidden" }, 403);
    const adminUserId = u.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    const audit = (entity_type: string, entity_id: string | null, metadata: any) =>
      admin.from("audit_log").insert({
        user_id: adminUserId,
        action,
        entity_type,
        entity_id,
        metadata: metadata || {},
      });

    switch (action) {
      // -------- SYSTEM CONFIG / PROMPT --------
      case "config_list": {
        const { data, error } = await admin.from("system_config").select("*").order("key");
        if (error) throw error;
        return json({ items: data });
      }
      case "config_set": {
        const { key, value } = body;
        if (!key) return json({ error: "key required" }, 400);
        const { error } = await admin.from("system_config").upsert({
          key, value: String(value ?? ""), updated_at: new Date().toISOString(), updated_by: adminUserId,
        });
        if (error) throw error;
        await audit("system_config", null, { key, value });
        return json({ ok: true });
      }
      case "config_delete": {
        const { key } = body;
        if (!key) return json({ error: "key required" }, 400);
        const { error } = await admin.from("system_config").delete().eq("key", key);
        if (error) throw error;
        await audit("system_config", null, { key, op: "delete" });
        return json({ ok: true });
      }
      case "prompt_active": {
        // Latest from prompt_versions, fall back to system_config.master_prompt
        const { data: latest } = await admin
          .from("prompt_versions").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (latest && latest.prompt_text) {
          return json({ prompt_text: latest.prompt_text, version_label: latest.version_label, source: "prompt_versions" });
        }
        const { data: cfg } = await admin.from("system_config").select("value").eq("key", "master_prompt").maybeSingle();
        const { data: ver } = await admin.from("system_config").select("value").eq("key", "prompt_version").maybeSingle();
        return json({ prompt_text: cfg?.value || "", version_label: ver?.value || "v1.0", source: "system_config" });
      }
      case "prompt_publish": {
        const { prompt_text, version_label } = body;
        const text = String(prompt_text ?? "");
        const label = String(version_label || `v${Date.now()}`);
        // Snapshot the new version
        await admin.from("prompt_versions").insert({
          version_label: label, prompt_text: text, created_by: adminUserId,
        });
        await admin.from("system_config").upsert({
          key: "master_prompt", value: text, updated_at: new Date().toISOString(), updated_by: adminUserId,
        });
        await admin.from("system_config").upsert({
          key: "prompt_version", value: label, updated_at: new Date().toISOString(), updated_by: adminUserId,
        });
        await audit("prompt", null, { version_label: label, length: text.length });
        return json({ ok: true });
      }
      case "prompt_versions_list": {
        const { data, error } = await admin
          .from("prompt_versions").select("*").order("created_at", { ascending: false }).limit(10);
        if (error) throw error;
        return json({ items: data });
      }
      case "prompt_restore": {
        const { id } = body;
        const { data: ver } = await admin.from("prompt_versions").select("*").eq("id", id).maybeSingle();
        if (!ver) return json({ error: "version not found" }, 404);
        // archive current first
        const { data: prev } = await admin.from("system_config").select("value").eq("key", "master_prompt").maybeSingle();
        const { data: prevVer } = await admin.from("system_config").select("value").eq("key", "prompt_version").maybeSingle();
        if (prev?.value) {
          await admin.from("prompt_versions").insert({
            version_label: prevVer?.value || "v?", prompt_text: prev.value, created_by: adminUserId,
          });
        }
        await admin.from("system_config").upsert({
          key: "master_prompt", value: ver.prompt_text, updated_at: new Date().toISOString(), updated_by: adminUserId,
        });
        await admin.from("system_config").upsert({
          key: "prompt_version", value: ver.version_label, updated_at: new Date().toISOString(), updated_by: adminUserId,
        });
        await audit("prompt", id, { op: "restore", version_label: ver.version_label });
        return json({ ok: true });
      }

      // -------- RAG UPLOAD QUEUE --------
      case "rag_list": {
        const { source } = body;
        let q = admin.from("rag_upload_queue").select("*").neq("status", "deleted").order("uploaded_at", { ascending: false });
        if (source) q = q.eq("source", source);
        const { data, error } = await q;
        if (error) throw error;
        return json({ items: data });
      }
      case "rag_upload": {
        const { source, original_filename, file_b64, mime_type, file_size_bytes } = body;
        if (!["corpus", "kb", "pipeline"].includes(source)) return json({ error: "bad source" }, 400);
        if (!file_b64 || !original_filename) return json({ error: "file required" }, 400);
        const bytes = Uint8Array.from(atob(file_b64), (c) => c.charCodeAt(0));
        const safeName = original_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${source}/${Date.now()}_${safeName}`;
        const { error: upErr } = await admin.storage.from("rag-corpus").upload(path, bytes, {
          contentType: mime_type || "application/octet-stream", upsert: false,
        });
        if (upErr) throw upErr;
        const { data: row, error } = await admin.from("rag_upload_queue").insert({
          source, file_path: path, original_filename, file_size_bytes: file_size_bytes || bytes.length,
          uploaded_by: adminUserId, status: "pending",
        }).select().single();
        if (error) throw error;
        await audit("rag_file", row.id, { source, original_filename });
        return json({ item: row });
      }
      case "rag_delete": {
        const { id } = body;
        const { data: row } = await admin.from("rag_upload_queue").select("*").eq("id", id).maybeSingle();
        if (!row) return json({ error: "not found" }, 404);
        await admin.storage.from("rag-corpus").remove([row.file_path]);
        await admin.from("rag_upload_queue").update({ status: "deleted" }).eq("id", id);
        await audit("rag_file", id, { op: "delete" });
        return json({ ok: true });
      }
      case "rag_preview": {
        const { id } = body;
        const { data: row } = await admin.from("rag_upload_queue").select("*").eq("id", id).maybeSingle();
        if (!row) return json({ error: "not found" }, 404);
        const { data: file, error } = await admin.storage.from("rag-corpus").download(row.file_path);
        if (error) throw error;
        const text = await file.text();
        return json({ filename: row.original_filename, content: text.slice(0, 200000) });
      }

      // -------- USERS --------
      case "users_list": {
        const { search = "", user_type, tier, limit = 20, offset = 0 } = body;
        let q = admin.from("profiles").select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        if (user_type) q = q.eq("user_type", user_type);
        if (tier) q = q.eq("subscription_tier", tier);
        const { data, count, error } = await q;
        if (error) throw error;
        return json({ items: data, count });
      }
      case "user_update": {
        const { user_id, patch } = body;
        const allowed = ["full_name","user_type","subscription_tier","state","district","specializations","is_available_for_emergency"];
        const clean: any = {};
        for (const k of allowed) if (k in (patch || {})) clean[k] = patch[k];
        const { error } = await admin.from("profiles").update(clean).eq("id", user_id);
        if (error) throw error;
        await audit("profile", user_id, { patch: clean });
        return json({ ok: true });
      }
      case "user_set_tier": {
        const { user_id, tier } = body;
        await admin.from("profiles").update({
          subscription_tier: tier, subscription_started_at: new Date().toISOString(),
        }).eq("id", user_id);
        await audit("profile", user_id, { tier });
        return json({ ok: true });
      }
      case "user_extend_subscription": {
        const { user_id, days } = body;
        const { data: p } = await admin.from("profiles").select("subscription_expires_at").eq("id", user_id).single();
        const base = p?.subscription_expires_at ? new Date(p.subscription_expires_at) : new Date();
        const end = base > new Date() ? base : new Date();
        end.setDate(end.getDate() + Number(days || 30));
        await admin.from("profiles").update({ subscription_expires_at: end.toISOString() }).eq("id", user_id);
        await audit("profile", user_id, { extended_days: days });
        return json({ ok: true });
      }
      case "user_delete": {
        const { user_id } = body;
        await admin.auth.admin.deleteUser(user_id);
        await audit("user", user_id, { op: "delete" });
        return json({ ok: true });
      }
      case "user_reset_password": {
        const { email: target_email } = body;
        const { error } = await admin.auth.admin.generateLink({ type: "recovery", email: target_email });
        if (error) throw error;
        await audit("user", null, { op: "reset_password", email: target_email });
        return json({ ok: true });
      }
      case "user_chat_history": {
        const { user_id, limit = 200 } = body;
        const { data, error } = await admin.from("messages")
          .select("id, conversation_id, role, content, created_at")
          .eq("user_id", user_id).order("created_at", { ascending: false }).limit(limit);
        if (error) throw error;
        return json({ items: data });
      }

      // -------- CASES --------
      case "cases_list": {
        const { search = "", limit = 20, offset = 0 } = body;
        let q = admin.from("cases").select("*, profiles!cases_user_id_fkey(full_name, email)", { count: "exact" })
          .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        // profiles fk may not exist — fallback to plain
        if (search) q = q.or(`name.ilike.%${search}%,case_number.ilike.%${search}%,client_name.ilike.%${search}%`);
        let { data, count, error } = await q;
        if (error) {
          let q2 = admin.from("cases").select("*", { count: "exact" })
            .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
          if (search) q2 = q2.or(`name.ilike.%${search}%,case_number.ilike.%${search}%,client_name.ilike.%${search}%`);
          const r = await q2; data = r.data as any; count = r.count;
        }
        // attach advocate names
        const ids = Array.from(new Set((data || []).map((c: any) => c.user_id)));
        const { data: profs } = await admin.from("profiles").select("id, full_name, email").in("id", ids);
        const map = new Map((profs || []).map((p: any) => [p.id, p]));
        const enriched = (data || []).map((c: any) => ({
          ...c, advocate_name: map.get(c.user_id)?.full_name || map.get(c.user_id)?.email || "—",
        }));
        return json({ items: enriched, count });
      }
      case "case_detail": {
        const { case_id } = body;
        const [cs, msgs, notes, tasks, docs] = await Promise.all([
          admin.from("cases").select("*").eq("id", case_id).maybeSingle(),
          admin.from("conversations").select("id, title, created_at, messages(id, role, content, created_at)")
            .eq("case_id", case_id).order("created_at", { ascending: false }),
          admin.from("notes").select("*").eq("case_id", case_id),
          admin.from("tasks").select("*").eq("case_id", case_id),
          admin.from("documents").select("*").eq("case_id", case_id),
        ]);
        return json({
          case: cs.data, conversations: msgs.data || [],
          notes: notes.data || [], tasks: tasks.data || [], documents: docs.data || [],
        });
      }
      case "case_update": {
        const { case_id, patch } = body;
        const allowed = ["name","status","stage","priority","deadline"];
        const clean: any = {};
        for (const k of allowed) if (k in (patch || {})) clean[k] = patch[k];
        const { error } = await admin.from("cases").update(clean).eq("id", case_id);
        if (error) throw error;
        await audit("case", case_id, { patch: clean });
        return json({ ok: true });
      }
      case "case_delete": {
        const { case_id } = body;
        // cascade
        await admin.from("messages").delete().in(
          "conversation_id",
          (await admin.from("conversations").select("id").eq("case_id", case_id)).data?.map((r: any) => r.id) || []
        );
        await admin.from("conversations").delete().eq("case_id", case_id);
        await admin.from("notes").delete().eq("case_id", case_id);
        await admin.from("tasks").delete().eq("case_id", case_id);
        await admin.from("documents").delete().eq("case_id", case_id);
        await admin.from("cases").delete().eq("id", case_id);
        await audit("case", case_id, { op: "delete" });
        return json({ ok: true });
      }

      // -------- AUDIT LOG --------
      case "audit_list": {
        const { action_filter, from, to, limit = 20, offset = 0 } = body;
        let q = admin.from("audit_log").select("*, profiles(email)", { count: "exact" })
          .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        if (action_filter) q = q.eq("action", action_filter);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        let { data, count, error } = await q;
        if (error) {
          // fallback without join
          let q2 = admin.from("audit_log").select("*", { count: "exact" })
            .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
          if (action_filter) q2 = q2.eq("action", action_filter);
          if (from) q2 = q2.gte("created_at", from);
          if (to) q2 = q2.lte("created_at", to);
          const r = await q2; data = r.data as any; count = r.count;
        }
        const ids = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
        const { data: profs } = await admin.from("profiles").select("id, email").in("id", ids);
        const map = new Map((profs || []).map((p: any) => [p.id, p.email]));
        const enriched = (data || []).map((r: any) => ({ ...r, user_email: map.get(r.user_id) || "—" }));
        return json({ items: enriched, count });
      }

      default:
        return json({ error: "unknown action: " + action }, 400);
    }
  } catch (e) {
    console.error("admin-dashboard", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
