import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Scale } from "lucide-react";

const ONBOARDING_DONE_KEY = "bhramar.onboardingCompleted";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardChecked, setOnboardChecked] = useState(false);
  const [needsOnboard, setNeedsOnboard] = useState(false);

  useEffect(() => {
    if (!user) { setOnboardChecked(true); return; }
    if (localStorage.getItem(ONBOARDING_DONE_KEY) === user.id) {
      setNeedsOnboard(false);
      setOnboardChecked(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
      if (error) {
        setNeedsOnboard(false);
      } else {
        setNeedsOnboard(data?.onboarding_completed !== true);
      }
      setOnboardChecked(true);
    })();
  }, [user]);

  if (loading || (user && !onboardChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Scale className="h-8 w-8 text-gold animate-pulse-soft" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboard && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
