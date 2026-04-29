import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BhramarLogo } from "@/components/BhramarLogo";

export default function DashboardRouter() {
  const { user } = useAuth();
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle();
      // Dev override (matches useEffectiveTier logic)
      const dev = localStorage.getItem("bhramar.devTier");
      const effective = dev || data?.subscription_tier || "Free";
      setTier(effective);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <BhramarLogo />
      </div>
    );
  }
  if (tier === "Firm") return <Navigate to="/dashboard/enterprise" replace />;
  if (tier === "Pro") return <Navigate to="/dashboard/advocate" replace />;
  return <Navigate to="/profile" replace />;
}
