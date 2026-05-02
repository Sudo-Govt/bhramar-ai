import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@/assets/bhramar-logo.png";

export default function Landing() {
  const { user } = useAuth();
  const dest = user ? "/app" : "/auth";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <Link
        to={dest}
        className="group flex flex-col items-center gap-4 transition-transform hover:scale-[1.02]"
        aria-label="Enter Bhramar.ai"
      >
        <img
          src={logoImg}
          alt="Bhramar.ai — AI legal assistant for Indian advocates"
          className="h-24 w-24 md:h-28 md:w-28 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.25)]"
        />
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Bhramar<span className="text-gold">.ai</span>
        </h1>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 group-hover:text-gold transition-colors">
          Tap to enter
        </div>
      </Link>

      <footer className="absolute bottom-4 left-0 right-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground/60">
        <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
        <Link to="/terms" className="hover:text-foreground">Terms</Link>
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        <Link to="/refund" className="hover:text-foreground">Refund</Link>
        <Link to="/contact" className="hover:text-foreground">Contact</Link>
        <span className="hidden sm:inline">© {new Date().getFullYear()} Bhramar.ai</span>
      </footer>
    </div>
  );
}
