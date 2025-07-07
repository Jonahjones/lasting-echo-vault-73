import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, User, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoLikeButton } from "@/components/VideoLikeButton";
import { UserLevelBadge } from "@/components/gamification/UserLevelBadge";
import { format } from "date-fns";

interface VideoDetailModalProps {
  video: {
    id: string;
    title: string;
    description?: string;
    created_at: string;
    likes_count: number;
    user_id: string;
    file_path?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoDetailModal({ video, isOpen, onClose }: VideoDetailModalProps) {
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (video) {
      loadCreatorProfile();
      loadVideoUrl();
    }
  }, [video]);

  const loadVideoUrl = async () => {
    if (!video?.file_path) {
      setVideoLoading(false);
      setVideoError(true);
      return;
    }

    setVideoLoading(true);
    setVideoError(false);

    try {
      const { data } = supabase.storage
        .from('videos')
        .getPublicUrl(video.file_path);

      if (data?.publicUrl) {
        setVideoUrl(data.publicUrl);
      } else {
        setVideoError(true);
      }
    } catch (error) {
      console.error('Error loading video:', error);
      setVideoError(true);
    } finally {
      setVideoLoading(false);
    }
  };

  const loadCreatorProfile = async () => {
    if (!video) return;

    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, display_name, tagline')
      .eq('user_id', video.user_id)
      .single();

    setCreatorProfile(data);
  };

  if (!video) return null;

  const creatorName = creatorProfile?.display_name || 
    (creatorProfile?.first_name ? `${creatorProfile.first_name} ${creatorProfile.last_name || ''}`.trim() : 'Anonymous');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">{video.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Player */}
          <div className="aspect-video bg-muted rounded-xl overflow-hidden">
            {videoLoading ? (
              /* Loading State */
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Loading video...</p>
                </div>
              </div>
            ) : videoError || !videoUrl ? (
              /* Error State */
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2">Unable to load video</p>
                    <Button 
                      onClick={loadVideoUrl}
                      variant="outline" 
                      size="sm"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Video Player */
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
                onLoadStart={() => setVideoLoading(false)}
                onError={() => {
                  setVideoError(true);
                  setVideoLoading(false);
                }}
                poster={undefined}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Video Info */}
          <div className="space-y-4">
            {video.description && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{video.description}</p>
              </div>
            )}

            {/* Creator Info */}
            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{creatorName}</p>
                    {creatorProfile?.tagline && (
                      <p className="text-sm text-muted-foreground italic">"{creatorProfile.tagline}"</p>
                    )}
                  </div>
                  <UserLevelBadge 
                    userId={video.user_id} 
                    userName={creatorName}
                    size="sm" 
                  />
                </div>
              </div>
            </div>

            {/* Date and Like Section */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {format(new Date(video.created_at), "PPP")}
                </span>
              </div>

              <VideoLikeButton 
                videoId={video.id} 
                variant="default" 
                size="md" 
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}