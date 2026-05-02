import LegalLayout from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="May 2026">
      <h2 className="text-xl font-semibold">1. Acceptance</h2>
      <p>By creating an account or using Bhramar.ai ("Bhramar", "we", "us"), you agree to these Terms. If you do not agree, do not use the service.</p>

      <h2 className="text-xl font-semibold">2. Service description</h2>
      <p>Bhramar is an AI-assisted legal research and drafting platform for Indian advocates and individuals. Bhramar does not provide legal advice and is not a substitute for a qualified advocate. Outputs may contain inaccuracies — always verify with primary sources before filing or relying on them in court.</p>

      <h2 className="text-xl font-semibold">3. User accounts</h2>
      <p>You are responsible for activity on your account. Keep your password confidential. Notify us immediately of any unauthorised use.</p>

      <h2 className="text-xl font-semibold">4. Acceptable use</h2>
      <p>You will not: (a) use Bhramar for unlawful purposes, (b) attempt to reverse-engineer the service, (c) upload malware or content you do not have rights to, (d) impersonate any person, or (e) abuse the API or model in ways that degrade service for others.</p>

      <h2 className="text-xl font-semibold">5. Subscriptions and payments</h2>
      <p>Paid plans are billed via Razorpay. Recurring charges renew until cancelled. See our Refund Policy for cancellation terms.</p>

      <h2 className="text-xl font-semibold">6. Intellectual property</h2>
      <p>The Bhramar name, logo, and software are owned by us. You retain ownership of content you upload. By uploading, you grant us a limited licence to process it solely to provide the service.</p>

      <h2 className="text-xl font-semibold">7. Disclaimers</h2>
      <p>The service is provided "as is" without warranties. Bhramar is a tool, not legal counsel. We do not guarantee the accuracy, completeness, or fitness of any AI output for any purpose.</p>

      <h2 className="text-xl font-semibold">8. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, our total liability for any claim is limited to the fees you paid in the three months preceding the claim.</p>

      <h2 className="text-xl font-semibold">9. Termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms. You may close your account at any time from your profile.</p>

      <h2 className="text-xl font-semibold">10. Governing law</h2>
      <p>These Terms are governed by the laws of India. Courts at Bengaluru, Karnataka shall have exclusive jurisdiction.</p>

      <h2 className="text-xl font-semibold">11. Changes</h2>
      <p>We may update these Terms. Material changes will be communicated via email or in-app notice.</p>
    </LegalLayout>
  );
}
