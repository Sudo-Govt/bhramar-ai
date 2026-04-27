import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Check, ArrowLeft, Crown } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "Try Bhramar.ai for everyday research",
    features: ["10 queries per day", "Basic IPC & CrPC research", "1 active case", "Email support"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹1,999",
    period: "/ month",
    desc: "For solo practitioners",
    features: ["Unlimited AI queries", "Document upload & analysis", "Unlimited case folders", "Source citations & exports", "Priority response times"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Firm",
    price: "₹9,999",
    period: "/ month",
    desc: "For chambers & firms",
    features: ["Everything in Pro", "Up to 10 user seats", "Custom branding", "Dedicated success manager", "SOC 2 & data residency"],
    cta: "Talk to us",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/"><BhramarLogo /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
      </header>

      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg">Pick the plan that fits your practice. Switch or cancel anytime.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-6 max-w-6xl">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-8 ${t.highlight ? "border-gold bg-card shadow-gold scale-[1.02]" : "border-border bg-card"}`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Most popular
                </div>
              )}
              <h3 className="font-display text-2xl font-bold mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-muted-foreground text-sm">{t.period}</span>
              </div>
              <Link to="/auth" className="block">
                <Button className={`w-full h-11 ${t.highlight ? "bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold" : "bg-secondary hover:bg-secondary/80 text-foreground"}`}>
                  {t.cta}
                </Button>
              </Link>
              <ul className="space-y-3 mt-7">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}