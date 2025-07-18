import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { VideoConfirmationModal } from "@/components/video-sharing/VideoConfirmationModal";
import { StorageLimitBanner } from "@/components/StorageLimitBanner";
import { supabase } from "@/integrations/supabase/client";

interface VideoDetailsState {
  videoBlob: Blob;
  prompt?: string;
}

interface Contact {
  id: string;
  full_name: string;
  email: string;
  contact_type: 'trusted' | 'regular';
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
  const [videoReady, setVideoReady] = useState(false);
  
  // Contact data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  
  // Simple delivery mode selector
  const [shareMode, setShareMode] = useState<'regular' | 'trusted'>('regular');
  
  // New state for enhanced workflow
  const [isPublic, setIsPublic] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedContactsData, setSelectedContactsData] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load contacts
  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    try {
      const { data: contactsData, error } = await (supabase as any).rpc('get_user_contacts_simple', {
        p_user_id: user?.id
      });

      if (error) {
        console.error('Error loading contacts:', error);
        setContacts([]);
        return;
      }

      if (contactsData) {
        const transformedContacts = contactsData.map((contact: any) => ({
          id: contact.user_contact_id,
          full_name: contact.contact_name,
          email: contact.contact_email,
          contact_type: contact.relationship_type
        }));
        setContacts(transformedContacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (!state?.videoBlob) {
      navigate("/record");
      return;
    }

    // Create video URL and capture thumbnail
    const videoUrl = URL.createObjectURL(state.videoBlob);
    if (videoRef.current) {
      const video = videoRef.current;
      video.src = videoUrl;
      video.addEventListener('loadeddata', captureThumbnail);
      
      // Hide thumbnail overlay when video can play
      video.addEventListener('canplay', () => {
        setVideoReady(true);
      });
      
      // Show controls when video is ready
      video.addEventListener('loadedmetadata', () => {
        video.controls = true;
      });
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
        ctx.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
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
        sharedWithContacts: selectedContacts,
        shareMode // Add the new shareMode field
      });

      toast({
        title: "🎉 Video Saved!",
        description: "Saved to library",
        duration: 3000, // Auto-dismiss after 3 seconds
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

  // Calculate contact counts
  const regularContacts = contacts.filter(c => c.contact_type === 'regular');
  const trustedContacts = contacts.filter(c => c.contact_type === 'trusted');

  if (!state?.videoBlob) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Frozen Header */}
        <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
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

        <div className="flex-1 overflow-y-auto pt-16">
          <div className="px-4 py-4 space-y-6 max-w-md mx-auto pb-24">
          {/* Storage Limit Banner */}
          <StorageLimitBanner 
            videoCount={videoCount}
            storageLimit={storageLimit}
            isAtLimit={isAtStorageLimit}
          />

          {/* Prompt Display */}
          {state.prompt && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">💭</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your prompt:</p>
                  <p className="text-sm text-foreground leading-relaxed">{state.prompt}</p>
                </div>
              </div>
            </div>
          )}

          {/* Video Preview with Playback */}
          <div className="aspect-video bg-muted rounded-xl overflow-hidden relative border border-border group">
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover"
              controls
              playsInline
              preload="metadata"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Fallback thumbnail while video loads */}
            {thumbnailUrl && !videoReady && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center video-loading">
                <img 
                  src={thumbnailUrl} 
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator when no thumbnail yet */}
            {!thumbnailUrl && !videoReady && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-cta/10 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading video...</div>
              </div>
            )}
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

          {/* Privacy Toggle - Enhanced */}
          <div className={`bg-card border rounded-xl p-4 transition-all duration-200 ${isPublic ? 'border-accent/50 bg-accent/5' : 'border-primary/50 bg-primary/5'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${isPublic ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
                  {isPublic ? '🌐' : '🔒'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {isPublic ? 'Public Video' : 'Private Video'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isPublic ? 'Anyone can discover and view' : 'Only selected people can view'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <Switch 
                  checked={isPublic} 
                  onCheckedChange={setIsPublic}
                  className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-primary"
                />
                <span className="text-xs text-muted-foreground">
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-foreground mb-4">Delivery Options</h3>
            
            <fieldset aria-label="Delivery Options">
              <legend className="sr-only">Choose delivery mode</legend>
              
              <RadioGroup 
                value={shareMode} 
                onValueChange={(value: 'regular' | 'trusted') => setShareMode(value)}
                className="space-y-3"
              >
                {/* Post to library */}
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="regular" id="share-regular" className="mt-0.5" />
                  <Label 
                    htmlFor="share-regular" 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Post to library</span>
                      <span className="text-sm text-muted-foreground">
                        ({loadingContacts ? '...' : regularContacts.length})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Video will be saved to your library and shared with regular contacts
                    </p>
                  </Label>
                </div>

                {/* Save to library for trusted contact release */}
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="trusted" id="share-trusted" className="mt-0.5" />
                  <Label 
                    htmlFor="share-trusted" 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Save to library for trusted contact release</span>
                      <span className="text-sm text-muted-foreground">
                        ({loadingContacts ? '...' : trustedContacts.length})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Video will be saved to library and released by trusted contacts upon confirmation
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              <p className="text-xs text-muted-foreground mt-3 text-center">
                Videos are saved to your library and shared based on your privacy settings.
              </p>
            </fieldset>
          </div>
          </div>
        </div>

        {/* Sticky CTA Button - Above Footer */}
        <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              onClick={() => setShowConfirmation(true)}
              disabled={isLoading || !title.trim() || isAtStorageLimit}
              className="w-full h-14 text-lg font-medium shadow-lg"
            >
              {isLoading ? 'Saving...' : isAtStorageLimit ? 'Storage Limit Reached' : 'Complete & Save'}
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
        deliveryOption={'save-only'}
        scheduledDate={undefined}
        shareMode={shareMode}
        regularContactsCount={regularContacts.length}
        trustedContactsCount={trustedContacts.length}
      />
    </>
  );
}