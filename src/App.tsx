
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VideoLibraryProvider } from "@/contexts/VideoLibraryContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MobileHeader } from "@/components/MobileHeader";
import { ProfileSetup } from "@/components/ProfileSetup";
import { FirstVideoPrompt } from "@/components/FirstVideoPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Record from "./pages/Record";
import VideoDetails from "./pages/VideoDetails";
import Contacts from "./pages/Contacts";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

function AppRoutes() {
  const { user, profile, isLoading, error, retry } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Set a maximum loading timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-6">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <div className="w-6 h-6 rounded-full bg-primary-foreground/50" />
          </div>
          <p className="text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // Show error state if loading timed out or there's an error
  if (loadingTimeout || error) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-6">
          <div className="w-12 h-12 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto">
            <div className="w-6 h-6 rounded-full bg-destructive" />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">
              {loadingTimeout ? "Loading timeout" : "Connection error"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {error || "Couldn't load your experience. Please check your connection or try again."}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={() => {
                setLoadingTimeout(false);
                retry();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/auth'}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Back to Login
            </button>
          </div>
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

  // If we have a user but no profile after loading is complete, force profile setup
  if (!profile) {
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup onComplete={() => window.location.reload()} />} />
      </Routes>
    );
  }

  // If user is authenticated but hasn't completed onboarding
  if (!profile.onboarding_completed) {
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup onComplete={() => window.location.reload()} />} />
      </Routes>
    );
  }

  // If user completed onboarding but hasn't recorded first video
  if (profile.onboarding_completed && !profile.first_video_recorded) {
    return (
      <Routes>
        <Route path="*" element={<FirstVideoPrompt />} />
      </Routes>
    );
  }

  // Normal app routes for fully onboarded users
  return (
    <>
      <MobileHeader />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/record" element={<Record />} />
        <Route path="/video-details" element={<VideoDetails />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/library" element={<Library />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
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
      <RealtimeProvider>
        <VideoLibraryProvider>
          <NotificationsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <div className="min-h-screen bg-background">
                  <Routes>
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<AppRoutes />} />
                  </Routes>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationsProvider>
        </VideoLibraryProvider>
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
