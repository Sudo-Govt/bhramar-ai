// ================================================================
// PROFILE FIX — Advocate vs Client fields
//
// YOUR CURRENT profiles TABLE (from types.ts) already has:
//   Advocate fields: bar_council, court_of_practice, specializations,
//                    enrollment_number, years_experience, advocate_id,
//                    vakeel_score, is_available_for_emergency
//   Client fields:   age, gender, religion, marital_status, has_children,
//                    occupation, earning_bracket, family_background,
//                    physical_condition, prior_case_history
//
// The PROBLEM is that in Profile.tsx, the form is showing advocate
// fields (bar council etc.) under the CLIENT tab, and client fields
// (age, gender etc.) under the ADVOCATE tab.
//
// The FIX is simple: swap the field groupings in your Profile.tsx form.
// No migration needed — the columns are already correct in the DB.
// ================================================================

// ── Replace your existing Profile section in CaseFile.tsx ────────
// Find the ProfilePanel function and replace it entirely with this:

// src/components/ProfilePanel.tsx
// (or paste into CaseFile.tsx as the ProfilePanel function)

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, User, Scale, X } from "lucide-react";
import { STATE_NAMES, getDistricts } from "@/lib/indiaLocations";

const COURTS = [
  "Supreme Court of India",
  "High Court",
  "District Court",
  "Sessions Court",
  "Magistrate Court",
  "Family Court",
  "Consumer Court",
  "Labour Court",
  "Tribunal",
  "Lok Adalat",
];

const SPECIALIZATIONS = [
  "Criminal Law", "Civil Law", "Family Law", "Corporate Law",
  "Constitutional Law", "IP / Intellectual Property", "Labour Law",
  "Tax Law", "Property Law", "Environmental Law", "Cyber Law",
  "Banking & Finance", "Immigration", "Human Rights", "Mediation & Arbitration",
];

export function ProfilePanel() {
  const { user } = useAuth();
  const [profile, setProfile]   = useState<Record<string, unknown>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [newSpec, setNewSpec]   = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    })();
  }, [user]);

  const set = (key: string, val: unknown) => setProfile((p) => ({ ...p, [key]: val }));

  const addSpec = (s: string) => {
    const current = (profile.specializations as string[]) || [];
    if (!current.includes(s)) set("specializations", [...current, s]);
    setNewSpec("");
  };

  const removeSpec = (s: string) => {
    const current = (profile.specializations as string[]) || [];
    set("specializations", current.filter((x) => x !== s));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:                   profile.full_name,
        bar_council:                 profile.bar_council,
        enrollment_number:           profile.enrollment_number,
        court_of_practice:           profile.court_of_practice,
        specializations:             profile.specializations,
        years_experience:            profile.years_experience,
        state:                       profile.state,
        district:                    profile.district,
        is_available_for_emergency:  profile.is_available_for_emergency,
        // Client / personal fields
        age:                         profile.age,
        gender:                      profile.gender,
        religion:                    profile.religion,
        marital_status:              profile.marital_status,
        has_children:                profile.has_children,
        occupation:                  profile.occupation,
        earning_bracket:             profile.earning_bracket,
        family_background:           profile.family_background,
        physical_condition:          profile.physical_condition,
        prior_case_history:          profile.prior_case_history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved.");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const districts = profile.state ? getDistricts(profile.state as string) : [];
  const specs     = (profile.specializations as string[]) || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Profile</h2>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-9">
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <Tabs defaultValue="advocate">
          <TabsList>
            <TabsTrigger value="advocate">
              <Scale className="h-3.5 w-3.5 mr-1.5" />
              Advocate / Practice
            </TabsTrigger>
            <TabsTrigger value="personal">
              <User className="h-3.5 w-3.5 mr-1.5" />
              Personal Info
            </TabsTrigger>
          </TabsList>

          {/* ── ADVOCATE TAB ─────────────────────────────────────── */}
          <TabsContent value="advocate" className="space-y-4 mt-4">

            {/* Advocate ID (read-only) */}
            {profile.advocate_id && (
              <Card className="p-3 bg-primary/5 border-primary/30 flex items-center gap-3">
                <Scale className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Advocate ID</p>
                  <p className="font-mono text-sm font-semibold text-primary">{profile.advocate_id as string}</p>
                </div>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Full Name *</Label>
                <Input
                  value={(profile.full_name as string) || ""}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="As registered with Bar Council"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Bar Council Number</Label>
                <Input
                  value={(profile.bar_council as string) || ""}
                  onChange={(e) => set("bar_council", e.target.value)}
                  placeholder="e.g. KL/2014/8821"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Enrollment Number</Label>
                <Input
                  value={(profile.enrollment_number as string) || ""}
                  onChange={(e) => set("enrollment_number", e.target.value)}
                  placeholder="Bar Council enrollment no."
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Court of Practice</Label>
                <Select
                  value={(profile.court_of_practice as string) || ""}
                  onValueChange={(v) => set("court_of_practice", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select court level" /></SelectTrigger>
                  <SelectContent>
                    {COURTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Years of Experience</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={(profile.years_experience as number) ?? ""}
                  onChange={(e) => set("years_experience", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">State (primary court location)</Label>
                <Select
                  value={(profile.state as string) || ""}
                  onValueChange={(v) => { set("state", v); set("district", ""); }}
                >
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {STATE_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">District</Label>
                <Select
                  value={(profile.district as string) || ""}
                  onValueChange={(v) => set("district", v)}
                  disabled={!profile.state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={profile.state ? "Select district" : "Select state first"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Specializations */}
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Practice Areas / Specializations</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {specs.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border-0 gap-1">
                      {s}
                      <button onClick={() => removeSpec(s)} className="hover:text-destructive ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select value={newSpec} onValueChange={addSpec}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add a specialization…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {SPECIALIZATIONS.filter((s) => !specs.includes(s)).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Emergency */}
              <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40">
                <input
                  type="checkbox"
                  id="emergency"
                  checked={!!(profile.is_available_for_emergency)}
                  onChange={(e) => set("is_available_for_emergency", e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <label htmlFor="emergency" className="text-sm cursor-pointer">
                  I am available for emergency consultations
                </label>
              </div>
            </div>
          </TabsContent>

          {/* ── PERSONAL TAB ─────────────────────────────────────── */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              This information is used for bail arguments, legal aid eligibility, and court-cell matching.
              It is visible only to you.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs mb-1 block">Age</Label>
                <Input
                  type="number" min={18} max={100}
                  value={(profile.age as number) ?? ""}
                  onChange={(e) => set("age", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Gender</Label>
                <Select value={(profile.gender as string) || ""} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Male","Female","Other","Prefer not to say"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Religion</Label>
                <Input
                  value={(profile.religion as string) || ""}
                  onChange={(e) => set("religion", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Marital Status</Label>
                <Select value={(profile.marital_status as string) || ""} onValueChange={(v) => set("marital_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Single","Married","Divorced","Widowed","Separated"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Occupation</Label>
                <Input
                  value={(profile.occupation as string) || ""}
                  onChange={(e) => set("occupation", e.target.value)}
                  placeholder="e.g. Advocate, Retired, Business"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Annual Income Bracket</Label>
                <Select value={(profile.earning_bracket as string) || ""} onValueChange={(v) => set("earning_bracket", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[
                      "Below ₹1 lakh",
                      "₹1–3 lakh",
                      "₹3–7 lakh",
                      "₹7–15 lakh",
                      "₹15–25 lakh",
                      "Above ₹25 lakh",
                    ].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Family Background</Label>
                <Textarea
                  value={(profile.family_background as string) || ""}
                  onChange={(e) => set("family_background", e.target.value)}
                  placeholder="Dependents, earning members, support system…"
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Physical Condition</Label>
                <Input
                  value={(profile.physical_condition as string) || ""}
                  onChange={(e) => set("physical_condition", e.target.value)}
                  placeholder="Any disability, chronic illness, medical conditions…"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Prior Case History</Label>
                <Textarea
                  value={(profile.prior_case_history as string) || ""}
                  onChange={(e) => set("prior_case_history", e.target.value)}
                  placeholder="Previous FIRs, cases, convictions (if any)…"
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
