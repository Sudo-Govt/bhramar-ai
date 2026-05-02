import { Link } from "react-router-dom";
import logo from "@/assets/bhramar-logo.png";

interface Props {
  title: string;
  updated: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, updated, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Bhramar" className="h-8 w-8" />
            <span className="font-semibold">Bhramar.ai</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/refund" className="hover:text-foreground">Refund</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {updated}</p>
        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-foreground/90 leading-relaxed">
          {children}
        </article>
      </main>
      <footer className="border-t mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Bhramar.ai · Made in India
        </div>
      </footer>
    </div>
  );
}
