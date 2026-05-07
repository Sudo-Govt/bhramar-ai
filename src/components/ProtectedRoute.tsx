import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Scale } from "lucide-react";

const ONBOARDING_DONE_KEY = "bhramar.onboardingCompleted";

// Module-level cache: once we've verified onboarding for a user in this tab,
// don't re-check on every auth state change (which would cause redirect loops).
const verifiedUsers = new Set<string>();

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardChecked, setOnboardChecked] = useState(false);
  const [needsOnboard, setNeedsOnboard] = useState(false);
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboardChecked(true);
      setNeedsOnboard(false);
      return;
    }
    // Already verified this session — never re-check (prevents redirect loop)
    if (verifiedUsers.has(user.id)) {
      setNeedsOnboard(false);
      setOnboardChecked(true);
      return;
    }
    if (localStorage.getItem(ONBOARDING_DONE_KEY) === user.id) {
      verifiedUsers.add(user.id);
      setNeedsOnboard(false);
      setOnboardChecked(true);
      return;
    }
    // Avoid double-fetching
    if (inflightRef.current === user.id) return;
    inflightRef.current = user.id;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      inflightRef.current = null;
      if (error) {
        // Fail open — don't trap user in a loop on transient errors
        verifiedUsers.add(user.id);
        setNeedsOnboard(false);
      } else if (data?.onboarding_completed === true) {
        localStorage.setItem(ONBOARDING_DONE_KEY, user.id);
        verifiedUsers.add(user.id);
        setNeedsOnboard(false);
      } else {
        setNeedsOnboard(true);
      }
      setOnboardChecked(true);
    })();
  }, [user?.id]);

  // Listen for explicit onboarding completion (fires from Onboarding page)
  useEffect(() => {
    const handler = () => {
      if (user?.id) {
        verifiedUsers.add(user.id);
        setNeedsOnboard(false);
        setOnboardChecked(true);
      }
    };
    window.addEventListener("bhramar:onboarding-complete", handler);
    return () => window.removeEventListener("bhramar:onboarding-complete", handler);
  }, [user?.id]);

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
