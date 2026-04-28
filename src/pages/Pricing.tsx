import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Check, ArrowLeft, Crown } from "lucide-react";

const tiers = [
  {
    name: "Free Chat",
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
    highlight: false,
  },
  {
    name: "Advocate",
    price: "₹499",
    period: "/ month",
    desc: "For solo practitioners",
    features: [
      "Unlimited messages",
      "Up to 200 cases",
      "Auto case summaries",
      "Date & hearing reminders",
      "Personal AI assistant",
      "5 GB document storage",
    ],
    cta: "Upgrade to Advocate",
    highlight: true,
  },
  {
    name: "Firm",
    price: "₹3,900",
    period: "/ month",
    desc: "For chambers (up to 10 users)",
    features: [
      "Everything in Advocate",
      "Shared workspace",
      "Internal case & file sharing",
      "Invite advocates, chat & discuss",
      "AI accuracy up to 99.9%",
      "Personal AI for each member",
      "Centralized AI for cross-case insights",
    ],
    cta: "Start Firm Plan",
    highlight: false,
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

      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Pricing built for Indian advocates</h1>
          <p className="text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-7 ${t.highlight ? "border-gold bg-card shadow-gold scale-[1.02]" : "border-border bg-card"}`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Most popular
                </div>
              )}
              <h3 className="font-display text-2xl font-bold mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 min-h-[2.5rem]">{t.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-3xl font-bold">{t.price}</span>
                {t.period && <span className="text-muted-foreground text-sm">{t.period}</span>}
              </div>
              <Link to={t.name === "Enterprise" ? "/auth" : "/auth"} className="block">
                <Button className={`w-full h-11 ${t.highlight ? "bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold" : "bg-secondary hover:bg-secondary/80 text-foreground"}`}>
                  {t.cta}
                </Button>
              </Link>
              <ul className="space-y-2.5 mt-7">
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
