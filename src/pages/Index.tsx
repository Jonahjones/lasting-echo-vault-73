import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Video, Users, Library, Settings, Clock, MessageCircle, Play, Calendar, FileText, Sparkles, Lock, LockOpen, ChevronDown, ChevronUp, RotateCcw, User, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { VideoLikeButton } from "@/components/VideoLikeButton";
import { ProfileSetup } from "@/components/ProfileSetup";
import { VideoPlayerCard } from "@/components/VideoPlayerCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MomentsCarousel } from "@/components/MomentsCarousel";
import { PromptOfTheDay } from "@/components/PromptOfTheDay";

// Enhanced video modal component for inspired videos (moved to MomentsCarousel.tsx)


export default function Index() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState({ total: 0, scheduled: 0, delivered: 0 });
  const [publicVideos, setPublicVideos] = useState<any[]>([]);
  const [displayedVideos, setDisplayedVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRecordingDate, setLastRecordingDate] = useState<Date | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  console.log('Index component state:', { user: !!user, profile: !!profile, isLoading, loading });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Load user stats and public videos with auto-refresh
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Load user video stats
        const { data: userVideos } = await supabase
          .from('videos')
          .select('scheduled_delivery_date, created_at')
          .eq('user_id', user.id);

        const stats = {
          total: userVideos?.length || 0,
          scheduled: userVideos?.filter(v => v.scheduled_delivery_date && new Date(v.scheduled_delivery_date) > new Date()).length || 0,
          delivered: userVideos?.filter(v => v.scheduled_delivery_date && new Date(v.scheduled_delivery_date) <= new Date()).length || 0
        };
        setUserStats(stats);

        // Load inspiring public videos (featured videos that are public)
        console.log('🔍 Loading featured public videos for "Moments That Inspire" feed...');
        
        const { data: publicVids, error: videosError } = await supabase
          .from('videos')
          .select('id, title, description, prompt, created_at, likes_count, user_id, file_path, is_featured, is_public')
          .eq('is_public', true)
          .eq('is_featured', true)
          .order('likes_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (videosError) {
          console.error('❌ Error loading public videos:', videosError);
        } else {
          console.log(`✅ Loaded ${publicVids?.length || 0} featured public videos`);
          console.log('📋 Featured videos data:', publicVids);
          
          // Debug: Also check if there are ANY featured videos (regardless of public status)
          const { data: allFeatured } = await supabase
            .from('videos')
            .select('id, title, is_featured, is_public')
            .eq('is_featured', true);
          console.log('🔍 All featured videos in database (debug):', allFeatured);
          
          // Debug: Check if there are public but not featured videos
          const { data: publicOnly } = await supabase
            .from('videos')
            .select('id, title, is_featured, is_public')
            .eq('is_public', true);
          console.log('🔍 All public videos in database (debug):', publicOnly);
        }

        setPublicVideos(publicVids || []);
        
        // Debug logging for troubleshooting
        if ((publicVids?.length || 0) === 0) {
          console.warn('🚨 No featured videos found for public feed. Checking possible causes:');
          console.warn('1. No videos are marked as both is_public=true AND is_featured=true');
          console.warn('2. Database query issue');
          console.warn('3. Admin may have only set is_featured but not is_public');
          console.warn('4. Videos might exist but not be properly flagged');
        } else {
          console.log(`🎉 SUCCESS: Found ${publicVids?.length} videos for public feed!`);
        }
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    
    // Auto-refresh every 30 seconds to catch admin changes
    const refreshInterval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(refreshInterval);
  }, [user]);

  // Auto-rotation for displayed videos (show 2 at a time, rotate every 10 seconds)
  useEffect(() => {
    if (publicVideos.length <= 2) {
      setDisplayedVideos(publicVideos);
      return;
    }

    // Show first 2 videos initially
    setDisplayedVideos(publicVideos.slice(0, 2));

    const interval = setInterval(() => {
      setDisplayedVideos(prev => {
        const currentIndex = publicVideos.findIndex(video => video.id === prev[0]?.id);
        const nextIndex = (currentIndex + 2) % publicVideos.length;
        
        // If we're near the end, wrap around
        if (nextIndex + 1 >= publicVideos.length) {
          return [publicVideos[nextIndex], publicVideos[0]];
        }
        
        return publicVideos.slice(nextIndex, nextIndex + 2);
      });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [publicVideos]);

  // Check if user hasn't recorded in a while (more than 7 days since last video)
  useEffect(() => {
    const checkLastRecording = async () => {
      if (!user || userStats.total === 0) return;
      
      const { data } = await supabase
        .from('videos')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        const lastDate = new Date(data.created_at);
        setLastRecordingDate(lastDate);
        const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        setShowNudge(daysSince >= 7);
      }
    };

    checkLastRecording();
  }, [user, userStats.total]);

  const handleVideoClick = (video: any) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleRecordYourOwn = (prompt: string) => {
    navigate("/record", { state: { prompt } });
  };

  // Show auth loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // Show loading state while data is loading OR while auth/profile is loading
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user, they'll be redirected to auth
  if (!user) {
    return null;
  }

  // Check if user needs to complete profile setup
  const needsProfileSetup = !profile || !profile.onboarding_completed || 
    !profile.first_name || !profile.last_name;

  // Debug profile setup logic
  console.log('🔍 Profile setup check:', {
    hasProfile: !!profile,
    onboardingCompleted: profile?.onboarding_completed,
    hasFirstName: !!profile?.first_name,
    hasLastName: !!profile?.last_name,
    needsProfileSetup,
    profileData: profile
  });

  // Show profile setup if needed
  if (needsProfileSetup) {
    console.log('🚨 Showing ProfileSetup screen because:', {
      noProfile: !profile,
      onboardingNotCompleted: profile && !profile.onboarding_completed,
      missingFirstName: profile && !profile.first_name,
      missingLastName: profile && !profile.last_name
    });
    
    return (
      <ProfileSetup 
        onComplete={() => {
          // No need to reload - refreshProfile in ProfileSetup already updates the context
          console.log('Profile setup completed');
        }} 
      />
    );
  }

  // If user exists and has complete profile, show dashboard
  const displayProfile = profile;

  const hasVideos = userStats.total > 0;
  const isFirstTime = !displayProfile.first_video_recorded;

  return (
    <div className="min-h-screen bg-gradient-surface pb-12 lg:pb-16">
      <div className="max-w-2xl mx-auto px-3 lg:px-4">
        {/* Spacing */}
        <div className="pt-4 pb-2 lg:pt-16 lg:pb-3"></div>

        {/* Main Content Grid - Desktop: side by side, Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
          {/* Prompt of the Day CTA */}
          <PromptOfTheDay />

          {/* Moments That Inspire - Record Player Carousel */}
          <div className="pt-2 lg:pt-4">
            <div className="text-center mb-3 lg:mb-4">
              <div className="flex items-center justify-center gap-2 mb-2 lg:mb-3">
                <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-2.5 h-2.5 text-white" />
                </div>
                <h2 className="text-lg font-serif font-medium text-foreground">
                  Moments That Inspire
                </h2>
              </div>
              <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-xs mx-auto">
                Real stories from our community • Swipe to explore • Tap to be inspired
              </p>
            </div>
            
            {loading ? (
              /* Loading skeleton */
              <div className="text-center py-8">
                <div className="w-32 h-32 mx-auto bg-muted rounded-full animate-pulse mb-4">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-muted to-muted-foreground/20"></div>
                </div>
                <div className="h-3 bg-muted rounded w-24 mx-auto mb-2"></div>
                <div className="h-2 bg-muted rounded w-16 mx-auto"></div>
              </div>
            ) : (
              <MomentsCarousel 
                videos={publicVideos}
                onVideoSelect={() => {}} // MomentsCarousel handles its own modal
              />
            )}
          </div>
        </div>

        {/* Compact Quick Access */}
        {hasVideos && (
          <div className="text-center mb-3">
            <p className="text-sm text-muted-foreground">
              You've recorded {userStats.total} {userStats.total === 1 ? 'memory' : 'memories'}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Card 
            className="cursor-pointer transition-all duration-300 hover:shadow-comfort hover:scale-[1.01] shadow-gentle"
            onClick={() => navigate("/library")}
          >
            <CardContent className="p-3 lg:p-4 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Library className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-medium text-foreground text-sm">My Library</h4>
              <p className="text-xs text-muted-foreground mt-1">View & edit</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all duration-300 hover:shadow-comfort hover:scale-[1.01] shadow-gentle"
            onClick={() => navigate("/contacts")}
          >
            <CardContent className="p-3 lg:p-4 text-center">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <h4 className="font-medium text-foreground text-sm">Contacts</h4>
              <p className="text-xs text-muted-foreground mt-1">Manage recipients</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Detail Modal */}
      <VideoDetailModal
        video={selectedVideo}
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          setSelectedVideo(null);
        }}
      />

      {/* Inspired Video Modal - now handled within MomentsCarousel component */}
    </div>
  );
}
