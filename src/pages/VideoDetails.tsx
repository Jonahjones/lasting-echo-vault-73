import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { VideoSharingOptions } from "@/components/video-sharing/VideoSharingOptions";
import { ContactSelector } from "@/components/video-sharing/ContactSelector";
import { DeliveryScheduler, DeliveryOption } from "@/components/video-sharing/DeliveryScheduler";
import { VideoConfirmationModal } from "@/components/video-sharing/VideoConfirmationModal";
import { StorageLimitBanner } from "@/components/StorageLimitBanner";

interface VideoDetailsState {
  videoBlob: Blob;
  prompt?: string;
}

export default function VideoDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { saveVideo, videoCount, storageLimit, isAtStorageLimit } = useVideoLibrary();
  const { user } = useAuth();
  
  const state = location.state as VideoDetailsState;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  // New state for enhanced workflow
  const [isPublic, setIsPublic] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedContactsData, setSelectedContactsData] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('save-only');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!state?.videoBlob) {
      navigate("/record");
      return;
    }

    // Create video URL and capture thumbnail
    const videoUrl = URL.createObjectURL(state.videoBlob);
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
      videoRef.current.addEventListener('loadeddata', captureThumbnail);
    }

    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [state, navigate]);

  const captureThumbnail = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
        
        video.addEventListener('seeked', () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              setThumbnailUrl(thumbnailUrl);
            }
          }, 'image/jpeg', 0.8);
        }, { once: true });
      }
    }
  };

  const handleSaveVideo = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your video message.",
        variant: "destructive",
      });
      return;
    }

    if (isAtStorageLimit) {
      toast({
        title: "Storage Limit Reached",
        description: "You've reached your storage limit. Please upgrade to save more videos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const videoDuration = videoRef.current?.duration || 30;
      const formattedDuration = `${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toFixed(0).padStart(2, '0')}`;
      
      await saveVideo({
        title: title.trim(),
        description: description.trim(),
        prompt: state.prompt,
        videoBlob: state.videoBlob,
        duration: formattedDuration,
        isPublic,
        category: "love",
        scheduledDeliveryDate: deliveryOption === 'schedule' ? scheduledDate : undefined,
        sharedWithContacts: selectedContacts
      });

      toast({
        title: "Video Saved Successfully!",
        description: deliveryOption === 'schedule' && scheduledDate
          ? `Your video will be delivered on ${scheduledDate.toLocaleDateString()}`
          : "Your video has been saved to your library.",
      });
      
      navigate("/library");
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!state?.videoBlob) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4 max-w-sm mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/record")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">
                Complete Your Message
              </h1>
              <p className="text-sm text-muted-foreground">
                Set sharing and delivery options
              </p>
            </div>
            <div className="w-16"></div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6 max-w-sm mx-auto">
          {/* Storage Limit Banner */}
          <StorageLimitBanner 
            videoCount={videoCount}
            storageLimit={storageLimit}
            isAtLimit={isAtStorageLimit}
          />

          {/* Video Preview */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Your Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                {thumbnailUrl ? (
                  <img 
                    src={thumbnailUrl} 
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Generating thumbnail...</div>
                  </div>
                )}
              </div>
              <video ref={videoRef} className="hidden" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>

          {/* Message Details */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Message Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Give your message a meaningful title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add context about this message..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Options */}
          <VideoSharingOptions
            isPublic={isPublic}
            onVisibilityChange={setIsPublic}
          />

          {/* Contact Selection */}
          <ContactSelector
            selectedContacts={selectedContacts}
            onSelectionChange={setSelectedContacts}
            onContactsDataChange={setSelectedContactsData}
            isPublic={isPublic}
          />

          {/* Delivery Scheduler */}
          <DeliveryScheduler
            deliveryOption={deliveryOption}
            scheduledDate={scheduledDate}
            onDeliveryOptionChange={setDeliveryOption}
            onScheduledDateChange={setScheduledDate}
            selectedContactsCount={selectedContacts.length}
            isPublic={isPublic}
          />

          {/* Action Button */}
          <div className="pt-4">
            <Button
              size="lg"
              variant="legacy"
              onClick={() => setShowConfirmation(true)}
              disabled={isLoading || !title.trim() || isAtStorageLimit}
              className="w-full h-12"
            >
              {isAtStorageLimit ? "Storage Limit Reached" : "Review & Save Message"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <VideoConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleSaveVideo}
        onCancel={() => setShowConfirmation(false)}
        isLoading={isLoading}
        title={title}
        description={description}
        isPublic={isPublic}
        selectedContacts={selectedContactsData}
        deliveryOption={deliveryOption}
        scheduledDate={scheduledDate}
      />
    </>
  );
}