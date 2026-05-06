import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATE_NAMES } from "@/lib/indiaLocations";
import {
  User, Scale, Building2, ArrowRight, ArrowLeft,
  Copy, BadgeCheck, Sparkles, MessageSquare, LayoutDashboard,
  CheckCircle2, Loader2,
} from "lucide-react";
import logoImg from "@/assets/bhramar-logo.png";

// ─── constants ───────────────────────────────────────────────────────────────

type UserType = "citizen" | "advocate" | "firm_member";

const COURTS = [
  "Supreme Court of India",
  "Allahabad High Court", "Bombay High Court", "Calcutta High Court",
  "Delhi High Court", "Gujarat High Court", "Karnataka High Court",
  "Kerala High Court", "Madras High Court", "Rajasthan High Court",
  "Patna High Court", "Punjab & Haryana High Court", "Gauhati High Court",
  "Andhra Pradesh High Court", "Telangana High Court", "Chhattisgarh High Court",
  "Himachal Pradesh High Court", "Jharkhand High Court", "Madhya Pradesh High Court",
  "Orissa High Court", "Uttarakhand High Court", "Jammu & Kashmir High Court",
  "Manipur High Court", "Meghalaya High Court", "Tripura High Court",
  "Sessions Court", "District Court", "Magistrate Court",
  "Consumer Forum / Commission", "Family Court", "Labour / Industrial Tribunal",
  "Debt Recovery Tribunal", "NCLT / NCLAT",
];

const SPECS = [
  "Criminal", "Civil", "Family & Matrimonial", "Property & Land",
  "Corporate & Commercial", "Tax", "Constitutional", "Labour & Employment",
  "Intellectual Property", "Cyber & Technology", "Banking & Finance",
  "Consumer", "Environment", "Human Rights", "Immigration",
];

// ─── progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div
            className={cn(
              "h-2 flex-1 rounded-full transition-all duration-500",
              i < step ? "bg-gradient-aurora" : "bg-border/50"
            )}
          />
        </div>
      ))}
      <span className="text-xs text-muted-foreground shrink-0">
        {step}/{total}
      </span>
    </div>
  );
}

// ─── user-type card ───────────────────────────────────────────────────────────

function TypeCard({
  selected, onClick, icon: Icon, title, desc, accent,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group",
        "hover:scale-[1.01] hover:shadow-lg",
        selected
          ? "border-gold/70 bg-gold/8 shadow-gold"
          : "border-border/60 bg-card/40 hover:border-gold/30 hover:bg-card/60"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
            selected ? "bg-gradient-aurora shadow-gold" : "bg-muted group-hover:bg-muted/80"
          )}
        >
          <Icon className={cn("h-5 w-5", selected ? "text-primary-foreground" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("font-semibold text-base mb-0.5", selected ? "text-gold" : "text-foreground")}>
            {title}
          </div>
          <div className="text-sm text-muted-foreground leading-snug">{desc}</div>
        </div>
        {selected && (
          <CheckCircle2 className="h-5 w-5 text-gold shrink-0 mt-0.5" />
        )}
      </div>
    </button>
  );
}

// ─── spec chip ────────────────────────────────────────────────────────────────

function SpecChip({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
        checked
          ? "bg-gold/15 border-gold/50 text-gold"
          : "bg-card/40 border-border/60 text-muted-foreground hover:border-gold/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ─── tour item ────────────────────────────────────────────────────────────────

function TourItem({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl glass-subtle border border-border/50">
      <div className="h-9 w-9 rounded-lg bg-gradient-aurora flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // step 1
  const [userType, setUserType] = useState<UserType | null>(null);

  // step 2 — advocate / firm
  const [enrollment, setEnrollment] = useState("");
  const [barCouncil, setBarCouncil] = useState("");
  const [state, setState] = useState("");
  const [court, setCourt] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [firmName, setFirmName] = useState("");

  // step 3
  const [advocateId, setAdvocateId] = useState<string | null>(null);

  const totalSteps = userType === "citizen" ? 2 : 3;

  const saveProfile = async (values: Record<string, unknown>) => {
    if (!user) throw new Error("You must be logged in to continue");
    return supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
        ...values,
      } as any, { onConflict: "id" })
      .select("advocate_id,onboarding_completed")
      .maybeSingle();
  };

  // Redirect if already onboarded
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.onboarding_completed) navigate("/app", { replace: true });
    })();
  }, [user, navigate]);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const doSkip = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await saveProfile({ onboarding_completed: true });
    setSaving(false);
    if (error) { toast.error("Could not save — please try again"); return; }
    window.dispatchEvent(new Event("bhramar:onboarding-complete"));
    navigate("/app", { replace: true });
  };

  const submitStep1 = async () => {
    if (!userType || !user) return;
    setSaving(true);
    const { error } = await saveProfile({ user_type: userType });
    setSaving(false);
    if (error) { toast.error("Could not save — please try again"); return; }
    if (userType === "citizen") {
      setStep(2); // goes straight to tour (step 2 of 2)
    } else {
      setStep(2); // advocate/firm goes to details (step 2 of 3)
    }
  };

  const submitStep2Advocate = async () => {
    if (!user) return;
    if (!enrollment.trim() || !state || !court) {
      toast.error("Enrollment number, state and court are required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      enrollment_number: enrollment.trim(),
      bar_council: barCouncil.trim() || null,
      state,
      court_of_practice: court,
      specializations: specs,
    };
    if (userType === "firm_member" && firmName.trim()) {
      payload.firm_name = firmName.trim();
    }
    const { data: saved, error } = await saveProfile(payload);
    if (error) { setSaving(false); toast.error(error.message); return; }
    setSaving(false);
    setAdvocateId(saved?.advocate_id ?? null);
    setStep(3);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await saveProfile({ onboarding_completed: true });
    setSaving(false);
    if (error) { toast.error("Could not save — please try again"); return; }
    toast.success("Welcome to Bhramar.ai! 🎉");
    window.dispatchEvent(new Event("bhramar:onboarding-complete"));
    navigate("/app", { replace: true });
  };

  const copyId = () => {
    if (!advocateId) return;
    navigator.clipboard.writeText(advocateId);
    toast.success("Advocate ID copied!");
  };

  const toggleSpec = (s: string) =>
    setSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background aurora-bg flex flex-col">

      {/* header */}
      <header className="glass-strong border-b border-white/10 shrink-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Bhramar.ai" className="h-7 w-7 object-contain" />
            <span className="font-display font-bold text-lg text-foreground">
              Bhramar<span className="text-gold">.ai</span>
            </span>
          </div>
          <button
            onClick={doSkip}
            disabled={saving}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* body */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="relative z-10 w-full max-w-xl">
          <ProgressBar step={step} total={totalSteps} />

          {/* ── STEP 1: Who are you? ── */}
          {step === 1 && (
            <div className="glass rounded-3xl p-8 space-y-6 animate-fade-in">
              <div className="text-center mb-2">
                <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-aurora items-center justify-center mb-4 shadow-gold">
                  <Sparkles className="h-7 w-7 text-primary-foreground" />
                </div>
                <h1 className="font-display text-3xl font-bold">
                  Welcome to Bhramar<span className="text-gold">.ai</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Tell us who you are so we can personalise your experience.
                </p>
              </div>

              <div className="space-y-3">
                <TypeCard
                  selected={userType === "citizen"}
                  onClick={() => setUserType("citizen")}
                  icon={User}
                  title="Citizen"
                  desc="I need legal help, guidance, or want to understand my rights"
                  accent="blue"
                />
                <TypeCard
                  selected={userType === "advocate"}
                  onClick={() => setUserType("advocate")}
                  icon={Scale}
                  title="Advocate"
                  desc="I am a practicing advocate registered with a Bar Council"
                  accent="gold"
                />
                <TypeCard
                  selected={userType === "firm_member"}
                  onClick={() => setUserType("firm_member")}
                  icon={Building2}
                  title="Law Firm Member"
                  desc="I work at a law firm — as a partner, associate, or counsel"
                  accent="purple"
                />
              </div>

              <Button
                onClick={submitStep1}
                disabled={!userType || saving}
                className="w-full h-12 bg-gradient-aurora text-primary-foreground shadow-gold text-base font-semibold rounded-xl"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          )}

          {/* ── STEP 2a: Citizen tour ── */}
          {step === 2 && userType === "citizen" && (
            <div className="glass rounded-3xl p-8 space-y-6 animate-fade-in">
              <div className="text-center mb-2">
                <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-aurora items-center justify-center mb-4 shadow-gold">
                  <Sparkles className="h-7 w-7 text-primary-foreground" />
                </div>
                <h1 className="font-display text-2xl font-bold">You're all set!</h1>
                <p className="text-muted-foreground mt-2">
                  Here's what you can do with Bhramar.ai
                </p>
              </div>

              <div className="space-y-3">
                <TourItem
                  icon={MessageSquare}
                  title="Ask any legal question"
                  desc="Get clear, plain-language answers about Indian law — IPC, family, property, labour, consumer rights and more."
                />
                <TourItem
                  icon={Scale}
                  title="Understand your rights"
                  desc="Know exactly what the law says, which court to approach, and what to bring."
                />
                <TourItem
                  icon={LayoutDashboard}
                  title="Track your queries"
                  desc="Every conversation is saved so you can pick up where you left off."
                />
              </div>

              <Button
                onClick={finish}
                disabled={saving}
                className="w-full h-12 bg-gradient-aurora text-primary-foreground shadow-gold text-base font-semibold rounded-xl"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
                  : <>Start using Bhramar.ai <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          )}

          {/* ── STEP 2b: Advocate / Firm details ── */}
          {step === 2 && (userType === "advocate" || userType === "firm_member") && (
            <div className="glass rounded-3xl p-8 space-y-6 animate-fade-in">
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <h1 className="font-display text-2xl font-bold">Your professional details</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  This helps Bhramar give you court-specific, jurisdiction-aware answers.
                </p>
              </div>

              <div className="space-y-4">
                {/* enrollment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Enrollment number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="mt-1.5 glass-subtle border-border/60"
                      placeholder="e.g. KAR/1234/2018"
                      value={enrollment}
                      onChange={e => setEnrollment(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bar Council</Label>
                    <Input
                      className="mt-1.5 glass-subtle border-border/60"
                      placeholder="e.g. Karnataka State"
                      value={barCouncil}
                      onChange={e => setBarCouncil(e.target.value)}
                    />
                  </div>
                </div>

                {/* state + court */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger className="mt-1.5 glass-subtle border-border/60">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {STATE_NAMES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Court of practice <span className="text-destructive">*</span>
                    </Label>
                    <Select value={court} onValueChange={setCourt}>
                      <SelectTrigger className="mt-1.5 glass-subtle border-border/60">
                        <SelectValue placeholder="Select court" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* firm name (firm_member only) */}
                {userType === "firm_member" && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Firm name</Label>
                    <Input
                      className="mt-1.5 glass-subtle border-border/60"
                      placeholder="e.g. Menon & Associates"
                      value={firmName}
                      onChange={e => setFirmName(e.target.value)}
                    />
                  </div>
                )}

                {/* specializations */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    Specializations <span className="text-muted-foreground/60 normal-case">(optional)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECS.map(s => (
                      <SpecChip
                        key={s}
                        label={s}
                        checked={specs.includes(s)}
                        onToggle={() => toggleSpec(s)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={submitStep2Advocate}
                disabled={saving || !enrollment.trim() || !state || !court}
                className="w-full h-12 bg-gradient-aurora text-primary-foreground shadow-gold text-base font-semibold rounded-xl"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating your ID…</>
                  : <>Generate my Advocate ID <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          )}

          {/* ── STEP 3: Advocate ID reveal + tour ── */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* ID card */}
              {advocateId && (
                <div className="glass rounded-3xl p-6 border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-aurora flex items-center justify-center shadow-gold shrink-0">
                      <BadgeCheck className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-xl font-bold mb-1">Your Advocate ID</h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        Share this with colleagues to connect on Team Up.
                      </p>
                      <div className="flex items-center gap-3">
                        <code className="font-display text-2xl font-bold text-gold tracking-wider">
                          {advocateId}
                        </code>
                        <button
                          onClick={copyId}
                          className="p-2 rounded-lg glass-subtle border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                          title="Copy ID"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* tour */}
              <div className="glass rounded-3xl p-8 space-y-4">
                <h2 className="font-display text-xl font-bold">What's waiting for you</h2>

                <div className="space-y-3">
                  <TourItem
                    icon={LayoutDashboard}
                    title="Personalised dashboard"
                    desc="Track hearings, tasks, case payments, and AI-detected risks — all in one place."
                  />
                  <TourItem
                    icon={Sparkles}
                    title="AI that knows your cases"
                    desc="Bhramar learns your clients, cases and jurisdiction. Every answer is tailored to you."
                  />
                  <TourItem
                    icon={MessageSquare}
                    title="Ask anything, in any language"
                    desc="From BNS sections to limitation periods — get citation-backed answers in English or Hindi."
                  />
                  <TourItem
                    icon={Scale}
                    title="Draft in seconds"
                    desc="Bail applications, legal notices, vakalatnamas — drafted and formatted for court."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 h-11 border-border/60 text-muted-foreground hover:text-foreground"
                    disabled={saving}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={finish}
                    disabled={saving}
                    className="flex-2 h-11 flex-1 bg-gradient-aurora text-primary-foreground shadow-gold font-semibold rounded-xl"
                  >
                    {saving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening Bhramar…</>
                      : <>Open Bhramar.ai <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}