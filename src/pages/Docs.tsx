import { Link, useParams } from "react-router-dom";
import { BhramarLogo } from "@/components/BhramarLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Book, Rocket, Code2, Shield, Scale, Bot, ArrowRight, ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    slug: "getting-started",
    icon: Rocket,
    title: "Getting Started",
    desc: "Sign up, set up your court, and ask Bhramar your first question.",
  },
  {
    slug: "ask-bhramar",
    icon: Bot,
    title: "Ask Bhramar",
    desc: "How the assistant grounds answers in BNS, BNSS and BSA.",
  },
  {
    slug: "cases-and-darbar",
    icon: Scale,
    title: "Cases & Darbar",
    desc: "Run a virtual hearing with the Bench, Opposing and Advisor agents.",
  },
  {
    slug: "network",
    icon: Shield,
    title: "Network & Emergency",
    desc: "Browse cells, refer cases, and reach an advocate in under a minute.",
  },
  {
    slug: "developer",
    icon: Code2,
    title: "For developers",
    desc: "Edge functions, RAG corpus uploads and the admin console.",
  },
  {
    slug: "policies",
    icon: Book,
    title: "Policies",
    desc: "Terms, Privacy and Refund \u2014 in plain language.",
  },
];

function DocsHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/docs" className="flex items-center gap-3">
          <BhramarLogo />
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground border-l border-border pl-3">
            Docs
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/app">
            <Button variant="ghost" size="sm">Open app</Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function DocsHome() {
  return (
    <div className="min-h-screen bg-background">
      <DocsHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Bhramar.ai documentation
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Everything you need to run an Indian legal practice with Bhramar.
          </h1>
          <p className="text-muted-foreground text-lg">
            Guides, references, and operating playbooks for advocates, citizens
            and developers building on top of Bhramar.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map(({ slug, icon: Icon, title, desc }) => (
            <Link key={slug} to={`/docs/${slug}`}>
              <Card className="p-6 h-full hover:border-foreground/40 transition-colors group">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mb-4" />
                <h2 className="font-display text-lg font-semibold mb-1">{title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <span className="text-xs font-medium inline-flex items-center gap-1 text-foreground">
                  Read <ArrowRight className="h-3 w-3" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export function DocsArticle() {
  const { slug = "" } = useParams();
  const section = SECTIONS.find((s) => s.slug === slug);
  return (
    <div className="min-h-screen bg-background">
      <DocsHeader />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3 w-3" /> All docs
        </Link>
        <h1 className="font-display text-3xl font-bold mb-3">
          {section?.title ?? "Document not found"}
        </h1>
        <p className="text-muted-foreground mb-10">{section?.desc}</p>
        <div className="prose-legal">
          <p>
            This page is part of the Bhramar documentation. Detailed content is
            being migrated here from our launch handbook. In the meantime,
            launch the app to start using the feature directly.
          </p>
          <ul>
            <li>Open the app and sign in to your advocate or citizen account.</li>
            <li>Use the left sidebar to navigate Cases, Network and Darbar.</li>
            <li>For emergencies, tap the floating shield in the bottom right.</li>
          </ul>
        </div>
        <div className="mt-10">
          <Link to="/app">
            <Button>Open Bhramar <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default DocsHome;
