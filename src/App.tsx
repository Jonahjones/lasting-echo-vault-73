
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VideoLibraryProvider } from "@/contexts/VideoLibraryContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProfileSetup } from "@/components/ProfileSetup";
import { FirstVideoPrompt } from "@/components/FirstVideoPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Record from "./pages/Record";
import VideoDetails from "./pages/VideoDetails";
import Contacts from "./pages/Contacts";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

function AppRoutes() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <div className="w-6 h-6 rounded-full bg-primary-foreground/50" />
          </div>
          <p className="text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show auth page
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  // If user is authenticated but hasn't completed onboarding
  if (profile && !profile.onboarding_completed) {
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup onComplete={() => window.location.reload()} />} />
      </Routes>
    );
  }

  // If user completed onboarding but hasn't recorded first video
  if (profile && profile.onboarding_completed && !profile.first_video_recorded) {
    return (
      <Routes>
        <Route path="*" element={<FirstVideoPrompt />} />
      </Routes>
    );
  }

  // Normal app routes for fully onboarded users
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/record" element={<Record />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNavigation />
    </>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <VideoLibraryProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <AppRoutes />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </VideoLibraryProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
