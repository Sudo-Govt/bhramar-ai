import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronDown, ChevronRight, Building2, Network as NetworkIcon,
  Users, UserPlus, Share2, Search, Gavel, MapPin, Circle,
} from "lucide-react";
import { VakeelBadge } from "@/components/VakeelBadge";
import { INDIA_STATES, STATE_NAMES, getDistricts } from "@/lib/indiaLocations";

type Adv = {
  id: string;
  full_name: string | null;
  advocate_id: string | null;
  court_of_practice: string | null;
  specializations: string[] | null;
  vakeel_score: number | null;
  vakeel_reviews_count: number | null;
  state: string | null;
  district: string | null;
  is_available_for_emergency: boolean | null;
};

const HIGH_COURTS: { name: string; states: string[] }[] = [
  { name: "Allahabad High Court", states: ["Uttar Pradesh"] },
  { name: "Bombay High Court", states: ["Maharashtra", "Goa", "Dadra and Nagar Haveli and Daman and Diu"] },
  { name: "Calcutta High Court", states: ["West Bengal", "Andaman and Nicobar Islands"] },
  { name: "Delhi High Court", states: ["Delhi"] },
  { name: "Gujarat High Court", states: ["Gujarat"] },
  { name: "Karnataka High Court", states: ["Karnataka"] },
  { name: "Kerala High Court", states: ["Kerala", "Lakshadweep"] },
  { name: "Madras High Court", states: ["Tamil Nadu", "Puducherry"] },
  { name: "Rajasthan High Court", states: ["Rajasthan"] },
  { name: "Patna High Court", states: ["Bihar"] },
  { name: "Punjab & Haryana High Court", states: ["Punjab", "Haryana", "Chandigarh"] },
  { name: "Gauhati High Court", states: ["Assam", "Nagaland", "Mizoram", "Arunachal Pradesh"] },
  { name: "Andhra Pradesh High Court", states: ["Andhra Pradesh"] },
  { name: "Telangana High Court", states: ["Telangana"] },
  { name: "Chhattisgarh High Court", states: ["Chhattisgarh"] },
  { name: "Himachal Pradesh High Court", states: ["Himachal Pradesh"] },
  { name: "Jharkhand High Court", states: ["Jharkhand"] },
  { name: "Madhya Pradesh High Court", states: ["Madhya Pradesh"] },
  { name: "Orissa High Court", states: ["Odisha"] },
  { name: "Uttarakhand High Court", states: ["Uttarakhand"] },
  { name: "Jammu & Kashmir High Court", states: ["Jammu and Kashmir", "Ladakh"] },
  { name: "Manipur High Court", states: ["Manipur"] },
  { name: "Meghalaya High Court", states: ["Meghalaya"] },
  { name: "Tripura High Court", states: ["Tripura"] },
  { name: "Sikkim High Court", states: ["Sikkim"] },
];

const COURT_TYPES = ["Supreme Court", "High Court", "District Court", "Tribunal"];
const SPEC_LIST = [
  "Criminal", "Civil", "Family & Matrimonial", "Property & Land",
  "Corporate & Commercial", "Tax", "Constitutional", "Labour & Employment",
  "Intellectual Property", "Cyber & Technology", "Banking & Finance",
  "Consumer", "Environment", "Human Rights", "Immigration",
];

function AdvocateCard({
  adv, recipientId, currentUserName, showActions = true,
}: { adv: Adv; recipientId: string; currentUserName: string; showActions?: boolean }) {
  const sendNotif = async (type: "team_up_request" | "case_referral") => {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: recipientId,
        type,
        title:
          type === "team_up_request"
            ? `${currentUserName} wants to team up on Bhramar`
            : `${currentUserName} sent you a case referral`,
        body: type === "team_up_request"
          ? "Open Bhramar to accept and start collaborating."
          : "Open Bhramar to review the referral details.",
        payload: { advocate_id: adv.advocate_id ?? null },
      });
      if (error) throw error;
      toast.success(type === "team_up_request" ? "Team-up request sent" : "Referral sent");
    } catch (e: any) {
      toast.error(e.message || "Could not send — try again");
    }
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{adv.full_name || "Advocate"}</span>
            <VakeelBadge score={adv.vakeel_score ?? 0} reviewsCount={adv.vakeel_reviews_count ?? 0} size="sm" />
            {adv.is_available_for_emergency && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500" title="Available for emergency">
                <Circle className="h-2 w-2 fill-emerald-500" /> Available
              </span>
            )}
          </div>
          <div className="text-xs text-gold font-mono">{adv.advocate_id || "ID pending"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {adv.court_of_practice || "—"}{adv.state ? ` · ${adv.state}` : ""}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(adv.specializations || []).slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => sendNotif("team_up_request")}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Team Up
          </Button>
          <Button size="sm" variant="outline" onClick={() => sendNotif("case_referral")}>
            <Share2 className="h-3.5 w-3.5 mr-1" /> Refer Case
          </Button>
        </div>
      )}
    </Card>
  );
}

function AdvocateSkeleton() {
  return (
    <Card className="p-4 space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
    </Card>
  );
}

export default function Network() {
  const { user } = useAuth();
  const [me, setMe] = useState<Adv | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [cellAdvocates, setCellAdvocates] = useState<Adv[] | null>(null);
  const [emergencyOn, setEmergencyOn] = useState(false);

  // Browse cells tree
  const [openHC, setOpenHC] = useState<string | null>(null);
  const [openState, setOpenState] = useState<string | null>(null);
  const [activeLeaf, setActiveLeaf] = useState<{ label: string; filter: Partial<Adv> } | null>(null);
  const [leafAdvocates, setLeafAdvocates] = useState<Adv[] | null>(null);

  // Find filter
  const [findSpecs, setFindSpecs] = useState<string[]>([]);
  const [findCourtType, setFindCourtType] = useState<string>("");
  const [findState, setFindState] = useState<string>("");
  const [findDistrict, setFindDistrict] = useState<string>("");
  const [findMinScore, setFindMinScore] = useState<number>(0);
  const [findResults, setFindResults] = useState<Adv[] | null>(null);
  const [findLoading, setFindLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingMe(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, advocate_id, court_of_practice, specializations, vakeel_score, vakeel_reviews_count, state, district, is_available_for_emergency")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setMe(data as any);
        setEmergencyOn(!!(data as any).is_available_for_emergency);
      }
      setLoadingMe(false);
    })();
  }, [user?.id]);

  // Load my cell colleagues
  useEffect(() => {
    if (!me?.court_of_practice) { setCellAdvocates([]); return; }
    (async () => {
      setCellAdvocates(null);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, advocate_id, court_of_practice, specializations, vakeel_score, vakeel_reviews_count, state, district, is_available_for_emergency")
        .eq("court_of_practice", me.court_of_practice)
        .neq("id", me.id)
        .in("user_type", ["advocate", "firm_member"])
        .order("vakeel_score", { ascending: false })
        .limit(50);
      setCellAdvocates((data as Adv[]) || []);
    })();
  }, [me?.court_of_practice, me?.id]);

  const toggleEmergency = async (v: boolean) => {
    if (!user) return;
    setEmergencyOn(v);
    const { error } = await supabase.from("profiles").update({ is_available_for_emergency: v }).eq("id", user.id);
    if (error) {
      setEmergencyOn(!v);
      toast.error(error.message || "Could not update availability");
    } else {
      toast.success(v ? "You're now available for emergency consults" : "Marked as unavailable");
    }
  };

  // Browse → fetch advocates for a leaf
  const openLeaf = async (label: string, filter: { court_of_practice?: string; state?: string; district?: string }) => {
    setActiveLeaf({ label, filter: filter as any });
    setLeafAdvocates(null);
    let q = supabase
      .from("profiles")
      .select("id, full_name, advocate_id, court_of_practice, specializations, vakeel_score, vakeel_reviews_count, state, district, is_available_for_emergency")
      .in("user_type", ["advocate", "firm_member"])
      .order("vakeel_score", { ascending: false })
      .limit(60);
    if (filter.court_of_practice) q = q.eq("court_of_practice", filter.court_of_practice);
    if (filter.state) q = q.eq("state", filter.state);
    if (filter.district) q = q.eq("district", filter.district);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setLeafAdvocates([]); return; }
    setLeafAdvocates((data as Adv[]) || []);
  };

  const runFind = async () => {
    setFindLoading(true);
    setFindResults(null);
    try {
      let q = supabase
        .from("profiles")
        .select("id, full_name, advocate_id, court_of_practice, specializations, vakeel_score, vakeel_reviews_count, state, district, is_available_for_emergency")
        .in("user_type", ["advocate", "firm_member"])
        .gte("vakeel_score", findMinScore)
        .order("vakeel_score", { ascending: false })
        .limit(60);
      if (findState) q = q.eq("state", findState);
      if (findDistrict) q = q.eq("district", findDistrict);
      if (findSpecs.length) q = q.overlaps("specializations", findSpecs);
      if (findCourtType) q = q.ilike("court_of_practice", `%${findCourtType}%`);
      const { data, error } = await q;
      if (error) throw error;
      setFindResults((data as Adv[]) || []);
    } catch (e: any) {
      toast.error(e.message || "Search failed");
      setFindResults([]);
    } finally {
      setFindLoading(false);
    }
  };

  const meName = me?.full_name || user?.email?.split("@")[0] || "An advocate";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/70 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="font-display text-base sm:text-lg font-semibold">Advocate Network</h1>
          <Link to="/teams"><Button size="sm" variant="outline" className="gap-1"><Users className="h-4 w-4" /> Teams</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
        <Tabs defaultValue="cell">
          <TabsList className="grid w-full grid-cols-3 max-w-xl mb-6">
            <TabsTrigger value="cell">My Cell</TabsTrigger>
            <TabsTrigger value="browse">Browse Cells</TabsTrigger>
            <TabsTrigger value="find">Find a Colleague</TabsTrigger>
          </TabsList>

          {/* MY CELL */}
          <TabsContent value="cell" className="space-y-5">
            <Card className="p-5 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
              {loadingMe ? (
                <div className="space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /></div>
              ) : me?.court_of_practice ? (
                <>
                  <Badge variant="secondary" className="mb-2">Your court</Badge>
                  <h2 className="font-display text-2xl font-bold flex items-center gap-2 flex-wrap">
                    <Gavel className="h-5 w-5 text-gold" /> {me.court_of_practice}
                    <VakeelBadge score={me.vakeel_score ?? 0} reviewsCount={me.vakeel_reviews_count ?? 0} />
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {me.state || "—"}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-background/40">
                    <div>
                      <div className="text-sm font-medium">Available for emergency</div>
                      <div className="text-xs text-muted-foreground">Citizens in urgent need can reach you first.</div>
                    </div>
                    <Switch checked={emergencyOn} onCheckedChange={toggleEmergency} />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Set your court of practice in your Profile to see your cell.</p>
              )}
            </Card>

            <div>
              <h3 className="font-semibold mb-3">Colleagues in your court</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {cellAdvocates === null && [0, 1, 2, 3].map((i) => <AdvocateSkeleton key={i} />)}
                {cellAdvocates && cellAdvocates.length === 0 && (
                  <Card className="p-8 text-center text-muted-foreground sm:col-span-2">No colleagues here yet — invite a peer to Bhramar.</Card>
                )}
                {cellAdvocates?.map((a) => (
                  <AdvocateCard key={a.id} adv={a} recipientId={a.id} currentUserName={meName} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* BROWSE CELLS */}
          <TabsContent value="browse">
            <div className="grid lg:grid-cols-[360px_1fr] gap-4">
              <Card className="p-4 h-fit">
                <div className="flex items-center gap-2 mb-3"><NetworkIcon className="h-5 w-5 text-gold" /><h2 className="font-semibold">Court tree</h2></div>
                <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
                  <button
                    onClick={() => openLeaf("Supreme Court of India", { court_of_practice: "Supreme Court of India" })}
                    className={`w-full text-left p-2 rounded-md border transition ${activeLeaf?.label === "Supreme Court of India" ? "border-gold/50 bg-gold/10" : "border-transparent hover:bg-accent/40"}`}
                  >
                    <span className="text-sm font-medium">Supreme Court of India</span>
                  </button>

                  {HIGH_COURTS.map((hc) => {
                    const isOpen = openHC === hc.name;
                    return (
                      <div key={hc.name}>
                        <button
                          onClick={() => setOpenHC(isOpen ? null : hc.name)}
                          className="w-full flex items-center gap-1.5 p-2 rounded-md hover:bg-accent/40 text-left"
                        >
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <span className="text-sm font-medium flex-1">{hc.name}</span>
                        </button>
                        {isOpen && (
                          <div className="ml-5 space-y-1 mb-1">
                            <button
                              onClick={() => openLeaf(hc.name, { court_of_practice: hc.name })}
                              className={`w-full text-left p-1.5 rounded text-xs ${activeLeaf?.label === hc.name ? "bg-gold/10 text-gold" : "hover:bg-accent/40 text-muted-foreground"}`}
                            >
                              All {hc.name} advocates
                            </button>
                            {hc.states.map((st) => {
                              const isStOpen = openState === `${hc.name}::${st}`;
                              return (
                                <div key={st}>
                                  <button
                                    onClick={() => setOpenState(isStOpen ? null : `${hc.name}::${st}`)}
                                    className="w-full flex items-center gap-1.5 p-1.5 rounded hover:bg-accent/40 text-left"
                                  >
                                    {isStOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <span className="text-xs flex-1">{st} District Courts</span>
                                  </button>
                                  {isStOpen && (
                                    <div className="ml-5 space-y-0.5">
                                      {getDistricts(st).map((d) => (
                                        <button
                                          key={d}
                                          onClick={() => openLeaf(`${d} District Court`, { state: st, district: d })}
                                          className={`w-full text-left p-1 rounded text-[11px] ${activeLeaf?.label === `${d} District Court` ? "bg-gold/10 text-gold" : "hover:bg-accent/40 text-muted-foreground"}`}
                                        >
                                          {d}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-4 min-h-[60vh]">
                {!activeLeaf && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                    <Building2 className="h-10 w-10 mb-3" />
                    <p>Pick a court from the tree to see its advocates.</p>
                  </div>
                )}
                {activeLeaf && (
                  <>
                    <div className="mb-4">
                      <Badge variant="secondary">{activeLeaf.label}</Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {leafAdvocates === null && [0, 1, 2, 3].map((i) => <AdvocateSkeleton key={i} />)}
                      {leafAdvocates && leafAdvocates.length === 0 && (
                        <Card className="p-8 text-center text-muted-foreground sm:col-span-2">
                          No advocates registered here yet.
                        </Card>
                      )}
                      {leafAdvocates?.map((a) => (
                        <AdvocateCard key={a.id} adv={a} recipientId={a.id} currentUserName={meName} />
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* FIND A COLLEAGUE */}
          <TabsContent value="find">
            <div className="grid lg:grid-cols-[320px_1fr] gap-4">
              <Card className="p-4 space-y-4 h-fit">
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Specializations</label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SPEC_LIST.map((s) => {
                      const active = findSpecs.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => setFindSpecs((p) => active ? p.filter((x) => x !== s) : [...p, s])}
                          className={`text-xs px-2 py-1 rounded-full border transition ${active ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/40"}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Court type</label>
                  <Select value={findCourtType} onValueChange={(v) => setFindCourtType(v === "__any" ? "" : v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any">Any</SelectItem>
                      {COURT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">State</label>
                    <Select value={findState} onValueChange={(v) => { const val = v === "__any" ? "" : v; setFindState(val); setFindDistrict(""); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__any">Any</SelectItem>
                        {STATE_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">District</label>
                    <Select value={findDistrict} onValueChange={(v) => setFindDistrict(v === "__any" ? "" : v)} disabled={!findState}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__any">Any</SelectItem>
                        {(findState ? getDistricts(findState) : []).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                    Min Vakeel Score <span className="text-gold">{findMinScore.toFixed(1)}</span>
                  </label>
                  <Slider value={[findMinScore]} min={0} max={5} step={0.5} onValueChange={(v) => setFindMinScore(v[0])} className="mt-3" />
                </div>
                <Button onClick={runFind} className="w-full gap-2" disabled={findLoading}>
                  <Search className="h-4 w-4" /> Search advocates
                </Button>
              </Card>

              <div>
                {findResults === null && !findLoading && (
                  <Card className="p-8 text-center text-muted-foreground">Apply filters and search to find colleagues.</Card>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {findLoading && [0, 1, 2, 3].map((i) => <AdvocateSkeleton key={i} />)}
                  {findResults && findResults.length === 0 && !findLoading && (
                    <Card className="p-8 text-center text-muted-foreground sm:col-span-2">No matches. Loosen the filters.</Card>
                  )}
                  {findResults?.map((a) => (
                    <AdvocateCard key={a.id} adv={a} recipientId={a.id} currentUserName={meName} />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
