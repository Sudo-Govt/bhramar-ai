import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Tap-to-enter landing removed. Authenticated users go straight to the chat
// console; unauthenticated visitors are sent to the login screen.
const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/app" : "/auth"} replace />;
};

export default Index;
