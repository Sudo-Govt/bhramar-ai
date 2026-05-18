import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, AlertTriangle, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TodayCase {
  id: string;
  name: string;
  case_number: string;
  client_name: string | null;
  stage: string | null;
  priority: string | null;
  deadline: string | null;
  ai_summary: string | null;
  hearing_time?: string;
  tasks_overdue: number;
}

interface AIPrep {
  case_id: string;
  arguments: string;
  citations: string[];
  risks: string[];
}

export function TodayCases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<TodayCase[]>([]);
  const [aiPreps, setAiPreps] = useState<Record<string, AIPrep>>({});
  const [loading, setLoading] = useState(true);
  const [generatingPrep, setGeneratingPrep] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTodayCases();
  }, [user]);

  const loadTodayCases = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Get cases with today's deadline OR active status
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id, name, case_number, client_name, stage, priority, deadline, ai_summary,
          tasks:tasks(count)
        `)
        .eq("user_id", user.id)
        .or(`deadline.eq.${today},status.eq.active`)
        .order("priority", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((c: any) => ({
        ...c,
        tasks_overdue: c.tasks?.[0]?.count || 0,
        hearing_time: c.deadline ? new Date(c.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
      }));

      setCases(formatted);

      // Auto-generate AI prep for first case
      if (formatted.length > 0) {
        generatePrep(formatted[0].id);
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load cases");
    }
    setLoading(false);
  };

  const generatePrep = async (caseId: string) => {
    if (aiPreps[caseId]) return; // Already generated
    setGeneratingPrep(caseId);
    
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [{
            role: "user",
            content: `Generate a hearing preparation summary for this case. Include: (1) Key arguments to present, (2) Relevant legal citations from BNS/BNSS/BSA, (3) Risk factors. Keep it concise — bullet points only.`
          }],
          case_id: caseId,
        },
      });

      if (error) throw error;

      // Parse the AI response into structured prep
      const content = data?.choices?.[0]?.message?.content || data?.content || "";
      
      // Simple parsing — in production, ask AI for JSON
      const args = content.split("Arguments:")[1]?.split("Citations:")[0]?.trim() || content.slice(0, 300);
      const cits = content.match(/Section \d+[A-Z]?/g) || [];
      const risks = content.split("Risk")[1]?.split("\n").filter((l: string) => l.trim().startsWith("-")) || [];

      setAiPreps(prev => ({
        ...prev,
        [caseId]: {
          case_id: caseId,
          arguments: args,
          citations: cits,
          risks: risks,
        }
      }));

    } catch (err) {
      console.error("Prep generation failed:", err);
    }
    setGeneratingPrep(null);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "high": return "bg-red-500/10 text-red-600 border-red-200";
      case "medium": return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "low": return "bg-green-500/10 text-green-600 border-green-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-6 text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No cases for today</h3>
          <p className="text-muted-foreground mb-4">You're all caught up! Create a new case to get started.</p>
          <Button onClick={() => navigate("/cases/new")}>New Case</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gold" />
          Today's Cases ({cases.length})
        </h2>
        <Badge variant="outline">{new Date().toLocaleDateString()}</Badge>
      </div>

      {cases.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.case_number} · {c.client_name || "No client"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.hearing_time && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {c.hearing_time}
                  </Badge>
                )}
                <Badge variant="outline" className={getPriorityColor(c.priority)}>
                  {c.priority || "Normal"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* AI Prep Summary */}
            {aiPreps[c.id] ? (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gold">
                  <Sparkles className="h-4 w-4" />
                  AI Hearing Prep
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {aiPreps[c.id].arguments}
                </p>
                {aiPreps[c.id].citations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {aiPreps[c.id].citations.slice(0, 3).map((cit, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {cit}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : generatingPrep === c.id ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Generating prep...
              </div>
            ) : null}

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/cases/${c.id}`)}>
                Open Case <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              {c.tasks_overdue > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {c.tasks_overdue} overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
