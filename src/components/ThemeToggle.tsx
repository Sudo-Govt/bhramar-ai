import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("h-9 w-9 rounded-full glass-subtle hover:bg-primary/10", className)}
    >
      {theme === "dark"
        ? <Sun className="h-4 w-4 text-primary" />
        : <Moon className="h-4 w-4 text-primary" />}
    </Button>
  );
}
