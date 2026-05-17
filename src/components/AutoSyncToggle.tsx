import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

const AUTO_SYNC_KEY = "bhramar.autoSync";

export function AutoSyncToggle() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_SYNC_KEY) !== "false";
  });

  useEffect(() => {
    localStorage.setItem(AUTO_SYNC_KEY, enabled.toString());
  }, [enabled]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <Label htmlFor="auto-sync" className="text-xs text-gold cursor-pointer font-medium">
            Auto Sync
          </Label>
          <Switch
            id="auto-sync"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-gold h-4 w-7"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="max-w-xs text-xs">
          When ON: Bhramar automatically creates cases, extracts client details, 
          financial mentions, and deadlines from your conversations.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
