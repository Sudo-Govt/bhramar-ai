import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Check, ArrowLeft, Crown, Sparkles, Building2, Scale, Zap, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { startRazorpayCheckout } from "@/lib/razorpay";

type Tier = {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  icon: typeof Sparkles;
  accent: "muted" | "gold" | "navy" | "premium";
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "Try Bhramar before you commit",
    features: [
      "5 messages per day",
      "Refreshes daily at 5 AM IST",
      "Indian law Q&A",
      "Email support",
    ],
    cta: "Get Started",
    icon: Sparkles,
    accent: "muted",
  },
  {
    name: "Basic",
    price: "₹199",
    period: "/ month",
    desc: "Unlimited chat for students & juniors",
    features: [
      "Unlimited messages",
      "Indian law Q&A",
      "Conversation history",
      "Priority email support",
    ],
    cta: "Start Basic",
    icon: Zap,
    accent: "navy",
  },
  {
    name: "Advocate",
    price: "₹499",
    period: "/ month",
    desc: "For solo practitioners",
    features: [
      "Everything in Basic",
      "Up to 200 cases",
      "Auto case summaries",
      "Date & hearing reminders",
      "Personal AI assistant",
      "5 GB document storage",
    ],
    cta: "Upgrade to Advocate",
    highlight: true,
    badge: "Most popular",
    icon: Scale,
    accent: "gold",
  },
  {
    name: "Firm",
    price: "₹2,999",
    period: "/ month",
    desc: "For chambers (up to 10 users)",
    features: [
      "Everything in Advocate",
      "Shared workspace",
      "Internal case & file sharing",
      "Invite advocates, chat & discuss",
      "Personal AI for each member",
      "Centralized firm-wide insights",
    ],
    cta: "Start Firm Plan",
    icon: Building2,
    accent: "navy",
  },
  {
    name: "Firm Pro",
    price: "₹4,999",
    period: "/ month",
    desc: "Premium AI accuracy & analytics",
    features: [
      "Everything in Firm",
      "AI accuracy up to 99.9%",
      "Cross-case AI insights",
      "Advanced analytics dashboard",
      "Priority support & onboarding",
      "Custom integrations",
    ],
    cta: "Go Firm Pro",
    badge: "Premium",
    icon: Rocket,
    accent: "premium",
  },
  {
    name: "Enterprise",
    price: "Contact us",
    period: "",
    desc: "For institutions & large firms",
    features: [
      "Custom user limits",
      "Dedicated infrastructure",
      "On-premise / data residency",
      "SSO, SOC 2, custom SLAs",
      "Dedicated success manager",
    ],
    cta: "Contact Sales",
    icon: Building2,
    accent: "muted",
  },
];

const accentStyles: Record<Tier["accent"], { card: string; icon: string; price: string; cta: string }> = {
  muted: {
    card: "border-border bg-card hover:border-foreground/20",
    icon: "bg-secondary text-foreground",
    price: "text-foreground",
    cta: "bg-secondary hover:bg-secondary/80 text-foreground",
  },
  navy: {
    card: "border-border bg-card hover:border-gold/40",
    icon: "bg-gold/10 text-gold",
    price: "text-foreground",
    cta: "bg-secondary hover:bg-secondary/80 text-foreground border border-gold/30",
  },
  gold: {
    card: "border-gold bg-gradient-to-b from-card via-card to-gold/5 shadow-gold",
    icon: "bg-gold text-primary-foreground",
    price: "text-gold",
    cta: "bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold",
  },
  premium: {
    card: "border-gold/60 bg-gradient-to-br from-card via-card to-gold/10",
    icon: "bg-gradient-to-br from-gold to-gold/60 text-primary-foreground",
    price: "bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent",
    cta: "bg-gradient-to-r from-gold to-gold-bright hover:opacity-90 text-primary-foreground shadow-gold",
  },
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCta = async (tierName: string) => {
    if (tierName === "Free") {
      navigate(user ? "/dashboard" : "/auth");
      return;
    }
    if (tierName === "Enterprise") {
      window.location.href = "mailto:hello@bhramar.ai?subject=Enterprise%20enquiry";
      return;
    }
    if (!user) { navigate("/auth"); return; }
    const planMap: Record<string, "basic" | "advocate" | "firm" | "firm_pro"> = {
      "Basic": "basic",
      "Advocate": "advocate",
      "Firm": "firm",
      "Firm Pro": "firm_pro",
    };
    const plan = planMap[tierName];
    if (plan) await startRazorpayCheckout(plan, user.email || undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/"><BhramarLogo /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
      </header>

      <section className="relative py-20 bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/4 h-72 w-72 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 right-1/4 h-72 w-72 bg-primary/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 text-center max-w-3xl relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
            Pricing built for <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">Indian advocates</span>
          </h1>
          <p className="text-muted-foreground text-lg animate-fade-in">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
          {tiers.map((t, idx) => {
            const styles = accentStyles[t.accent];
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={`group relative rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in ${styles.card} ${t.highlight ? "lg:scale-[1.03]" : ""}`}
              >
                {t.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap ${
                    t.accent === "premium"
                      ? "bg-gradient-to-r from-gold to-gold-bright text-primary-foreground shadow-gold"
                      : "bg-gold text-primary-foreground shadow-gold"
                  }`}>
                    {t.highlight ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {t.badge}
                  </div>
                )}

                <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 ${styles.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="font-display text-2xl font-bold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-5 min-h-[2.5rem]">{t.desc}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`font-display text-4xl font-bold ${styles.price}`}>{t.price}</span>
                  {t.period && <span className="text-muted-foreground text-sm">{t.period}</span>}
                </div>

                <Button
                  onClick={() => handleCta(t.name)}
                  className={`w-full h-11 transition-all ${styles.cta}`}
                >
                  {t.cta}
                </Button>

                <div className="h-px bg-border my-6" />

                <ul className="space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${
                        t.accent === "gold" || t.accent === "premium" ? "bg-gold/20" : "bg-secondary"
                      }`}>
                        <Check className={`h-3 w-3 ${
                          t.accent === "gold" || t.accent === "premium" ? "text-gold" : "text-foreground/70"
                        }`} strokeWidth={3} />
                      </div>
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="container mx-auto px-6 max-w-3xl text-center mt-16">
          <p className="text-sm text-muted-foreground">
            All plans billed in INR. GST included where applicable. Need something custom?{" "}
            <a href="mailto:hello@bhramar.ai" className="text-gold hover:underline">
              Talk to us
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
