import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BhramarLogo } from "@/components/BhramarLogo";
import { toast } from "sonner";
import { ArrowRight, Scale, Users, User, Building2, Copy, Sparkles, MessageSquare, LayoutDashboard, BadgeCheck } from "lucide-react";

type UserType = "citizen" | "advocate" | "firm_member";

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const COURTS = ["Supreme Court","High Court","District Court","Sessions Court","Magistrate Court","Tribunal","Consumer Forum","Family Court"];
const SPECS = ["Criminal","Civil","Family","Corporate","Tax","Constitutional","Labour","IP","Cyber","Property","Banking","Consumer"];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [userType, setUserType] = useState<UserType | null>(null);
  const [enrollment, setEnrollment] = useState("");
  const [barCouncil, setBarCouncil] = useState("");
  const [state, setState] = useState("");
  const [court, setCourt] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [advocateId, setAdvocateId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
      if (data?.onboarding_completed) navigate("/dashboard", { replace: true });
    })();
  }, [user, navigate]);

  const skip = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    navigate("/dashboard", { replace: true });
  };

  const finish = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    toast.success("You're all set!");
    navigate("/dashboard", { replace: true });
  };

  const submitStep1 = async () => {
    if (!userType || !user) return;
    setSaving(true);
    await supabase.from("profiles").update({ user_type: userType }).eq("id", user.id);
    setSaving(false);
    if (userType === "citizen") {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const submitStep2 = async () => {
    if (!user) return;
    if (!enrollment.trim() || !state || !court) {
      toast.error("Please fill enrollment number, state and court");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        enrollment_number: enrollment.trim(),
        bar_council: barCouncil.trim() || null,
        state,
        court_of_practice: court,
        specializations: specs,
      })
      .eq("id", user.id)
      .select("advocate_id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdvocateId(data?.advocate_id ?? null);
    setStep(3);
  };

  const copyId = () => {
    if (!advocateId) return;
    navigator.clipboard.writeText(advocateId);
    toast.success("Advocate ID copied");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <BhramarLogo />
          <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground">Skip for now</button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-2xl">
        <div className="flex items-center gap-2 mb-8 text-xs text-muted-foreground">
          <span className={step >= 1 ? "text-gold font-semibold" : ""}>1. About you</span>
          <span>›</span>
          <span className={step >= 2 ? "text-gold font-semibold" : ""}>2. Your details</span>
          <span>›</span>
          <span className={step >= 3 ? "text-gold font-semibold" : ""}>3. Quick tour</span>
        </div>

        {step === 1 && (
          <Card className="p-8">
            <h1 className="font-display text-3xl font-bold mb-2">Tell us about yourself</h1>
            <p className="text-muted-foreground mb-6">This helps us personalize bhramar.ai for you.</p>
            <div className="grid gap-3">
              {[
                { v: "citizen" as UserType, icon: User, title: "Citizen", desc: "I need legal help or guidance" },
                { v: "advocate" as UserType, icon: Scale, title: "Advocate", desc: "I am a practicing advocate" },
                { v: "firm_member" as UserType, icon: Building2, title: "Law Firm", desc: "I represent a law firm" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setUserType(o.v)}
                  className={`flex items-start gap-4 p-4 rounded-lg border text-left transition ${
                    userType === o.v ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"
                  }`}
                >
                  <o.icon className="h-6 w-6 text-gold mt-0.5" />
                  <div>
                    <div className="font-semibold">{o.title}</div>
                    <div className="text-sm text-muted-foreground">{o.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={submitStep1} disabled={!userType || saving} className="mt-6 w-full">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8">
            <h1 className="font-display text-3xl font-bold mb-2">Your professional details</h1>
            <p className="text-muted-foreground mb-6">We'll generate your unique Advocate ID.</p>
            <div className="grid gap-4">
              <div>
                <Label>Bar Council enrollment number *</Label>
                <Input value={enrollment} onChange={(e) => setEnrollment(e.target.value)} placeholder="e.g. KAR/1234/2018" />
              </div>
              <div>
                <Label>Bar Council</Label>
                <Input value={barCouncil} onChange={(e) => setBarCouncil(e.target.value)} placeholder="e.g. Karnataka State Bar Council" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>State *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Court of practice *</Label>
                  <Select value={court} onValueChange={setCourt}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Specializations</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SPECS.map((s) => {
                    const checked = specs.includes(s);
                    return (
                      <label key={s} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm ${checked ? "border-gold bg-gold/5" : "border-border"}`}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => setSpecs(v ? [...specs, s] : specs.filter(x => x !== s))}
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={submitStep2} disabled={saving} className="flex-1">
                Generate my Advocate ID <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {advocateId && (
              <Card className="p-8 border-gold/40 bg-gradient-to-br from-gold/10 to-transparent">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-8 w-8 text-gold mt-1" />
                  <div className="flex-1">
                    <h2 className="font-display text-2xl font-bold mb-1">Welcome to bhramar.ai</h2>
                    <p className="text-muted-foreground mb-4">Your Advocate ID is</p>
                    <div className="flex items-center gap-3 mb-3">
                      <code className="px-4 py-2 bg-background border border-gold/40 rounded-md font-mono text-lg font-semibold text-gold">
                        {advocateId}
                      </code>
                      <Button variant="ghost" size="sm" onClick={copyId}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Save this — other advocates will use it to find and team up with you.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-8">
              <h2 className="font-display text-2xl font-bold mb-4">Quick tour</h2>
              <div className="grid gap-4">
                <Tour icon={LayoutDashboard} title="Your dashboard" desc="Track hearings, tasks, billed amounts and AI-detected case risks all in one place." />
                <Tour icon={Sparkles} title="Personalized AI" desc="bhramar.ai knows your role, cases and clients — answers are tailored to you." />
                <Tour icon={MessageSquare} title="Ask anything" desc="From BNS sections to limitation periods — get clear, citation-backed answers." />
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={finish} variant="outline" className="flex-1">Go to dashboard</Button>
                <Button onClick={() => { finish(); setTimeout(() => navigate("/app"), 0); }} className="flex-1">
                  Ask your first legal question <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Tour({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
      <Icon className="h-5 w-5 text-gold mt-0.5" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
