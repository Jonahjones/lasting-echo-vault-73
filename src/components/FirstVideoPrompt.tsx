import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Heart, ArrowRight, Sparkles, Clock, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function FirstVideoPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartRecording = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Mark that the user has started their first video
      await supabase
        .from('profiles')
        .update({ first_video_recorded: true })
        .eq('user_id', user.id);

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
          <h1 className="text-2xl font-serif font-light text-foreground">One Final Moment</h1>
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
                  Ready to create your first legacy message?
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
                  Take a moment to record something meaningful for your loved ones. Whether it's words of wisdom, a cherished memory, or simply "I love you" – your voice matters.
                </CardDescription>
              </div>
              
              {/* Inspiring prompts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Share Your Wisdom</p>
                    <p className="text-xs text-muted-foreground">Life lessons you've learned</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-accent/5 rounded-xl border border-accent/20">
                  <Clock className="w-6 h-6 text-accent-foreground flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Cherished Memory</p>
                    <p className="text-xs text-muted-foreground">A special moment to preserve</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Users className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Words of Love</p>
                    <p className="text-xs text-muted-foreground">Express your feelings</p>
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
                      Start Recording Your First Message
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
                  Don't worry about being perfect. Your authentic voice and genuine emotions are what make these messages precious. You can always record more messages later.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}