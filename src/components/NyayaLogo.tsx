import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export function BhramarLogo({ className, showText = true, size = "md" }: { className?: string; showText?: boolean; size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="rounded-md bg-gold/15 border border-gold/40 p-1.5">
        <Scale className={cn(iconSize, "text-gold")} />
      </div>
      {showText && (
        <span className={cn("font-display font-bold tracking-tight text-foreground", textSize)}>
          Bhramar<span className="text-gold">AI</span>
        </span>
      )}
    </div>
  );
}