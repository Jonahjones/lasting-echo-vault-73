import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shuffle, Heart, MessageCircle, Clock, Lightbulb } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { VideoRecorder } from "@/components/VideoRecorder";
import { SaveMessageModal } from "@/components/SaveMessageModal";
import { useToast } from "@/hooks/use-toast";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const recordingPrompts = [
  {
    icon: Heart,
    title: "Share Your Love",
    prompt: "Tell them what they mean to you and how they've shaped your life."
  },
  {
    icon: MessageCircle,
    title: "Life Lessons",
    prompt: "What wisdom would you want them to carry forward?"
  },
  {
    icon: Clock,
    title: "Cherished Memories",
    prompt: "Share a favorite memory you have together."
  }
];

const additionalPrompts = [
  "What are you most proud of in your life?",
  "What advice would you give to your younger self?",
  "What do you hope people remember about you?",
  "What's the most important lesson life has taught you?",
  "What brings you the most joy?",
  "What would you want your loved ones to know about facing challenges?",
  "What traditions do you hope will continue in your family?",
  "What story from your childhood shaped who you became?",
  "What are you grateful for today?",
  "What would you want to say to someone having a difficult time?"
];

export default function Record() {
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
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

  // Check for prompt from notification navigation
  useEffect(() => {
    if (location.state?.prompt) {
      setDailyPrompt(location.state.prompt);
      setSelectedPrompt(null);
      setRandomPrompt(null);
    }
  }, [location.state]);

  const getRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * additionalPrompts.length);
    setRandomPrompt(additionalPrompts[randomIndex]);
    setSelectedPrompt(null); // Clear selected prompt if random is chosen
    setDailyPrompt(null); // Clear daily prompt if random is chosen
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
    setSelectedPrompt(null);
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
      
      saveVideo({
        title: data.title,
        description: data.description,
        prompt: recordingPrompt,
        videoBlob,
        duration: videoDuration,
        isPublic: data.isPublic || false,
        category: data.category || "wisdom"
      });

      toast({
        title: "Message Saved!",
        description: "Your video message has been saved to your library.",
      });
      
      // Navigate to library after saving
      navigate("/library");
    }
    
    setShowSaveModal(false);
    setVideoBlob(null);
    setSelectedPrompt(null);
    setRandomPrompt(null);
    setDailyPrompt(null);
    setRecordingPrompt(undefined);
  };

  // Get current prompt text
  const getCurrentPrompt = () => {
    if (dailyPrompt) return dailyPrompt;
    if (randomPrompt) return randomPrompt;
    if (selectedPrompt !== null) return recordingPrompts[selectedPrompt].prompt;
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
        {(dailyPrompt || randomPrompt || selectedPrompt !== null) && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center">
                {dailyPrompt && <Lightbulb className="w-3 h-3 text-primary" />}
                {randomPrompt && !dailyPrompt && <Shuffle className="w-3 h-3 text-primary" />}
                {selectedPrompt !== null && !randomPrompt && !dailyPrompt && 
                  (() => {
                    const IconComponent = recordingPrompts[selectedPrompt].icon;
                    return <IconComponent className="w-3 h-3 text-primary" />;
                  })()
                }
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

        {/* Compact Guided Prompts */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Choose a Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recordingPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedPrompt(index);
                  setRandomPrompt(null);
                  setDailyPrompt(null);
                }}
                className={`w-full p-3 rounded-md border text-left transition-all duration-200 hover:shadow-card ${
                  selectedPrompt === index && !randomPrompt && !dailyPrompt
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                    selectedPrompt === index && !randomPrompt && !dailyPrompt
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}>
                    <prompt.icon className={`w-4 h-4 ${
                      selectedPrompt === index && !randomPrompt && !dailyPrompt
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm mb-1">
                      {prompt.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {prompt.prompt}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

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
