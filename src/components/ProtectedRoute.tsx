import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Scale } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Scale className="h-8 w-8 text-gold animate-pulse-soft" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}