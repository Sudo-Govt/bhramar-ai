import LegalLayout from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="May 2026">
      <p>This policy explains how Bhramar.ai collects, uses, and protects your data, in compliance with India's Digital Personal Data Protection Act, 2023 (DPDP Act).</p>

      <h2 className="text-xl font-semibold">1. Data we collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Account: name, email, phone (optional), authentication identifiers.</li>
        <li>Profile: state, district, court of practice, professional details you choose to provide.</li>
        <li>Usage: chat messages, uploaded case documents, queries, AI responses.</li>
        <li>Payments: handled by Razorpay; we store only order IDs and status, never card numbers.</li>
        <li>Technical: IP, browser, device for security and fraud prevention.</li>
      </ul>

      <h2 className="text-xl font-semibold">2. How we use it</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To deliver the legal-research and drafting service.</li>
        <li>To improve retrieval accuracy on your own data (RAG indexing).</li>
        <li>To process payments and prevent abuse.</li>
        <li>To send service emails (login, billing, security).</li>
      </ul>

      <h2 className="text-xl font-semibold">3. AI processing</h2>
      <p>Your queries and uploaded documents may be sent to AI providers (Google Gemini, Lovable AI, Groq) strictly to generate responses. We do not permit these providers to train their models on your data. Embeddings of your documents are stored in our database to power your private knowledge base.</p>

      <h2 className="text-xl font-semibold">4. Sharing</h2>
      <p>We do not sell your data. We share data only with: (a) infrastructure providers (Lovable Cloud / Supabase) bound by contract, (b) Razorpay for payments, (c) authorities when legally compelled.</p>

      <h2 className="text-xl font-semibold">5. Storage and security</h2>
      <p>Data is stored on secure cloud infrastructure with encryption at rest and in transit. Access is gated by row-level security so users see only their own data.</p>

      <h2 className="text-xl font-semibold">6. Your rights (DPDP Act)</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Access and correct your data from your profile.</li>
        <li>Request deletion of your account and associated data by emailing support.</li>
        <li>Withdraw consent at any time (will end the service).</li>
        <li>Nominate a person to act on your behalf in case of incapacity.</li>
        <li>File grievances — see Contact page.</li>
      </ul>

      <h2 className="text-xl font-semibold">7. Retention</h2>
      <p>We retain account data until you delete your account. Audit and usage logs are retained for up to 90 days.</p>

      <h2 className="text-xl font-semibold">8. Children</h2>
      <p>Bhramar is not for users under 18. We do not knowingly collect data from minors.</p>

      <h2 className="text-xl font-semibold">9. Grievance officer</h2>
      <p>For privacy questions or DPDP requests, write to <a className="underline" href="mailto:support@bhramar.ai">support@bhramar.ai</a>.</p>

      <h2 className="text-xl font-semibold">10. Changes</h2>
      <p>We will notify you of material changes via email or in-app notice.</p>
    </LegalLayout>
  );
}
