import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shuffle, Heart, MessageCircle, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { VideoRecorder } from "@/components/VideoRecorder";
import { SaveMessageModal } from "@/components/SaveMessageModal";
import { useToast } from "@/hooks/use-toast";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";

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
  const { toast } = useToast();
  const { saveVideo } = useVideoLibrary();
  const navigate = useNavigate();

  const getRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * additionalPrompts.length);
    setRandomPrompt(additionalPrompts[randomIndex]);
    setSelectedPrompt(null); // Clear selected prompt if random is chosen
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
    setRecordingPrompt(undefined);
  };

  const handleSaveMessage = (data: any) => {
    if (videoBlob) {
      const videoDuration = "0:30"; // Default duration, you might want to calculate this
      
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
    setRecordingPrompt(undefined);
  };

  // Get current prompt text
  const getCurrentPrompt = () => {
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

      <div className="px-4 py-6 space-y-6 max-w-sm mx-auto">
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

        {/* Random Prompt Button */}
        <div className="flex justify-center">
          <Button 
            variant="warm" 
            size="lg" 
            onClick={getRandomPrompt}
            className="h-12 px-6 w-[90%]"
          >
            <Shuffle className="w-5 h-5 mr-2" />
            Random Prompt
          </Button>
        </div>

        {/* Random Prompt Display */}
        {randomPrompt && (
          <Card className="bg-accent/5 border-accent/20 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mt-1">
                  <Shuffle className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-2">Random Prompt</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {randomPrompt}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Prompt Display */}
        {selectedPrompt !== null && !randomPrompt && (
          <Card className="bg-primary/5 border-primary/20 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                  {(() => {
                    const IconComponent = recordingPrompts[selectedPrompt].icon;
                    return <IconComponent className="w-5 h-5 text-primary" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-2">
                    {recordingPrompts[selectedPrompt].title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {recordingPrompts[selectedPrompt].prompt}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guided Prompts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Choose a Prompt</CardTitle>
            <CardDescription>
              Get started with a guided message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recordingPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedPrompt(index);
                  setRandomPrompt(null); // Clear random prompt if guided is chosen
                }}
                className={`w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-card ${
                  selectedPrompt === index && !randomPrompt
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedPrompt === index && !randomPrompt
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}>
                    <prompt.icon className={`w-5 h-5 ${
                      selectedPrompt === index && !randomPrompt
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">
                      {prompt.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {prompt.prompt}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Recording Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Find a quiet, well-lit space</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Speak clearly and at a comfortable pace</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">30-second limit for each recording</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Remember, this is a gift of love</span>
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
