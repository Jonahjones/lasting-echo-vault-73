import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Video, Users, Library, Settings, Clock, MessageCircle, Play, Calendar, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VideoDetailModal } from "@/components/VideoDetailModal";

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

  // Load user stats and public videos
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

        // Load inspiring public videos (prioritize recent and most-liked)
        const { data: publicVids } = await supabase
          .from('videos')
          .select('id, title, description, created_at, likes_count, user_id')
          .eq('is_public', true)
          .order('likes_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        setPublicVideos(publicVids || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
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

  // If user exists but no profile, show basic dashboard
  const displayProfile = profile || {
    first_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Friend',
    tagline: null,
    first_video_recorded: false
  };

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
            Your stories can last forever
          </p>
          {!isFirstTime && (
            <p className="text-base text-muted-foreground/80 mt-2">
              Welcome back. Ready to share a memory?
            </p>
          )}
        </div>

        {displayProfile.tagline && (
          <Card className="mb-8 bg-primary/5 border-primary/20 shadow-gentle">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-foreground italic leading-relaxed">
                  "{displayProfile.tagline}"
                </p>
              </div>
            </CardContent>
          </Card>
        )}
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
              {isFirstTime ? "Start Your Legacy" : "Record a New Legacy Message"}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              {isFirstTime 
                ? "Your words can last for generations. Start recording today."
                : "Your words will bring comfort and wisdom to those you love"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inspirational Community Carousel */}
      <div className="mb-8">
        <div className="px-6 mb-4 max-w-lg mx-auto">
          <h2 className="text-lg font-serif font-medium text-foreground mb-2">
            Stories That Inspire
          </h2>
          <p className="text-sm text-muted-foreground">
            See how others are remembered
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
              <Card 
                key={video.id}
                className="flex-shrink-0 w-64 shadow-gentle hover:shadow-comfort transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                onClick={() => handleVideoClick(video)}
              >
                <CardContent className="p-4">
                  <div className="w-12 h-12 bg-gradient-accent rounded-2xl flex items-center justify-center mb-3">
                    <Play className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
                    {video.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {video.description || "A meaningful message shared with love"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{video.likes_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  No public memories here yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Make your message public to inspire others!
                </p>
                <p className="text-xs text-muted-foreground">
                  Want to inspire others? Mark your message public in the details screen!
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Encourage Public Sharing */}
        {displayedVideos.length > 0 && (
          <div className="px-6 mt-4 max-w-lg mx-auto text-center">
            <p className="text-xs text-muted-foreground">
              Share your story with the world—make your message public for others to see
            </p>
          </div>
        )}
      </div>

      {/* Your Journey Section */}
      <div className="px-6 space-y-4 max-w-lg mx-auto">
        <h2 className="text-lg font-serif font-medium text-foreground mb-4">
          Your Journey
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
                    <h3 className="font-serif font-semibold text-foreground mb-1">Your Legacy Journey</h3>
                    <p className="text-sm text-muted-foreground">
                      You've left {userStats.total} precious {userStats.total === 1 ? 'memory' : 'memories'}—keep building your story
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
                      <h3 className="font-semibold text-foreground">Future Messages</h3>
                      <p className="text-sm text-muted-foreground">
                        {userStats.scheduled} {userStats.scheduled === 1 ? 'message will' : 'messages will'} be delivered on special days
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
                      <h3 className="font-semibold text-foreground">Messages Delivered</h3>
                      <p className="text-sm text-muted-foreground">
                        {userStats.delivered} precious {userStats.delivered === 1 ? 'message has' : 'messages have'} reached loved ones
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
                      ? "Your first memory is precious—consider adding another" 
                      : "Your memories are growing—what story will you share next?"
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Every message you create becomes a treasure for future generations
                  </p>
                  <Button 
                    onClick={() => navigate("/record")}
                    variant="outline"
                    className="bg-background/50 hover:bg-primary/10"
                  >
                    Record Another Memory
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
