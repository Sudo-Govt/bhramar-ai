import LegalLayout from "@/components/LegalLayout";

export default function Contact() {
  return (
    <LegalLayout title="Contact Us" updated="May 2026">
      <p>We'd love to hear from you. For support, billing, partnerships, or grievances, reach us through any of the channels below.</p>

      <h2 className="text-xl font-semibold">Support</h2>
      <p>Email: <a className="underline" href="mailto:support@bhramar.ai">support@bhramar.ai</a><br />Response time: within 1 business day.</p>

      <h2 className="text-xl font-semibold">Grievance officer (DPDP Act)</h2>
      <p>Email: <a className="underline" href="mailto:support@bhramar.ai">support@bhramar.ai</a> with subject line "Grievance".</p>

      <h2 className="text-xl font-semibold">Business address</h2>
      <p>Bhramar.ai<br />Bengaluru, Karnataka, India</p>

      <p className="text-sm text-muted-foreground">For legal correspondence, please mark the email "Legal — Bhramar.ai".</p>
    </LegalLayout>
  );
}
