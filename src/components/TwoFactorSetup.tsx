import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Factor = { id: string; friendly_name?: string | null; status: string };

export function TwoFactorSetup() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors([...(data.totp || [])] as Factor[]);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    setBusy(false);
    if (error || !data) { toast.error(error?.message || "Could not start enrollment"); return; }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    if (!enrolling) return;
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (chErr || !ch) { setBusy(false); toast.error(chErr?.message || "Challenge failed"); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrolling.id, challengeId: ch.id, code });
    setBusy(false);
    if (vErr) { toast.error(vErr.message); return; }
    toast.success("Two-factor authentication enabled");
    setEnrolling(null);
    setCode("");
    await refresh();
  };

  const removeFactor = async (id: string) => {
    if (!confirm("Disable two-factor authentication?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Two-factor disabled");
    await refresh();
  };

  const verified = factors.filter((f) => f.status === "verified");
  const hasMfa = verified.length > 0;

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        {hasMfa ? <ShieldCheck className="h-5 w-5 text-gold mt-0.5" /> : <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />}
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold">Two-factor authentication</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add a second layer of protection using an authenticator app (Google Authenticator, Authy, 1Password).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : enrolling ? (
        <div className="space-y-4">
          <div className="text-sm">Scan this QR code in your authenticator app, then enter the 6-digit code below.</div>
          <div className="flex flex-col items-center gap-3">
            <img src={enrolling.qr} alt="2FA QR" className="h-44 w-44 rounded-lg border border-border bg-white p-2" />
            <code className="text-xs text-muted-foreground break-all">Manual key: {enrolling.secret}</code>
          </div>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" />
            <Button onClick={verifyEnroll} disabled={busy || code.length !== 6} className="bg-gold hover:bg-gold-bright text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
          <Button variant="ghost" onClick={() => { setEnrolling(null); setCode(""); }}>Cancel</Button>
        </div>
      ) : hasMfa ? (
        <div className="space-y-3">
          <div className="text-sm text-gold">✓ Two-factor authentication is enabled.</div>
          {verified.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="text-sm">{f.friendly_name || "Authenticator app"}</div>
              <Button variant="outline" size="sm" onClick={() => removeFactor(f.id)} disabled={busy}>Remove</Button>
            </div>
          ))}
        </div>
      ) : (
        <Button onClick={startEnroll} disabled={busy} className="bg-gold hover:bg-gold-bright text-primary-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable 2FA"}
        </Button>
      )}
    </Card>
  );
}
