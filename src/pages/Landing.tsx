import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BhramarLogo } from "@/components/BhramarLogo";
import { Zap, FileSearch, PenLine, Sparkles, ArrowRight, Quote } from "lucide-react";

const features = [
  { icon: Zap, title: "Lightning Fast Research", desc: "Cite IPC, CrPC and landmark judgements in seconds, not hours." },
  { icon: FileSearch, title: "Smart Document Analysis", desc: "Upload case files and get instant summaries, risks and gaps." },
  { icon: PenLine, title: "Drafted in Seconds", desc: "Bail applications, legal notices, replies — drafted to your facts." },
];

const testimonials = [
  { name: "Adv. Kavita Iyer", firm: "Bombay High Court", quote: "Bhramar.ai has cut my research time by 70%. The citation accuracy is remarkable." },
  { name: "Adv. Arjun Malhotra", firm: "Delhi District Courts", quote: "It's like having a senior junior who has read every reported judgement." },
  { name: "Adv. Sneha Reddy", firm: "Hyderabad", quote: "The drafting workflows alone justify the subscription. Truly built for Indian advocates." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <BhramarLogo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Advocates</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" className="text-foreground hover:text-gold">Log in</Button></Link>
            <Link to="/auth"><Button className="bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-hero overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_30%_20%,hsl(var(--gold)/0.4),transparent_45%)]" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs text-gold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> AI co-pilot for Indian advocates
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] text-balance mb-6">
            The AI co-pilot for every <span className="text-gold">Indian advocate</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
            Research faster. Draft smarter. Win more. Bhramar.ai brings the entire Indian legal corpus to your fingertips.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold h-12 px-7 text-base">
                Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-gold/60 text-foreground hover:bg-gold/10 hover:text-gold h-12 px-7 text-base">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Built for the Indian courtroom</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Everything an advocate needs, in a single calm interface.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border bg-card p-8 shadow-card hover:border-gold/50 transition-colors">
                <div className="rounded-lg bg-gold/10 border border-gold/30 p-3 w-fit mb-5 group-hover:bg-gold/20 transition-colors">
                  <f.icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-navy-deep border-y border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Trusted by advocates</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">A new standard for legal practice</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl bg-card border border-border p-7">
                <Quote className="h-5 w-5 text-gold mb-4" />
                <p className="text-foreground/90 text-[15px] leading-relaxed mb-5">{t.quote}</p>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-muted-foreground">{t.firm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-5">Ready to practise smarter?</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of advocates already winning with Bhramar.ai.</p>
          <Link to="/auth">
            <Button size="lg" className="bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold h-12 px-8">
              Start Free <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <BhramarLogo size="sm" />
          <div>© {new Date().getFullYear()} Bhramar.ai. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}