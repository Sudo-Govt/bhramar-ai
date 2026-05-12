import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Phone, Loader2, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { INDIA_STATES } from "@/lib/indiaLocations";
import { VakeelBadge } from "@/components/VakeelBadge";
import { toast } from "sonner";

const ISSUE_TYPES = ["Criminal", "Civil", "Family", "Property", "Labour", "Other"];

interface Advocate {
  id: string;
  full_name: string;
  advocate_id?: string;
  vakeel_score: number;
  vakeel_reviews_count?: number;
  bar_council?: string;
  court_of_practice?: string;
  state?: string;
  district?: string;
}

export function EmergencyButton({ variant = "floating" }: { variant?: "floating" | "inline" }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState("Criminal");
  const [description, setDescription] = useState("");
  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Advocate[] | null>(null);

  const districts = INDIA_STATES.find((s) => s.state === stateName)?.districts ?? [];

  const reset = () => {
    setIssueType("Criminal");
    setDescription("");
    setStateName("");
    setDistrict("");
    setResults(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("emergency-match", {
        body: { issue_type: issueType, state: stateName || undefined, district: district || undefined },
      });
      if (error) throw error;
      const advocates: Advocate[] = data?.advocates || [];
      setResults(advocates);
      if (advocates.length === 0) {
        toast.info("No advocates available right now. Try again shortly.");
      }
    } catch (e) {
      toast.error("Bhramar is thinking... try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const logConsult = async (advocate_id: string) => {
    try {
      await supabase.from("emergency_consultations").insert({
        citizen_user_id: user?.id ?? null,
        advocate_id,
        issue_type: issueType,
        description: description || null,
        state: stateName || null,
        district: district || null,
      });
    } catch {}
  };

  const bookPaid = async (advocate_id: string) => {
    await logConsult(advocate_id);
    if (!user) {
      toast.info("Sign in to book a paid consultation.");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: { plan: "emergency" },
      });
      if (error) throw error;
      toast.success("Order created. Complete payment to confirm consultation.");
      console.log("Razorpay order", data);
    } catch (e: any) {
      toast.error(e?.message || "Could not start payment.");
    }
  };

  return (
    <>
      {variant === "floating" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Emergency legal help"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/40 flex items-center justify-center hover:scale-105 transition-transform animate-pulse"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} variant="destructive" className="gap-2">
          <AlertTriangle className="h-4 w-4" /> Emergency Legal Help
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Emergency Legal Help
            </DialogTitle>
            <DialogDescription>
              Tell Bhramar what's wrong. We'll connect you to a top-rated advocate available right now.
            </DialogDescription>
          </DialogHeader>

          {!results ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Issue type</label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">What happened?</label>
                <Textarea
                  rows={3}
                  placeholder="Briefly describe your situation…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">State</label>
                  <Select value={stateName} onValueChange={(v) => { setStateName(v); setDistrict(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {INDIA_STATES.map((s) => <SelectItem key={s.state} value={s.state}>{s.state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">District</label>
                  <Select value={district} onValueChange={setDistrict} disabled={!stateName}>
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2" variant="destructive">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Find an advocate now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold">Top advocates available now</h3>
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No advocates flagged as available right now. Please try again shortly.
                </p>
              )}
              {results.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{a.full_name || "Advocate"}</span>
                        <VakeelBadge score={a.vakeel_score} reviewsCount={a.vakeel_reviews_count} size="sm" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {a.court_of_practice || a.bar_council || "Bar Council"}
                        {a.state ? ` · ${a.state}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => logConsult(a.id)}
                      asChild
                    >
                      <a href={`tel:`} onClick={(e) => { e.preventDefault(); logConsult(a.id); toast.success("Contact request logged. Advocate will be notified."); }}>
                        <Phone className="h-4 w-4" /> Call
                      </a>
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => bookPaid(a.id)}>
                      <IndianRupee className="h-4 w-4" /> Paid Consultation
                    </Button>
                  </div>
                </Card>
              ))}
              <Button variant="ghost" className="w-full" onClick={() => setResults(null)}>
                Search again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EmergencyButton;
