import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Pricing from "./pages/Pricing.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import Profile from "./pages/Profile.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import DashboardRouter from "./pages/dashboards/DashboardRouter.tsx";
import AdvocateDashboard from "./pages/dashboards/AdvocateDashboard.tsx";
import EnterpriseDashboard from "./pages/dashboards/EnterpriseDashboard.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";
import SystemConsole from "./pages/SystemConsole.tsx";
import Terms from "./pages/legal/Terms.tsx";
import Privacy from "./pages/legal/Privacy.tsx";
import Refund from "./pages/legal/Refund.tsx";
import Contact from "./pages/legal/Contact.tsx";
import TeamsList from "./pages/teams/TeamsList.tsx";
import TeamWorkspace from "./pages/teams/TeamWorkspace.tsx";
import Network from "./pages/Network.tsx";
import Darbar from "./pages/Darbar.tsx";
import LegalClock from "./pages/tools/LegalClock.tsx";
import Admin from "./pages/Admin.tsx";
import { DocsHome, DocsArticle } from "./pages/Docs.tsx";

const queryClient = new QueryClient();

// ── Video background — fixed behind everything ──
function VideoBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let particles: any[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    const init = () => {
      resize();
      particles = Array.from({ length: 90 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.8 + 0.8,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(99,102,241,${(1 - dist/120) * 0.3})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.7)';
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    init();
    draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, []);
  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      zIndex: -1, opacity: 0.4, pointerEvents: 'none',
    }} />
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              {/* Video background — sits behind all pages */}
              <VideoBg />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
                <Route path="/dashboard/advocate/*" element={<ProtectedRoute><AdvocateDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/enterprise/*" element={<ProtectedRoute><EnterpriseDashboard /></ProtectedRoute>} />
                <Route path="/admin/ai" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                <Route path="/system" element={<ProtectedRoute><SystemConsole /></ProtectedRoute>} />
                <Route path="/teams" element={<ProtectedRoute><TeamsList /></ProtectedRoute>} />
                <Route path="/teams/:id" element={<ProtectedRoute><TeamWorkspace /></ProtectedRoute>} />
                <Route path="/network" element={<ProtectedRoute><Network /></ProtectedRoute>} />
                <Route path="/network/browse" element={<ProtectedRoute><Network /></ProtectedRoute>} />
                <Route path="/network/cell/:id" element={<ProtectedRoute><Network /></ProtectedRoute>} />
                <Route path="/cases/:id/darbar" element={<ProtectedRoute><Darbar /></ProtectedRoute>} />
                <Route path="/tools/legal-clock" element={<LegalClock />} />
                <Route path="/admin/*" element={<Admin />} />
                <Route path="/docs" element={<DocsHome />} />
                <Route path="/docs/:slug" element={<DocsArticle />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
