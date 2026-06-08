import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import PupilAuth from "./pages/PupilAuth";
import ResetPassword from "./pages/ResetPassword";
import Rankings from "./pages/Rankings";
import Profile from "./pages/Profile";
import Statistics from "./pages/Statistics";
import OnlineMatch from "./pages/OnlineMatch";
import Admin from "./pages/Admin";
import AdminPlayers from "./pages/AdminPlayers";
import NotFound from "./pages/NotFound";
import Rules from "./pages/Rules";
import School from "./pages/School";
import Teacher from "./pages/Teacher";
import GlobalOnlineManager from "./components/GlobalOnlineManager";
import SchoolpleinHeader from "./components/SchoolpleinHeader";
import { PlayerProvider } from "@/hooks/usePlayerContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PlayerProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SchoolpleinHeader />
          <GlobalOnlineManager />
          <Routes>
            <Route path="/" element={<School />} />
            <Route path="/klassiek" element={<Landing />} />
            <Route path="/school" element={<School />} />
            <Route path="/docent" element={<Teacher />} />
            <Route path="/spelen" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/leerling" element={<PupilAuth />} />
            <Route path="/leerling-login" element={<PupilAuth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:playerId" element={<Profile />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/statistics/:playerId" element={<Statistics />} />
            <Route path="/online-match" element={<OnlineMatch />} />
            <Route path="/spelregels" element={<Rules />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/spelers" element={<AdminPlayers />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
