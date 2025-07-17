import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Video, AlertCircle, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * VideoThumbnailPreview - Enhanced Video Thumbnail Component for Admin Moderation
 * 
 * Features:
 * - Automatic thumbnail generation from video frame at 2 seconds
 * - Quick-play functionality (3-second preview on hover/tap)
 * - Lazy loading with Intersection Observer for performance
 * - In-memory caching of video URLs and thumbnails
 * - Optimized for fast scrolling in admin panels
 * - Accessible with proper alt text and ARIA labels
 * - Consistent with user-facing video card styling
 * - Mobile-optimized with touch events
 * - Automatic cache cleanup to prevent memory leaks
 */
interface VideoThumbnailPreviewProps {
  videoId: string;
  title: string;
  filePath: string | null;
  className?: string;
  showQuickPlay?: boolean;
  aspectRatio?: "video" | "square";
  priority?: boolean; // For above-the-fold content
}

// Simple in-memory cache for video URLs to avoid repeated Supabase calls
const videoUrlCache = new Map<string, string>();
const thumbnailCache = new Map<string, string>();

// Cache cleanup to prevent memory leaks
const MAX_CACHE_SIZE = 100;

const cleanupCache = (cache: Map<string, string>) => {
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    // Remove oldest 20 entries
    for (let i = 0; i < 20; i++) {
      const [key, value] = entries[i];
      if (value.startsWith('blob:')) {
        URL.revokeObjectURL(value);
      }
      cache.delete(key);
    }
  }
};

export function VideoThumbnailPreview({ 
  videoId, 
  title, 
  filePath, 
  className = "",
  showQuickPlay = true,
  aspectRatio = "video",
  priority = false
}: VideoThumbnailPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isHovering, setIsHovering] = useState(false);
  const [isQuickPlaying, setIsQuickPlaying] = useState(false);
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quickPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!priority && containerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        },
        { 
          rootMargin: '100px', // Start loading 100px before coming into view
          threshold: 0.1 
        }
      );

      observerRef.current.observe(containerRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Load video URL and generate thumbnail only when in view
  useEffect(() => {
    if (isInView && filePath) {
      loadVideoUrl();
    } else if (!filePath) {
      setError("No video file available");
      setLoading(false);
    }
  }, [filePath, isInView]);

  const loadVideoUrl = useCallback(async () => {
    if (!filePath) {
      setError("Video file not found");
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `${filePath}-${videoId}`;
    const cachedUrl = videoUrlCache.get(cacheKey);
    const cachedThumbnail = thumbnailCache.get(cacheKey);

    if (cachedUrl) {
      setVideoUrl(cachedUrl);
      if (cachedThumbnail) {
        setThumbnailUrl(cachedThumbnail);
        setThumbnailGenerated(true);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError) {
        throw new Error(`Failed to generate video URL: ${urlError.message}`);
      }

      if (data?.signedUrl) {
        setVideoUrl(data.signedUrl);
        // Cache the URL for future use
        videoUrlCache.set(cacheKey, data.signedUrl);
        cleanupCache(videoUrlCache);
      } else {
        setError("Could not generate video URL");
      }
    } catch (err) {
      console.error('Error loading video URL:', err);
      setError("Video unavailable");
    } finally {
      setLoading(false);
    }
  }, [filePath, videoId]);

  // Generate thumbnail from video at 2 seconds
  const generateThumbnail = () => {
    if (!videoRef.current || !canvasRef.current || thumbnailGenerated) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and create thumbnail URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setThumbnailUrl(url);
          setThumbnailGenerated(true);
          
          // Cache the thumbnail
          const cacheKey = `${filePath}-${videoId}`;
          thumbnailCache.set(cacheKey, url);
          cleanupCache(thumbnailCache);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  };

  // Handle video metadata loaded (seek to 2 seconds for thumbnail)
  const handleLoadedMetadata = () => {
    if (videoRef.current && !thumbnailGenerated) {
      // Seek to 2 seconds for better thumbnail
      videoRef.current.currentTime = Math.min(2, videoRef.current.duration || 0);
    }
  };

  // Handle video seek completed (generate thumbnail)
  const handleSeeked = () => {
    if (!thumbnailGenerated) {
      generateThumbnail();
    }
  };

  // Quick play functionality
  const startQuickPlay = () => {
    if (!videoRef.current || !showQuickPlay || isQuickPlaying) return;

    setIsQuickPlaying(true);
    videoRef.current.currentTime = 0;
    videoRef.current.muted = true; // Ensure muted for autoplay
    videoRef.current.play().catch(console.error);

    // Stop after 3 seconds
    quickPlayTimeoutRef.current = setTimeout(() => {
      stopQuickPlay();
    }, 3000);
  };

  const stopQuickPlay = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = Math.min(2, videoRef.current.duration || 0);
    }
    setIsQuickPlaying(false);
    if (quickPlayTimeoutRef.current) {
      clearTimeout(quickPlayTimeoutRef.current);
    }
  };

  // Handle mouse events for quick play
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (showQuickPlay && !isQuickPlaying && videoUrl && !error) {
      startQuickPlay();
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (isQuickPlaying) {
      stopQuickPlay();
    }
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsHovering(true);
    if (showQuickPlay && !isQuickPlaying && videoUrl && !error) {
      startQuickPlay();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsHovering(false);
    if (isQuickPlaying) {
      stopQuickPlay();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (quickPlayTimeoutRef.current) {
        clearTimeout(quickPlayTimeoutRef.current);
      }
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  const aspectClasses = aspectRatio === "video" ? "aspect-video" : "aspect-square";

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted group cursor-pointer",
        aspectClasses,
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hidden video element for thumbnail generation and quick play */}
      {videoUrl && isInView && (
        <video
          ref={videoRef}
          src={videoUrl}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isQuickPlaying ? "opacity-100" : "opacity-0"
          )}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onError={() => setError("Video playback failed")}
        />
      )}

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Thumbnail display */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No Preview</p>
        </div>
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Video preview for ${title}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {/* Play button overlay */}
      {!loading && !error && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-200",
          isQuickPlaying ? "bg-black/20" : "bg-black/40 group-hover:bg-black/20"
        )}>
          <div className={cn(
            "w-12 h-12 bg-white/90 rounded-full flex items-center justify-center transition-all duration-200",
            isHovering ? "scale-110" : "scale-100"
          )}>
            {isQuickPlaying ? (
              <Pause className="w-6 h-6 text-gray-800" />
            ) : (
              <Play className="w-6 h-6 text-gray-800 ml-1" />
            )}
          </div>
        </div>
      )}

      {/* Quick play indicator */}
      {showQuickPlay && isQuickPlaying && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-cta text-cta-foreground text-xs font-medium rounded-full">
          Preview
        </div>
      )}
    </div>
  );
} 