import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Video, Users, Library, Settings, Clock, MessageCircle, Play, Calendar, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState({ total: 0, scheduled: 0, delivered: 0 });
  const [publicVideos, setPublicVideos] = useState<any[]>([]);
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

        // Load inspiring public videos
        const { data: publicVids } = await supabase
          .from('videos')
          .select('id, title, description, created_at')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(5);

        setPublicVideos(publicVids || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

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
      <div className="pt-12 pb-8 px-6 max-w-lg mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-gentle animate-gentle-scale">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-light text-foreground mb-2">
            Hello, {displayProfile.first_name || 'Friend'} 👋
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Your stories can last forever
          </p>
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
            <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
              {isFirstTime ? "Start Your Legacy" : "Record a New Legacy Message"}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {isFirstTime 
                ? "Record your first message and begin creating memories that will last forever"
                : "Your words will bring comfort and wisdom to those you love"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inspirational Community Carousel */}
      {publicVideos.length > 0 && (
        <div className="mb-8">
          <div className="px-6 mb-4 max-w-lg mx-auto">
            <h2 className="text-lg font-serif font-medium text-foreground mb-2">
              Stories That Inspire
            </h2>
            <p className="text-sm text-muted-foreground">
              See how others are remembered
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <div className="flex space-x-4 px-6 max-w-lg mx-auto">
              {publicVideos.map((video) => (
                <Card 
                  key={video.id}
                  className="flex-shrink-0 w-64 shadow-gentle hover:shadow-comfort transition-all duration-300 cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="w-12 h-12 bg-gradient-accent rounded-2xl flex items-center justify-center mb-3">
                      <Play className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {video.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {video.description || "A meaningful message shared with love"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Your Journey Section */}
      <div className="px-6 space-y-4 max-w-lg mx-auto">
        <h2 className="text-lg font-serif font-medium text-foreground mb-4">
          Your Journey
        </h2>
        
        {hasVideos ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Progress Card */}
            <Card className="shadow-gentle bg-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Legacy Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      You've created {userStats.total} {userStats.total === 1 ? 'memory' : 'memories'}
                    </p>
                  </div>
                </div>
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
                      <h3 className="font-semibold text-foreground">Scheduled Messages</h3>
                      <p className="text-sm text-muted-foreground">
                        {userStats.scheduled} {userStats.scheduled === 1 ? 'message' : 'messages'} will be sent on special days
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
                        {userStats.delivered} {userStats.delivered === 1 ? 'message was' : 'messages were'} delivered
                      </p>
                    </div>
                  </div>
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
    </div>
  );
}
