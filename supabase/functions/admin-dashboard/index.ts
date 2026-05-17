// Super Admin Dashboard backend. Gated by env-based super admin check.
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
const PROVIDER_ENC_KEY_B64 = Deno.env.get("PROVIDER_ENC_KEY") || ""; // base64-encoded 32-byte key

// REMOVED: const SUPER_ADMIN = "bhramar123@gmail.com";
// Now reads from BHARAMAR_SUPER_ADMIN env var (set in Lovable Secrets)

function getSuperAdminEmail(): string {
  // Try Lovable-friendly env var name first
  const email = Deno.env.get("BHARAMAR_SUPER_ADMIN") || Deno.env.get("SUPER_ADMIN_EMAIL");
  if (!email) {
    console.error("CRITICAL: BHARAMAR_SUPER_ADMIN not set. Admin access disabled.");
    return "";
  }
  return email.toLowerCase().trim();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function importProviderKey() {
  if (!PROVIDER_ENC_KEY_B64) return null;
  const raw = atob(PROVIDER_ENC_KEY_B64);
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey("raw", bytes.buffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptText(plain: string) {
  const key = await importProviderKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plain);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  // base64
  let s = "";
  for (let i = 0; i < combined.length; i++) s += String.fromCharCode(combined[i]);
  return btoa(s);
}

async function decryptText(b64: string) {
  const key = await importProviderKey();
  if (!key) return null;
  try {
    const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const ct = data.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct.buffer);
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.error("decryptText failed", e);
    return null;
  }
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
    const email = (u?.user?.email || "").toLowerCase().trim();
    const superAdminEmail = getSuperAdminEmail();
    
    // NEW: check_admin action — returns admin status without requiring full auth
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    
    if (action === "check_admin") {
      return json({ 
        is_super_admin: !!u?.user && email === superAdminEmail,
        email: u?.user?.email || null,
        configured: !!superAdminEmail
      });
    }
    
    if (!u?.user || email !== superAdminEmail) return json({ error: "Forbidden" }, 403);
    const adminUserId = u.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

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
        // Reconcile: any storage object not yet in queue gets a pending row (covers files uploaded
        // directly to storage outside the admin UI).
        const folders = source ? [source] : ["corpus", "kb", "pipeline"];
        for (const folder of folders) {
          const { data: objs } = await admin.storage.from("rag-corpus").list(folder, { limit: 1000 });
          if (!objs?.length) continue;
          const paths = objs.filter((o) => o.name).map((o) => `${folder}/${o.name}`);
          const { data: existing } = await admin.from("rag_upload_queue").select("file_path").in("file_path", paths);
          const have = new Set((existing || []).map((r: any) => r.file_path));
          const toInsert = objs
            .filter((o) => o.name && !have.has(`${folder}/${o.name}`))
            .map((o) => ({
              source: folder,
              file_path: `${folder}/${o.name}`,
              original_filename: o.name,
              file_size_bytes: (o.metadata as any)?.size || null,
              status: "pending",
            }));
          if (toInsert.length) await admin.from("rag_upload_queue").insert(toInsert);
        }
        let q = admin.from("rag_upload_queue").select("*").neq("status", "deleted").order("uploaded_at", { ascending: false });
        if (source) q = q.eq("source", source);
        const { data, error } = await q;
        if (error) throw error;
        return json({ items: data });
      }
      case "rag_reprocess": {
        const { id } = body;
        const { error } = await admin.from("rag_upload_queue").update({
          status: "pending", error_message: null, processed_at: null,
        }).eq("id", id);
        if (error) throw error;
        await audit("rag_file", id, { op: "reprocess" });
        return json({ ok: true });
      }
      case "rag_retry_all": {
        const { error } = await admin.from("rag_upload_queue").update({
          status: "pending", error_message: null, processed_at: null,
        }).in("status", ["failed"]);
        if (error) throw error;
        // also kick the worker
        try { await fetch(`${SUPABASE_URL}/functions/v1/process-corpus-queue`, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_ROLE}` } }); } catch {}
        return json({ ok: true });
      }
      case "rag_run_now": {
        try { await fetch(`${SUPABASE_URL}/functions/v1/process-corpus-queue`, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_ROLE}` } }); } catch (e) { /* ignore */ }
        return json({ ok: true });
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

      // -------- AI PROVIDERS (encrypted keys) --------
      case "provider_list": {
        // returns list of providers stored under system_config key prefix ai_provider:
        const { data, error } = await admin.from("system_config").select("*").like("key", "ai_provider:%").order("key");
        if (error) throw error;
        const items = [];
        for (const row of data || []) {
          try {
            const obj = JSON.parse(row.value || "{}");
            let masked = null;
            if (obj.api_key_enc) {
              const dec = await decryptText(obj.api_key_enc);
              if (dec) masked = `****${dec.slice(-4)}`; else masked = null;
            }
            items.push({ key: row.key, name: (obj.name || row.key.replace(/^ai_provider:/, "")), provider: obj.provider, purpose: obj.purpose, api_key_masked: masked, meta: obj.meta || {} });
          } catch (e) {
            items.push({ key: row.key, raw: row.value });
          }
        }
        return json({ items });
      }
      case "provider_set": {
        const { name, provider: prov, purpose, api_key, meta } = body;
        if (!name || !prov || !purpose) return json({ error: "name/provider/purpose required" }, 400);
        let api_key_enc = null;
        if (api_key) {
          api_key_enc = await encryptText(String(api_key));
        }
        const key = `ai_provider:${name}`;
        const value = JSON.stringify({ name, provider: prov, purpose, api_key_enc, meta: meta || {} });
        const { error } = await admin.from("system_config").upsert({ key, value, updated_at: new Date().toISOString(), updated_by: adminUserId });
        if (error) throw error;
        await audit("ai_provider", key, { op: "set", name, provider: prov, purpose });
        return json({ ok: true });
      }
      case "provider_delete": {
        const { name } = body;
        if (!name) return json({ error: "name required" }, 400);
        const key = `ai_provider:${name}`;
        const { error } = await admin.from("system_config").delete().eq("key", key);
        if (error) throw error;
        await audit("ai_provider", key, { op: "delete", name });
        return json({ ok: true });
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

      // -------- IMPERSONATION / PROXY --------
      case "impersonation_create": {
        const { user_id, expires_minutes = 60 } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const expiresAt = new Date(Date.now() + Number(expires_minutes) * 60000).toISOString();
        const { data: row, error } = await admin.from("impersonation_tokens").insert({ user_id, created_by: adminUserId, expires_at: expiresAt }).select("token, expires_at").single();
        if (error) throw error;
        await audit("impersonation", row.token, { op: "create", user_id, expires_at: row.expires_at });
        return json({ token: row.token, expires_at: row.expires_at });
      }
      case "impersonation_list": {
        const { data, error } = await admin.from("impersonation_tokens").select("token, user_id, created_by, created_at, expires_at, used, revoked").order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        return json({ items: data });
      }
      case "impersonation_revoke": {
        const { token } = body;
        if (!token) return json({ error: "token required" }, 400);
        const { error } = await admin.from("impersonation_tokens").update({ revoked: true }).eq("token", token);
        if (error) throw error;
        await audit("impersonation", token, { op: "revoke" });
        return json({ ok: true });
      }
      case "user_suspend": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const { error } = await admin.from("profiles").update({ suspended: true }).eq("id", user_id);
        if (error) throw error;
        await audit("profile", user_id, { op: "suspend" });
        return json({ ok: true });
      }
      case "user_unsuspend": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const { error } = await admin.from("profiles").update({ suspended: false }).eq("id", user_id);
        if (error) throw error;
        await audit("profile", user_id, { op: "unsuspend" });
        return json({ ok: true });
      }
      case "impersonation_proxy": {
        const { token, proxy_action } = body;
        if (!token) return json({ error: "token required" }, 400);
        const { data: t } = await admin.from("impersonation_tokens").select("*").eq("token", token).maybeSingle();
        if (!t) return json({ error: "invalid token" }, 404);
        if (t.revoked) return json({ error: "token revoked" }, 403);
        if (t.expires_at && new Date(t.expires_at) < new Date()) return json({ error: "token expired" }, 403);
        const targetUserId = t.user_id;
        // Do not mark token used — proxy tokens remain valid until expiry/revoke
        switch (proxy_action) {
          case "get_profile": {
            const { data: profile } = await admin.from("profiles").select("*").eq("id", targetUserId).maybeSingle();
            return json({ profile });
          }
          case "update_profile": {
            const { patch } = body;
            const allowed = ["full_name","state","district","specializations","is_available_for_emergency"];
            const clean: any = {};
            for (const k of allowed) if (k in (patch || {})) clean[k] = patch[k];
            const { error } = await admin.from("profiles").update(clean).eq("id", targetUserId);
            if (error) throw error;
            await audit("impersonation_action", targetUserId, { op: "update_profile", admin: adminUserId, patch: clean });
            return json({ ok: true });
          }
          case "list_cases": {
            const { limit = 50 } = body;
            const { data, error } = await admin.from("cases").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(limit);
            if (error) throw error;
            return json({ items: data });
          }
          case "case_detail": {
            const { case_id } = body;
            const { data: cs } = await admin.from("cases").select("*").eq("id", case_id).maybeSingle();
            if (!cs) return json({ error: "case not found" }, 404);
            if (cs.user_id !== targetUserId) return json({ error: "forbidden" }, 403);
            const [msgs, notes, tasks, docs] = await Promise.all([
              admin.from("conversations").select("id, title, created_at, messages(id, role, content, created_at)").eq("case_id", case_id).order("created_at", { ascending: false }),
              admin.from("notes").select("*").eq("case_id", case_id),
              admin.from("tasks").select("*").eq("case_id", case_id),
              admin.from("documents").select("*").eq("case_id", case_id),
            ]);
            return json({ case: cs, conversations: msgs.data || [], notes: notes.data || [], tasks: tasks.data || [], documents: docs.data || [] });
          }
          case "user_chat_history": {
            const { limit = 200 } = body;
            const { data, error } = await admin.from("messages").select("id, conversation_id, role, content, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(limit);
            if (error) throw error;
            return json({ items: data });
          }
          default:
            return json({ error: "unknown proxy action" }, 400);
        }
      }

      // -------- CASES (end) --------

      default:
        return json({ error: "unknown action: " + action }, 400);
    }
  } catch (e) {
    console.error("admin-dashboard", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
