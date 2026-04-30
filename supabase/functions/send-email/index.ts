// Send email via the user's stored SMTP config.
// Uses denomailer (SMTP client for Deno).
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing auth" }, 401);

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const { to, subject, html, text, cc, bcc } = await req.json();
    if (!to || !subject || (!html && !text)) {
      return json({ error: "to, subject, and html/text are required" }, 400);
    }

    const admin = createClient(supaUrl, service);
    const { data: smtp, error } = await admin.from("smtp_configs").select("*").eq("user_id", u.user.id).maybeSingle();
    if (error || !smtp) return json({ error: "SMTP not configured" }, 400);

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: Number(smtp.port) || 587,
        tls: smtp.use_tls !== false,
        auth: smtp.username ? { username: smtp.username, password: smtp.password_encrypted } : undefined,
      },
    });

    await client.send({
      from: smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : smtp.from_email,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      content: text || "",
      html: html || undefined,
    });
    await client.close();

    return json({ ok: true });
  } catch (e) {
    console.error("send-email error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
