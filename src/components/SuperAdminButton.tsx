import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const SUPER_ADMIN = "bhramar123@gmail.com";

export default function SuperAdminButton() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  if ((user.email || "").toLowerCase() !== SUPER_ADMIN) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Link to the main Admin console (full master settings) */}
      <Link to="/admin">
        <Button className="bg-gold hover:bg-gold-bright text-primary-foreground" size="sm">
          Master settings
        </Button>
      </Link>
    </div>
  );
}
