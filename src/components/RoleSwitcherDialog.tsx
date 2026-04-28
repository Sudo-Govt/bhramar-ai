import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffectiveTier, Tier } from "@/hooks/useEffectiveTier";
import { Crown, User, Building2 } from "lucide-react";

const OPTIONS: { tier: Tier; title: string; desc: string; icon: any }[] = [
  { tier: "Free", title: "Free Chat", desc: "5 messages/day, chat history only", icon: User },
  { tier: "Pro", title: "Advocate", desc: "Cases, payments, evidence analysis", icon: Crown },
  { tier: "Firm", title: "Firm", desc: "Shared workspace, cross-case AI", icon: Building2 },
];

export function RoleSwitcherDialog() {
  const { isDevAccount, pickerOpen, setPickerOpen, setDevTier, effectiveTier } = useEffectiveTier();
  if (!isDevAccount) return null;
  return (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="glass-strong border-gold/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gradient-aurora">Choose dashboard view</DialogTitle>
          <DialogDescription>
            Dev override for <span className="text-gold">bhramar123@gmail.com</span>. Switch any time from your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-2">
          {OPTIONS.map(({ tier, title, desc, icon: Icon }) => (
            <button
              key={tier}
              onClick={() => setDevTier(tier)}
              className={`text-left p-4 rounded-2xl glass border transition-all hover:scale-[1.01] ${
                effectiveTier === tier ? "border-gold/60 shadow-gold" : "border-border/60 hover:border-gold/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-aurora flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{title}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                {effectiveTier === tier && <span className="text-xs text-gold font-bold">CURRENT</span>}
              </div>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="mt-2" onClick={() => setPickerOpen(false)}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}