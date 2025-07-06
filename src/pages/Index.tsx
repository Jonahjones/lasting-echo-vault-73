import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Video, Users, Library, Settings, Clock, MessageCircle, Play, Calendar, FileText, Sparkles, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { VideoLikeButton } from "@/components/VideoLikeButton";
import { ProfileSetup } from "@/components/ProfileSetup";
import { VideoPlayerCard } from "@/components/VideoPlayerCard";

export default function Index() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState({ total: 0, scheduled: 0, delivered: 0 });
  const [publicVideos, setPublicVideos] = useState<any[]>([]);
  const [displayedVideos, setDisplayedVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
          .select('id, title, description, created_at, likes_count, user_id, file_path, is_featured, is_public')
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

  const handleVideoClick = (video: any) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  // Show auth loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // Show loading state while data is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center">
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

  // Show profile setup if needed
  if (needsProfileSetup) {
    return (
      <ProfileSetup 
        onComplete={() => {
          // Refresh profile after setup
          window.location.reload();
        }} 
      />
    );
  }

  // If user exists and has complete profile, show dashboard
  const displayProfile = profile;

  const hasVideos = userStats.total > 0;
  const isFirstTime = !displayProfile.first_video_recorded;

  return (
    <div className="min-h-screen bg-gradient-comfort pb-20">
      {/* Compassionate Welcome Header */}
      <div className="pt-16 pb-12 px-6 max-w-lg mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-warm animate-gentle-scale">
            <Heart className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-serif font-light text-foreground mb-3">
            Hello, {displayProfile.first_name || 'Friend'} 👋
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            Capture life's meaningful moments
          </p>
          {!isFirstTime && (
            <p className="text-base text-muted-foreground/80 mt-2">
              Welcome back. What story will you share today?
            </p>
          )}
        </div>
      </div>

      {/* Primary Call to Action */}
      <div className="px-6 mb-8 max-w-lg mx-auto">
        <Card 
          className="cursor-pointer transition-all duration-300 hover:shadow-warm hover:scale-[1.02] border-0 shadow-comfort bg-gradient-subtle"
          onClick={() => navigate("/record")}
        >
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-warm">
              <Video className="w-10 h-10 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-serif font-semibold text-foreground mb-3">
              {isFirstTime ? "Start Your Memory Journal" : "Record a New Memory"}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              Capture moments that matter. Share wisdom, gratitude, and joy.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inspirational Community Carousel */}
      <div className="mb-8">
        <div className="px-6 mb-4 max-w-lg mx-auto">
          <h2 className="text-lg font-serif font-medium text-foreground mb-2">
            Moments That Inspire
          </h2>
          <p className="text-sm text-muted-foreground">
            See how others are sharing their stories
          </p>
        </div>
        
        {loading ? (
          /* Loading skeleton */
          <div className="flex space-x-4 px-6 max-w-lg mx-auto">
            {[1, 2].map((i) => (
              <Card key={i} className="flex-shrink-0 w-64 shadow-gentle animate-pulse">
                <CardContent className="p-4">
                  <div className="w-12 h-12 bg-muted rounded-2xl mb-3"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-1"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedVideos.length > 0 ? (
          <div className="flex space-x-4 px-6 max-w-lg mx-auto">
            {displayedVideos.map((video) => (
              <VideoPlayerCard
                key={video.id}
                video={video}
                onClick={() => handleVideoClick(video)}
              />
            ))}
          </div>
        ) : (
          /* No public videos fallback */
          <div className="px-6 max-w-lg mx-auto">
            <Card className="shadow-gentle bg-muted/20 border-dashed border-2 border-muted-foreground/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  No shared stories yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your story to inspire others!
                </p>
                <p className="text-xs text-muted-foreground">
                  Want to inspire others? Make your story public to share your wisdom
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Encourage Public Sharing */}
        {displayedVideos.length > 0 && (
          <div className="px-6 mt-4 max-w-lg mx-auto text-center">
            <p className="text-xs text-muted-foreground">
              Share your wisdom with the world—make your story public for others to see
            </p>
          </div>
        )}
      </div>

      {/* Your Journey Section */}
      <div className="px-6 space-y-4 max-w-lg mx-auto">
        <h2 className="text-lg font-serif font-medium text-foreground mb-4">
          Your Story Collection
        </h2>
        
        {hasVideos ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Legacy Stats Summary */}
            <Card className="shadow-gentle bg-gradient-subtle border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif font-semibold text-foreground mb-1">Your Memory Collection</h3>
                    <p className="text-sm text-muted-foreground">
                      You've captured {userStats.total} precious {userStats.total === 1 ? 'moment' : 'moments'}—keep sharing your story
                    </p>
                  </div>
                </div>
                
                {/* Progress visualization */}
                <div className="bg-muted rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((userStats.total / 10) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {userStats.total < 10 ? `${10 - userStats.total} more to reach your first milestone` : 'Amazing progress! 🎉'}
                </p>
              </CardContent>
            </Card>

            {/* Scheduled Messages */}
            {userStats.scheduled > 0 && (
              <Card className="shadow-gentle bg-card cursor-pointer hover:shadow-comfort transition-all duration-300"
                    onClick={() => navigate("/library")}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-accent rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Scheduled Stories</h3>
                      <p className="text-sm text-muted-foreground">
                        {userStats.scheduled} {userStats.scheduled === 1 ? 'story is' : 'stories are'} scheduled to be shared on special days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivered Messages */}
            {userStats.delivered > 0 && (
              <Card className="shadow-gentle bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Stories Shared</h3>
                      <p className="text-sm text-muted-foreground">
                        {userStats.delivered} meaningful {userStats.delivered === 1 ? 'story has' : 'stories have'} reached loved ones
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gentle Reminder for existing users */}
            {userStats.total > 0 && (
              <Card className="shadow-gentle bg-primary/5 border-primary/20">
                <CardContent className="p-6 text-center">
                  <h3 className="font-medium text-foreground mb-2">
                    {userStats.total === 1 
                      ? "Your first story is beautiful—what will you share next?" 
                      : "Your collection is growing—what moment sparked joy today?"
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Every story you capture becomes a gift of wisdom and connection
                  </p>
                  <Button 
                    onClick={() => navigate("/record")}
                    variant="outline"
                    className="bg-background/50 hover:bg-primary/10"
                  >
                    Capture Another Moment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Card 
                className="cursor-pointer transition-all duration-300 hover:shadow-comfort hover:scale-[1.02] shadow-gentle"
                onClick={() => navigate("/library")}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Library className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground text-sm">My Library</h4>
                  <p className="text-xs text-muted-foreground">View & edit</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all duration-300 hover:shadow-comfort hover:scale-[1.02] shadow-gentle"
                onClick={() => navigate("/contacts")}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <h4 className="font-medium text-foreground text-sm">Contacts</h4>
                  <p className="text-xs text-muted-foreground">Manage recipients</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Gentle Reminder for New Users */
          <Card className="shadow-gentle bg-gradient-subtle border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-serif font-semibold text-foreground mb-3">
                Ready to share a memory?
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Your words can last for generations. Every story you share becomes a precious gift for those who matter most.
              </p>
              <Button 
                onClick={() => navigate("/record")}
                className="bg-gradient-primary hover:shadow-warm transition-all duration-300"
              >
                Start Recording Today
              </Button>
            </CardContent>
          </Card>
        )}
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
    </div>
  );
}
