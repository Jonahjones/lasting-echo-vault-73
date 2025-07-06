import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VideoPreviewProps {
  videoId: string;
  title: string;
  filePath: string | null;
  className?: string;
}

export function VideoPreview({ videoId, title, filePath, className = "" }: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const loadVideoUrl = async () => {
    if (!filePath) {
      setError("Video file not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError) {
        throw urlError;
      }

      if (data?.signedUrl) {
        setVideoUrl(data.signedUrl);
      } else {
        setError("Could not generate video URL");
      }
    } catch (err) {
      console.error('Error loading video URL:', err);
      setError("Failed to load video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadVideoUrl}
          className={`flex items-center space-x-2 ${className}`}
        >
          <Play className="w-4 h-4" />
          <span>Preview</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>Video Preview</span>
          </DialogTitle>
          <DialogDescription>
            {title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          ) : videoUrl ? (
            <video
              controls
              className="w-full h-full object-cover"
              preload="metadata"
            >
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Click Preview to load video
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}