import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATE_NAMES, getDistricts } from "@/lib/indiaLocations";

export type Demographics = {
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  religion?: string | null;
  marital_status?: string | null;
  has_children?: boolean | null;
  occupation?: string | null;
  earning_bracket?: string | null;
  family_background?: string | null;
  physical_condition?: string | null;
  prior_case_history?: string | null;
  state?: string | null;
  district?: string | null;
};

export function DemographicsForm({
  value,
  onChange,
  showName = true,
}: {
  value: Demographics;
  onChange: (next: Demographics) => void;
  showName?: boolean;
}) {
  const set = <K extends keyof Demographics>(k: K, v: Demographics[K]) =>
    onChange({ ...value, [k]: v });
  const districts = value.state ? getDistricts(value.state) : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showName && (
        <div className="sm:col-span-2">
          <Label>Full name</Label>
          <Input value={value.full_name || ""} onChange={(e) => set("full_name", e.target.value)} />
        </div>
      )}
      <div>
        <Label>Age</Label>
        <Input
          type="number"
          min={0}
          max={120}
          value={value.age ?? ""}
          onChange={(e) => set("age", e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
      <div>
        <Label>Gender</Label>
        <Select value={value.gender || ""} onValueChange={(v) => set("gender", v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Religion</Label>
        <Select value={value.religion || ""} onValueChange={(v) => set("religion", v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {["Hindu","Muslim","Christian","Sikh","Buddhist","Jain","Parsi","Jewish","Other","Prefer not to say"].map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Marital status</Label>
        <Select value={value.marital_status || ""} onValueChange={(v) => set("marital_status", v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {["Single","Married","Divorced","Widowed","Separated"].map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Has children</Label>
        <Select
          value={value.has_children == null ? "" : value.has_children ? "yes" : "no"}
          onValueChange={(v) => set("has_children", v === "yes")}
        >
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Occupation / job</Label>
        <Input value={value.occupation || ""} onChange={(e) => set("occupation", e.target.value)} />
      </div>
      <div>
        <Label>Earning bracket</Label>
        <Select value={value.earning_bracket || ""} onValueChange={(v) => set("earning_bracket", v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {["No income","Below ₹2L/yr","₹2L–5L/yr","₹5L–10L/yr","₹10L–25L/yr","₹25L–50L/yr","Above ₹50L/yr"].map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>State</Label>
        <Select value={value.state || ""} onValueChange={(v) => onChange({ ...value, state: v, district: null })}>
          <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {STATE_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>District</Label>
        <Select
          value={value.district || ""}
          onValueChange={(v) => set("district", v)}
          disabled={!value.state}
        >
          <SelectTrigger><SelectValue placeholder={value.state ? "Select district" : "Select state first"} /></SelectTrigger>
          <SelectContent className="max-h-72">
            {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Physical condition</Label>
        <Input
          placeholder="Healthy / disability / chronic illness etc."
          value={value.physical_condition || ""}
          onChange={(e) => set("physical_condition", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label>Family background</Label>
        <Textarea
          placeholder="Family situation: dependents, earning members, support system..."
          value={value.family_background || ""}
          onChange={(e) => set("family_background", e.target.value)}
          rows={2}
        />
      </div>
      <div className="sm:col-span-2">
        <Label>Prior case history</Label>
        <Textarea
          placeholder="Any previous legal cases, FIRs, complaints involving this person."
          value={value.prior_case_history || ""}
          onChange={(e) => set("prior_case_history", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}
