
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "@/lib/i18n"; // Initialize i18n
import { AuthProvider } from "@/contexts/AuthContext";
import { PricingProvider } from "@/contexts/PricingContext";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import { PromptsProvider } from "@/contexts/PromptsContext";
import { VideoLibraryProvider } from "@/contexts/VideoLibraryContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { GamificationCelebrationProvider } from "@/contexts/GamificationCelebrationContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MobileHeader } from "@/components/MobileHeader";
import { ProfileSetup } from "@/components/ProfileSetup";
import { FirstVideoPrompt } from "@/components/FirstVideoPrompt";
import { XPAnimationToast } from "@/components/gamification/XPAnimationToast";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Record from "./pages/Record";
import VideoDetails from "./pages/VideoDetails";
import Contacts from "./pages/Contacts";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import SharedWithMe from "./pages/SharedWithMe";
import SocialFeed from "./pages/SocialFeed";
import TrustedContactCenter from "./pages/TrustedContactCenter";
import TrustedContactDashboard from "./pages/TrustedContactDashboard";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

// Conditional Header Component - shows MobileHeader except on pages with custom headers
function ConditionalHeader() {
  const location = useLocation();
  
  // Pages that have their own custom headers and don't need MobileHeader
  const pagesWithCustomHeaders = [
    '/admin',           // Has admin-specific header
    '/record',          // Has "Create Your Message" header
    '/video-details',   // Has "Complete Your Message" header
    '/notifications',   // Has "Notifications" header with back button
    '/auth'             // Has auth-specific header
  ];
  
  // Check if current path matches any page with custom header
  const hasCustomHeader = pagesWithCustomHeaders.some(path => 
    location.pathname.startsWith(path)
  );
  
  if (hasCustomHeader) {
    return null;
  }
  
  return <MobileHeader />;
}

// Conditional Bottom Navigation - shows except on pages that don't need it
function ConditionalBottomNavigation() {
  const location = useLocation();
  
  // Pages that don't need bottom navigation
  const pagesWithoutBottomNav = [
    '/admin',           // Admin has its own navigation
    '/auth'             // Auth pages don't need bottom nav
  ];
  
  // Check if current path matches any page without bottom nav
  const needsBottomNav = !pagesWithoutBottomNav.some(path => 
    location.pathname.startsWith(path)
  );
  
  if (!needsBottomNav) {
    return null;
  }
  
  return <BottomNavigation />;
}

function AppRoutes() {
  const { user, profile, isLoading, error, retry } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Track when we're waiting for profile after user is authenticated
  useEffect(() => {
    if (user && !profile && !isLoading) {
      setIsProfileLoading(true);
      // Give it a reasonable time to load the profile
      const timeout = setTimeout(() => {
        setIsProfileLoading(false);
      }, 3000); // 3 second window for profile to load

      return () => clearTimeout(timeout);
    } else {
      setIsProfileLoading(false);
    }
  }, [user, profile, isLoading]);

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

  if ((isLoading || isProfileLoading) && !loadingTimeout) {
    console.log('⏳ App.tsx: Still loading, waiting for profile...', { isLoading, isProfileLoading });
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-6">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <div className="w-6 h-6 rounded-full bg-primary-foreground/50" />
          </div>
          <p className="text-muted-foreground">
            {isProfileLoading ? 'Loading your profile...' : 'Loading your experience...'}
          </p>
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

  // Only check profile status AFTER all loading is complete
  // If we have a user but no profile after loading is complete, force profile setup
  if (!isLoading && !isProfileLoading && !profile) {
    console.log('🚨 App.tsx: No profile found after loading complete, showing ProfileSetup');
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup onComplete={() => {}} />} />
      </Routes>
    );
  }

  // If user is authenticated but hasn't completed onboarding (only after loading)
  if (!isLoading && !isProfileLoading && profile && !profile.onboarding_completed) {
    console.log('🚨 App.tsx: Onboarding not completed, showing ProfileSetup', {
      onboardingCompleted: profile.onboarding_completed,
      profileData: profile
    });
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup onComplete={() => {}} />} />
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
  console.log('✅ App.tsx: Loading complete, showing normal app routes');
  return (
    <>
      <ConditionalHeader />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/record" element={<Record />} />
        <Route path="/video-details" element={<VideoDetails />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/library" element={<Library />} />
        <Route path="/shared-with-me" element={<SharedWithMe />} />
        <Route path="/social-feed" element={<SocialFeed />} />
        <Route path="/trusted-contact-center" element={<TrustedContactCenter />} />
        <Route path="/trusted-contact-dashboard" element={<TrustedContactDashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ConditionalBottomNavigation />
    </>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ConfigProvider>
        <CategoriesProvider>
          <PromptsProvider>
            <PricingProvider>
              <RealtimeProvider>
                <GamificationCelebrationProvider>
                  <VideoLibraryProvider>
                    <NotificationsProvider>
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <XPAnimationToast />
                        <BrowserRouter>
                          <div className="min-h-screen bg-background">
                            <Routes>
                              <Route path="*" element={<AppRoutes />} />
                            </Routes>
                          </div>
                        </BrowserRouter>
                      </TooltipProvider>
                    </NotificationsProvider>
                  </VideoLibraryProvider>
                </GamificationCelebrationProvider>
              </RealtimeProvider>
            </PricingProvider>
          </PromptsProvider>
        </CategoriesProvider>
      </ConfigProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
