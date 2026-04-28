import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@/assets/bhramar-logo.png";

export default function Landing() {
  const { user } = useAuth();
  const dest = user ? "/app" : "/auth";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Link
        to={dest}
        className="group flex flex-col items-center gap-4 transition-transform hover:scale-[1.02]"
        aria-label="Enter Bhramar.ai"
      >
        <img
          src={logoImg}
          alt="Bhramar.ai"
          className="h-24 w-24 md:h-28 md:w-28 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.25)]"
        />
        <div className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Bhramar<span className="text-gold">.ai</span>
        </div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 group-hover:text-gold transition-colors">
          Tap to enter
        </div>
      </Link>
    </div>
  );
}
