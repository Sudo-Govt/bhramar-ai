import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { amount: number; label: string }> = {
  advocate: { amount: 49900, label: "Advocate" }, // ₹499
  firm: { amount: 390000, label: "Firm" },        // ₹3,900
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!KEY_ID || !KEY_SECRET) throw new Error("Razorpay keys not configured");

    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { plan } = await req.json();
    const planDef = PLANS[plan];
    if (!planDef) return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const basicAuth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify({
        amount: planDef.amount,
        currency: "INR",
        receipt: `bhramar_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, plan },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay order creation failed", order);
      return new Response(JSON.stringify({ error: order.error?.description || "Razorpay error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("razorpay_orders").insert({
      user_id: user.id,
      order_id: order.id,
      plan,
      amount: planDef.amount,
      currency: "INR",
      status: "created",
    });

    return new Response(
      JSON.stringify({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID, plan_label: planDef.label }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-order error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
