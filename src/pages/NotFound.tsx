import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/bhramar-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-6">
        <img src={logo} alt="Bhramar" className="h-16 w-16 mx-auto opacity-80" />
        <div>
          <h1 className="text-6xl font-bold mb-2">404</h1>
          <p className="text-lg text-muted-foreground">This page doesn't exist.</p>
          <p className="text-sm text-muted-foreground/70 mt-1 break-all">{location.pathname}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
          <Button asChild>
            <Link to="/app">Back to chat</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
