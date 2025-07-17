import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shuffle, Lightbulb } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { VideoRecorder } from "@/components/VideoRecorder";
import { SaveMessageModal } from "@/components/SaveMessageModal";
import { useToast } from "@/hooks/use-toast";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGeneralPrompts, useRandomPrompt } from "@/contexts/PromptsContext";



export default function Record() {
  const [randomPrompt, setRandomPrompt] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordingPrompt, setRecordingPrompt] = useState<string | undefined>(undefined);
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null);
  const { toast } = useToast();
  const { saveVideo } = useVideoLibrary();
  const { createFirstVideoCompleteNotification } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get dynamic prompts from context
  const generalPrompts = useGeneralPrompts();
  const getRandomPromptFromContext = useRandomPrompt;

  // Check for prompt from navigation (state or URL params)
  useEffect(() => {
    // First check location state (from notifications)
    if (location.state?.prompt) {
      setDailyPrompt(location.state.prompt);
      setRandomPrompt(null);
      return;
    }

    // Then check URL search parameters (from Moments That Inspire)
    const searchParams = new URLSearchParams(location.search);
    const urlPrompt = searchParams.get('prompt');
    if (urlPrompt) {
      setDailyPrompt(urlPrompt);
      setRandomPrompt(null);
      
      // Show a toast to let user know the prompt was loaded
      toast({
        title: "✨ Prompt Loaded",
        description: "Ready to record your response to this inspiring prompt!",
        duration: 3000,
      });
    }
  }, [location.state, location.search, toast]);

  const getRandomPrompt = () => {
    const randomPromptData = getRandomPromptFromContext('general');
    if (randomPromptData) {
      setRandomPrompt(randomPromptData.prompt_text);
      setDailyPrompt(null); // Clear daily prompt if random is chosen
    } else {
      // Fallback if no prompts available
      setRandomPrompt("What's something meaningful you'd like to share?");
      setDailyPrompt(null);
    }
  };

  const handleVideoSave = (blob: Blob, prompt?: string) => {
    navigate("/video-details", {
      state: {
        videoBlob: blob,
        prompt: prompt
      }
    });
  };

  const handleVideoDiscard = () => {
    setVideoBlob(null);
    setRandomPrompt(null);
    setDailyPrompt(null);
    setRecordingPrompt(undefined);
  };

  const handleSaveMessage = async (data: any) => {
    if (videoBlob) {
      const videoDuration = "0:30"; // Default duration, you might want to calculate this
      
      // Check if this is user's first video by counting existing videos
      const { data: existingVideos, error: countError } = await supabase
        .from('videos')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      const isFirstVideo = !countError && (existingVideos?.length === 0);
      
      // Check if this is from a daily prompt
      const isFromDailyPrompt = location.state?.isPromptOfTheDay === true || 
                               (dailyPrompt && recordingPrompt === dailyPrompt);
      
      saveVideo({
        title: data.title,
        description: data.description,
        prompt: recordingPrompt,
        videoBlob,
        duration: videoDuration,
        isPublic: data.isPublic || false,
        category: data.category || "wisdom",
        isPromptOfTheDay: isFromDailyPrompt
      });

      toast({
        title: "Message Saved!",
        description: "Your video message has been saved to your library.",
      });
      
      // Set celebration flag with XP info and navigate home
      sessionStorage.setItem('recording_completed', 'true');
      if (isFirstVideo) {
        sessionStorage.setItem('first_video_completed', 'true');
      }
      navigate("/");
    }
    
    setShowSaveModal(false);
    setVideoBlob(null);
    setRandomPrompt(null);
    setDailyPrompt(null);
    setRecordingPrompt(undefined);
  };

  // Get current prompt text
  const getCurrentPrompt = () => {
    if (dailyPrompt) return dailyPrompt;
    if (randomPrompt) return randomPrompt;
    return undefined;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header with Back Button */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 max-w-sm mx-auto">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Create Your Message
            </h1>
            <p className="text-sm text-muted-foreground">
              Share what matters most
            </p>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-sm mx-auto">
        {/* Video Recorder */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <VideoRecorder 
              onSave={handleVideoSave} 
              onDiscard={handleVideoDiscard} 
              selectedPrompt={getCurrentPrompt()}
            />
          </CardContent>
        </Card>

        {/* Compact Prompt Display */}
        {(dailyPrompt || randomPrompt) && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center">
                {dailyPrompt && <Lightbulb className="w-3 h-3 text-primary" />}
                {randomPrompt && !dailyPrompt && <Shuffle className="w-3 h-3 text-primary" />}
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-2">
                {getCurrentPrompt()}
              </p>
            </div>
          </div>
        )}

        {/* Random Prompt Button */}
        <Button 
          variant="warm" 
          size="sm" 
          onClick={getRandomPrompt}
          className="w-full h-10"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Get Random Prompt
        </Button>



        {/* Compact Tips */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Find quiet, well-lit space</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Speak clearly, comfortable pace</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">30-second limit per recording</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Message Modal */}
      <SaveMessageModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveMessage}
        videoBlob={videoBlob}
      />
    </div>
  );
}
