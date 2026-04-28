import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window { Razorpay: any }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export async function startRazorpayCheckout(plan: "advocate" | "firm", userEmail?: string) {
  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok) { toast.error("Could not load Razorpay. Check your connection."); return; }

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { toast.error("Please sign in to subscribe."); return; }

  const { data: order, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: { plan },
  });
  if (error || !order?.order_id) { toast.error(error?.message || "Failed to create order"); return; }

  return new Promise<void>((resolve) => {
    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "Bhramar.ai",
      description: `${order.plan_label} subscription`,
      order_id: order.order_id,
      prefill: { email: userEmail || sess.session?.user.email || "" },
      theme: { color: "#D4AF37" },
      handler: async (resp: any) => {
        const { data: v, error: vErr } = await supabase.functions.invoke("razorpay-verify-payment", {
          body: {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          },
        });
        if (vErr || !v?.success) toast.error("Payment verification failed. Contact support.");
        else { toast.success(`Welcome to ${v.tier}!`); window.location.href = "/dashboard"; }
        resolve();
      },
      modal: { ondismiss: () => resolve() },
    });
    rzp.open();
  });
}
