import LegalLayout from "@/components/LegalLayout";

export default function Refund() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" updated="May 2026">
      <h2 className="text-xl font-semibold">1. Free trial</h2>
      <p>New users get a free tier with limited queries. No payment is collected until you choose to upgrade.</p>

      <h2 className="text-xl font-semibold">2. Subscription cancellation</h2>
      <p>You may cancel your subscription at any time from your profile or by emailing <a className="underline" href="mailto:support@bhramar.ai">support@bhramar.ai</a>. Cancellation takes effect at the end of the current billing cycle. You retain access until then.</p>

      <h2 className="text-xl font-semibold">3. Refunds</h2>
      <p>We offer a <strong>7-day money-back guarantee</strong> on the first paid month of any plan. After 7 days, fees are non-refundable except where required by law.</p>
      <p>Refund requests must be sent to <a className="underline" href="mailto:support@bhramar.ai">support@bhramar.ai</a> with your order ID and reason.</p>

      <h2 className="text-xl font-semibold">4. Refund processing</h2>
      <p>Approved refunds are processed within 5–7 business days via Razorpay back to the original payment method.</p>

      <h2 className="text-xl font-semibold">5. Service interruptions</h2>
      <p>If Bhramar is unavailable for more than 24 continuous hours due to a fault on our side, we will issue a pro-rata credit on request.</p>

      <h2 className="text-xl font-semibold">6. Contact</h2>
      <p>Questions about refunds or cancellations: <a className="underline" href="mailto:support@bhramar.ai">support@bhramar.ai</a>.</p>
    </LegalLayout>
  );
}
