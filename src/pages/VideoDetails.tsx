import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
      <div className="min-h-screen bg-background">
        {/* Minimal Header */}
        <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/record")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="text-lg font-medium text-foreground">Complete Your Message</h1>
            <div className="w-12"></div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-6 max-w-md mx-auto pb-24">
          {/* Storage Limit Banner */}
          <StorageLimitBanner 
            videoCount={videoCount}
            storageLimit={storageLimit}
            isAtLimit={isAtStorageLimit}
          />

          {/* Compact Video Preview */}
          <div className="aspect-video bg-muted rounded-xl overflow-hidden relative border border-border">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-cta/10 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Generating preview...</div>
              </div>
            )}
            <video ref={videoRef} className="hidden" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Input
              placeholder="Give your message a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium border-border/60 focus:border-primary h-12"
            />
            <Textarea
              placeholder="Add a description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] resize-none border-border/60 focus:border-primary"
            />
          </div>

          {/* Privacy Toggle - Prominent */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPublic ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
                  {isPublic ? '🌐' : '🔒'}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {isPublic ? 'Public Video' : 'Private Video'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isPublic ? 'Anyone can discover and view' : 'Only selected people can view'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={isPublic} 
                onCheckedChange={setIsPublic}
                className="data-[state=checked]:bg-accent"
              />
            </div>
          </div>

          {/* Delivery Options */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-foreground mb-4">Delivery Options</h3>
            
            {isPublic ? (
              <div className="space-y-3">
                <div 
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    deliveryOption === 'send-now' 
                      ? 'border-cta bg-cta/5 ring-1 ring-cta/20' 
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() => setDeliveryOption('send-now')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${deliveryOption === 'send-now' ? 'bg-cta' : 'bg-muted-foreground'}`} />
                    <span className="font-medium">Publish Now</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5">Share immediately to public feed</p>
                </div>
                
                <div 
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    deliveryOption === 'schedule' 
                      ? 'border-cta bg-cta/5 ring-1 ring-cta/20' 
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() => setDeliveryOption('schedule')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${deliveryOption === 'schedule' ? 'bg-cta' : 'bg-muted-foreground'}`} />
                    <span className="font-medium">Schedule for Later</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5">Set a future publish date</p>
                </div>
              </div>
            ) : (
              <ContactSelector
                selectedContacts={selectedContacts}
                onSelectionChange={setSelectedContacts}
                onContactsDataChange={setSelectedContactsData}
                isPublic={isPublic}
              />
            )}

            {deliveryOption === 'schedule' && (
              <div className="mt-4 pt-4 border-t border-border">
                <DeliveryScheduler
                  deliveryOption={deliveryOption}
                  scheduledDate={scheduledDate}
                  onDeliveryOptionChange={setDeliveryOption}
                  onScheduledDateChange={setScheduledDate}
                  selectedContactsCount={selectedContacts.length}
                  isPublic={isPublic}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              onClick={() => setShowConfirmation(true)}
              disabled={isLoading || !title.trim() || isAtStorageLimit}
              className="w-full h-14 text-lg font-medium shadow-lg"
            >
              {isLoading ? 'Saving...' : isAtStorageLimit ? 'Storage Limit Reached' : 'Share Video'}
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