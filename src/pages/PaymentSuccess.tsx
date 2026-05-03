import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BhramarLogo } from "@/components/BhramarLogo";
import { useAuth } from "@/hooks/useAuth";

const PLAN_INFO: Record<string, { name: string; features: string[] }> = {
  basic: {
    name: "Basic",
    features: [
      "Unlimited messages",
      "Indian law Q&A",
      "Email support",
    ],
  },
  advocate: {
    name: "Advocate",
    features: [
      "Unlimited messages",
      "Up to 200 cases",
      "Auto case summaries",
      "Date & hearing reminders",
      "Personal AI assistant",
      "5 GB document storage",
    ],
  },
  firm: {
    name: "Firm",
    features: [
      "Everything in Advocate",
      "Shared workspace",
      "Internal case & file sharing",
      "Invite advocates, chat & discuss",
      "Personal AI for each member",
    ],
  },
  firm_pro: {
    name: "Firm Pro",
    features: [
      "Everything in Firm",
      "AI accuracy up to 99.9%",
      "Centralized AI for cross-case insights",
      "Priority support",
      "Advanced analytics",
    ],
  },
};

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const planKey = params.get("plan") || "advocate";
  const tier = params.get("tier") || "Pro";
  const info = PLAN_INFO[planKey] || PLAN_INFO.advocate;

  const [showCheck, setShowCheck] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowCheck(true), 100);
    const t2 = setTimeout(() => setShowContent(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link to="/"><BhramarLogo /></Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-10 text-center shadow-gold/20 shadow-lg">
          <div
            className={`mx-auto mb-6 transition-all duration-700 ${
              showCheck ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
          >
            <div className="mx-auto h-20 w-20 rounded-full bg-gold/15 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-gold" strokeWidth={2.5} />
            </div>
          </div>

          <div
            className={`transition-all duration-700 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Payment Successful!
            </h1>
            <p className="text-muted-foreground mb-1">
              Your <span className="text-gold font-semibold">{info.name}</span> plan is now active
            </p>
            {user?.email && (
              <p className="text-sm text-muted-foreground mb-8">
                Confirmation sent to {user.email}
              </p>
            )}

            <div className="text-left bg-secondary/40 border border-border rounded-xl p-5 mb-8">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                What's included
              </div>
              <ul className="space-y-2.5">
                {info.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1 h-11 bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="secondary" className="flex-1 h-11">
                <Link to="/profile">View Billing</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
