import { cn } from "@/lib/utils";
import logoImg from "@/assets/bhramar-logo.png";

export function BhramarLogo({ className, showText = true, size = "md" }: { className?: string; showText?: boolean; size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src={logoImg} alt="Bhramar.ai" className={cn(iconSize, "object-contain shrink-0")} />
      {showText && (
        <span className={cn("font-display font-bold tracking-tight text-foreground", textSize)}>
          Bhramar<span className="text-gold">.ai</span>
        </span>
      )}
    </div>
  );
}