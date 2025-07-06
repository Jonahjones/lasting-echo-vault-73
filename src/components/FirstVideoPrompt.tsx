import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Heart, ArrowRight, Sparkles, Clock, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BrandedLoader } from "@/components/BrandedLoader";
import { EmptyStateEncouragement } from "@/components/EmptyStateEncouragement";

export function FirstVideoPrompt() {
  const { user, refreshProfile } = useAuth();
  const { createFirstVideoCompleteNotification } = useNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Getting things ready…");

  // Handle loading message progression
  useEffect(() => {
    if (!isLoading) return;

    const messages = [
      "Getting things ready…",
      "Preparing your memory capture…",
      "Almost ready to record your special moment…"
    ];

    let messageIndex = 0;
    let hasShownPatience = false;

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    // Show patience message after 5 seconds
    const patienceTimeout = setTimeout(() => {
      if (!hasShownPatience) {
        setLoadingMessage("Thanks for your patience—your story is important to us.");
        hasShownPatience = true;
      }
    }, 5000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(patienceTimeout);
    };
  }, [isLoading]);

  const handleStartRecording = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Mark that the user has started their first video
      await supabase
        .from('profiles')
        .update({ first_video_recorded: true })
        .eq('user_id', user.id);

      // Refresh the profile to update local state
      await refreshProfile();

      // Navigate to the recording page
      navigate('/record');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipForNow = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ first_video_recorded: true })
        .eq('user_id', user.id);

      // Refresh the profile to update local state
      await refreshProfile();

      navigate('/');
    } catch (error) {
      console.error('Error updating profile:', error);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-comfort flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-gentle">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-light text-foreground">Memory Journal</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-2xl">
          <Card className="shadow-comfort border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center space-y-6 pb-8">
              <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-gentle">
                <Video className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="space-y-4">
                <CardTitle className="text-3xl font-serif font-light text-foreground leading-relaxed">
                  Ready to capture your first meaningful moment?
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
                  Take a moment to record something special. Whether it's words of wisdom, a cherished memory, gratitude, or simply "I love you" – your voice matters.
                </CardDescription>
              </div>
              
              {/* Inspiring prompts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Share Your Wisdom</p>
                    <p className="text-xs text-muted-foreground">Life lessons that inspire</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-accent/5 rounded-xl border border-accent/20">
                  <Clock className="w-6 h-6 text-accent-foreground flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Cherished Memory</p>
                    <p className="text-xs text-muted-foreground">A moment that brings joy</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Users className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Words of Gratitude</p>
                    <p className="text-xs text-muted-foreground">What you're thankful for today</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 px-8 pb-8">
              <div className="space-y-4">
                <Button 
                  onClick={handleStartRecording}
                  size="lg" 
                  disabled={isLoading}
                  className="w-full h-16 text-lg font-medium shadow-gentle hover:shadow-warm transition-all duration-300 hover:scale-[1.02]"
                >
                  {isLoading ? (
                    "Preparing..."
                  ) : (
                    <>
                      <Video className="w-6 h-6 mr-3" />
                      Capture Your First Memory
                      <ArrowRight className="w-6 h-6 ml-3" />
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleSkipForNow}
                  className="w-full h-12 text-base font-medium border-border/60 hover:border-primary/30 hover:bg-primary/5"
                >
                  I'll do this later
                </Button>
              </div>
              
              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Don't worry about being perfect. Your authentic voice and genuine emotions are what make these moments precious. You can always record more memories later.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-Screen Loading Overlay */}
      <BrandedLoader
        isVisible={isLoading}
        title="Memory Journal"
        messages={[
          "Getting things ready for your special moment…",
          "Preparing your memory capture experience…",
          "Almost ready to record your meaningful memory…"
        ]}
        showPatienceMessage={true}
      />
    </div>
  );
}