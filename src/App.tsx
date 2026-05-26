import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Rankings from "./pages/Rankings";
import Profile from "./pages/Profile";
import Statistics from "./pages/Statistics";
import OnlineMatch from "./pages/OnlineMatch";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Rules from "./pages/Rules";
import School from "./pages/School";
import GlobalOnlineManager from "./components/GlobalOnlineManager";
import { PlayerProvider } from "@/hooks/usePlayerContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PlayerProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalOnlineManager />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/spelen" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:playerId" element={<Profile />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/statistics/:playerId" element={<Statistics />} />
            <Route path="/online-match" element={<OnlineMatch />} />
            <Route path="/spelregels" element={<Rules />} />
            <Route path="/school" element={<School />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
