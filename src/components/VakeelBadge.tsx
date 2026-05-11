import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  score?: number | null;
  reviewsCount?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VakeelBadge({ score, reviewsCount, size = "md", className }: Props) {
  const value = Number(score ?? 0);
  const showNew = value === 0;
  const sz = size === "sm" ? "text-xs px-1.5 py-0.5" : size === "lg" ? "text-sm px-2.5 py-1" : "text-xs px-2 py-0.5";
  const iconSize = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 text-gold font-medium",
        sz,
        className
      )}
      title={
        showNew
          ? "New advocate — no reviews yet"
          : `Vakeel Score ${value.toFixed(1)}${reviewsCount ? ` · ${reviewsCount} reviews` : ""}`
      }
    >
      <Star className={cn(iconSize, "fill-gold")} />
      {showNew ? "New" : value.toFixed(1)}
      {reviewsCount ? <span className="opacity-70">({reviewsCount})</span> : null}
    </span>
  );
}

export default VakeelBadge;
