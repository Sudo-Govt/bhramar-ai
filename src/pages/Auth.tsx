import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BhramarLogo } from "@/components/BhramarLogo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState<{ factorId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (!user) return;
    // Don't auto-redirect if a 2FA challenge is pending
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel === "aal1" && data?.nextLevel === "aal2") {
        const { data: list } = await supabase.auth.mfa.listFactors();
        const factor = list?.totp?.find((f) => f.status === "verified");
        if (factor) { setMfaStep({ factorId: factor.id }); return; }
      }
      navigate("/app", { replace: true });
    })();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to Bhramar.ai.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaStep) return;
    setLoading(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaStep.factorId });
      if (chErr || !ch) throw chErr || new Error("Challenge failed");
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaStep.factorId,
        challengeId: ch.id,
        code: mfaCode,
      });
      if (vErr) throw vErr;
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/app` });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><BhramarLogo size="lg" /></Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          {mfaStep ? (
            <>
              <h1 className="font-display text-2xl font-bold text-center mb-1">Two-factor verification</h1>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter the 6-digit code from your authenticator app.
              </p>
              <form onSubmit={verifyMfa} className="space-y-4">
                <Input
                  autoFocus
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="text-center tracking-[0.4em] text-lg"
                />
                <Button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); setMfaStep(null); setMfaCode(""); }}>
                  Cancel and sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-center mb-1">Welcome back</h1>
              <p className="text-sm text-muted-foreground text-center mb-6">The AI co-pilot for Indian advocates</p>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full bg-secondary mb-6">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adv. Your Name" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@chambers.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold-bright text-primary-foreground shadow-gold h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tab === "signup" ? "Create account" : "Log in"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
              </div>

              <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading} className="w-full h-11 border-border hover:bg-secondary">
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.6 29.2 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.2 0-9.7-3.5-11.3-8.4l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
                Continue with Google
              </Button>
            </TabsContent>
          </Tabs>
            </>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to our terms.
        </p>
      </div>
    </div>
  );
}