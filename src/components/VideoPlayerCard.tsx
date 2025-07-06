import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Play, AlertCircle, LockOpen } from "lucide-react";
import { VideoLikeButton } from "@/components/VideoLikeButton";
import { supabase } from "@/integrations/supabase/client";

interface VideoPlayerCardProps {
  video: {
    id: string;
    title: string;
    description?: string;
    created_at: string;
    file_path?: string;
  };
  onClick?: () => void;
  className?: string;
}

export function VideoPlayerCard({ video, onClick, className = "" }: VideoPlayerCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Generate thumbnail or get video URL
  useEffect(() => {
    if (video.file_path) {
      generateThumbnail();
    }
  }, [video.file_path]);

  const generateThumbnail = async () => {
    if (!video.file_path) {
      setError("No video file available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(video.file_path, 3600);

      if (urlError) {
        throw urlError;
      }

      if (data?.signedUrl) {
        // For now, we'll use the video URL directly
        // In production, you might want to generate actual thumbnails
        setThumbnailUrl(data.signedUrl);
      } else {
        setError("Could not load video");
      }
    } catch (err) {
      console.error('Error loading video:', err);
      setError("Video unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      className={`flex-shrink-0 w-64 shadow-gentle hover:shadow-comfort transition-all duration-300 cursor-pointer hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4 relative">
        {/* Public Status Icon */}
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500/90 rounded-full flex items-center justify-center">
          <LockOpen className="w-3 h-3 text-white" />
        </div>
        
        {/* Video Thumbnail/Preview */}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">
                {error}
              </p>
            </div>
          ) : thumbnailUrl ? (
            <div className="relative w-full h-full">
              <video
                src={thumbnailUrl}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
                onError={() => setError("Video file unavailable")}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors">
                <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-gray-800 ml-1" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-gradient-accent rounded-2xl flex items-center justify-center">
              <Play className="w-6 h-6 text-accent-foreground" />
            </div>
          )}
        </div>

        <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
          {video.title}
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {video.description || "A meaningful message shared with love"}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
          <VideoLikeButton 
            videoId={video.id} 
            variant="inline" 
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}