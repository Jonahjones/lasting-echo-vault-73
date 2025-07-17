import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Lightbulb, User, Video, ArrowRight, Play, MessageCircle, Users, Volume2, VolumeX, Pause, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VideoPreviewProps {
  video: Video;
  isActive: boolean;
  isInView: boolean;
  onVideoClick: (video: Video) => void;
  shouldPause: boolean;
  playingVideoId: string | null;
  onPlayStateChange: (videoId: string, isPlaying: boolean, position?: number) => void;
}

// Sound preference storage utilities
const SOUND_PREFERENCE_KEY = 'video-sound-preference';
const VIDEO_POSITIONS_KEY = 'video-positions';

const getSoundPreference = (): boolean => {
  const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
  return stored !== null ? JSON.parse(stored) : true; // Default to sound enabled
};

const setSoundPreference = (enabled: boolean): void => {
  localStorage.setItem(SOUND_PREFERENCE_KEY, JSON.stringify(enabled));
};

const getVideoPositions = (): Record<string, number> => {
  const stored = localStorage.getItem(VIDEO_POSITIONS_KEY);
  return stored ? JSON.parse(stored) : {};
};

const setVideoPosition = (videoId: string, position: number): void => {
  const positions = getVideoPositions();
  positions[videoId] = position;
  localStorage.setItem(VIDEO_POSITIONS_KEY, JSON.stringify(positions));
};

function VideoPreview({ video, isActive, isInView, onVideoClick, shouldPause, playingVideoId, onPlayStateChange }: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(getSoundPreference());
  const [showSoundTooltip, setShowSoundTooltip] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load video URL when in view
  useEffect(() => {
    if (!isInView || !video?.file_path) return;

    const loadVideoUrl = async () => {
      try {
        const { data } = supabase.storage
          .from('videos')
          .getPublicUrl(video.file_path);

        if (data?.publicUrl) {
          setVideoUrl(data.publicUrl);
        }
      } catch (error) {
        console.error('Error loading video:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideoUrl();
  }, [video, isInView]);

  // Handle external pause requests
  useEffect(() => {
    if (shouldPause && isPlaying) {
      pauseVideo();
    }
  }, [shouldPause]);

  // Restore video position when video loads
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const positions = getVideoPositions();
      const savedPosition = positions[video.id];
      if (savedPosition) {
        videoRef.current.currentTime = savedPosition;
        setCurrentTime(savedPosition);
      }
    }
  }, [videoUrl, video.id]);

  // Auto-hide controls after 2.5 seconds
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500); // 2.5 seconds
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const pauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange(video.id, false, videoRef.current.currentTime);
      setVideoPosition(video.id, videoRef.current.currentTime);
    }
  };

  const playVideo = async () => {
    if (!videoRef.current || !videoUrl || hasError) return;

    try {
      setIsBuffering(true);
      
      // Set muted state based on user preference
      videoRef.current.muted = !soundEnabled;
      
      // Reset to saved position
      const positions = getVideoPositions();
      const savedPosition = positions[video.id];
      if (savedPosition) {
        videoRef.current.currentTime = savedPosition;
      } else {
        videoRef.current.currentTime = 0;
      }

      await videoRef.current.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
      onPlayStateChange(video.id, true, videoRef.current.currentTime);
      
    } catch (error) {
      console.error('Play failed:', error);
      setAutoplayBlocked(true);
      setShowSoundTooltip(true);
      setTimeout(() => setShowSoundTooltip(false), 3000);
    } finally {
      setIsBuffering(false);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      await playVideo();
    }
  };

  const toggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    setSoundPreference(newSoundState);
    
    if (videoRef.current) {
      videoRef.current.muted = !newSoundState;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setVideoPosition(video.id, newTime);
  };

  // Video event handlers
  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsLoading(false);
    setIsBuffering(false);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && duration > 0) {
      const progress = (video.currentTime / duration) * 100;
      setProgress(progress);
      setCurrentTime(video.currentTime);
      
      // Save position every few seconds
      if (Math.floor(video.currentTime) % 3 === 0) {
        setVideoPosition(video.id, video.currentTime);
      }
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setIsBuffering(false);
    onPlayStateChange(video.id, false, videoRef.current?.currentTime || 0);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    onPlayStateChange(video.id, true, videoRef.current?.currentTime || 0);
  };

  const handleVideoWaiting = () => {
    setIsBuffering(true);
  };

  const handleVideoCanPlay = () => {
    setIsBuffering(false);
  };

  // Desktop hover handlers
  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowControls(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setShowControls(false);
    }
  };

  // Mobile tap handler for video area (not controls)
  const handleVideoAreaClick = (e: React.MouseEvent) => {
    // Don't handle clicks on controls
    if ((e.target as HTMLElement).closest('[data-controls]')) {
      return;
    }
    
    if (isMobile) {
      e.stopPropagation();
      setShowControls(true);
      // Auto-hide after showing controls
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    } else {
      onVideoClick(video);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`w-full h-full relative overflow-hidden cursor-pointer group transition-all duration-500 ${
        isPlaying ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/25' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleVideoAreaClick}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Video element */}
      {videoUrl && isInView && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onTimeUpdate={handleTimeUpdate}
          onPause={handleVideoPause}
          onPlay={handleVideoPlay}
          onWaiting={handleVideoWaiting}
          onCanPlay={handleVideoCanPlay}
        />
      )}

      {/* Minimal video overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

      {/* Top overlay - Prompt icon and Featured badge */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-500/90 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Lightbulb className="w-3 h-3 text-white" />
          </div>
          {video.prompt && (
            <div className="max-w-32 px-2 py-1 bg-black/40 rounded-full backdrop-blur-sm">
              <span className="text-xs text-white/90 truncate">Prompt</span>
            </div>
          )}
        </div>
        <div className="px-2 py-1 bg-green-500/90 rounded-full backdrop-blur-sm">
          <span className="text-xs text-white font-medium">Featured</span>
        </div>
      </div>

      {/* Subtle corner controls (bottom-right) */}
      {(showControls || (!isPlaying && !isLoading)) && (
        <div className="absolute bottom-2 right-2">
          <TooltipProvider>
            <Tooltip open={showSoundTooltip}>
              <TooltipTrigger asChild>
                <div data-controls className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1.5 transition-all duration-300 hover:bg-black/50">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="h-6 w-6 p-0 text-white/90 hover:text-white hover:bg-white/20 rounded-full"
                  >
                    {isBuffering ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3 ml-0.5" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSound();
                    }}
                    className="h-6 w-6 p-0 text-white/90 hover:text-white hover:bg-white/20 rounded-full"
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-3 h-3" />
                    ) : (
                      <VolumeX className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {autoplayBlocked ? "Tap to enable sound" : isPlaying ? "Video controls" : "Play video"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Progress bar at bottom (ultra-thin line) */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0">
          <div 
            className="w-full h-0.5 bg-white/15 cursor-pointer hover:h-1 transition-all duration-200"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-white/80 transition-all duration-200 ease-out rounded-r-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom overlay - Title (minimal, only show when needed) */}
      {!isPlaying && (
        <div className="absolute bottom-2 left-3 right-16">
          <h4 className="text-sm font-medium text-white line-clamp-1 leading-tight text-shadow-sm">
            {video.title}
          </h4>
        </div>
      )}

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}

interface Video {
  id: string;
  title: string;
  file_path: string;
  user_id: string;
  likes_count: number;
  prompt?: string;
}

interface PromptPreviewProps {
  prompt?: string;
  isActive: boolean;
  isAdmin?: boolean;
  videoId?: string;
}

function PromptPreview({ prompt, isActive, isAdmin, videoId }: PromptPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!prompt || prompt.trim() === '') {
    return (
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
            Prompt coming soon!
          </span>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => {
                // Navigate to admin panel for prompt assignment
                window.location.href = `/admin?assign=${videoId}`;
              }}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Assign
            </Button>
          )}
        </div>
      </div>
    );
  }

  const shouldTruncate = prompt.length > 80;
  const displayText = isExpanded || !shouldTruncate ? prompt : `${prompt.slice(0, 80)}...`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {displayText}
      </p>
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 p-0 text-xs text-amber-600 dark:text-amber-400 hover:bg-transparent"
        >
          {isExpanded ? 'Show less' : 'Show prompt'}
        </Button>
      )}
    </div>
  );
}

interface VideoModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordYourOwn: (prompt: string) => void;
}

function EnhancedVideoModal({ video, isOpen, onClose, onRecordYourOwn }: VideoModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [promptStats, setPromptStats] = useState<{ responseCount: number; recentResponses: any[] }>({ 
    responseCount: 0, 
    recentResponses: [] 
  });
  const [showSimilarPrompts, setShowSimilarPrompts] = useState(false);

  useEffect(() => {
    if (video && isOpen) {
      loadVideoUrl();
      loadCreatorProfile();
      loadPromptStats();
    }
  }, [video, isOpen]);

  const loadVideoUrl = async () => {
    if (!video?.file_path) {
      setLoading(false);
      return;
    }

    try {
      const { data } = supabase.storage
        .from('videos')
        .getPublicUrl(video.file_path);

      if (data?.publicUrl) {
        setVideoUrl(data.publicUrl);
      }
    } catch (error) {
      console.error('Error loading video:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreatorProfile = async () => {
    if (!video) return;

    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, display_name, avatar_url')
      .eq('user_id', video.user_id)
      .single();

    setCreatorProfile(data);
  };

  const loadPromptStats = async () => {
    if (!video?.prompt || video.prompt.trim() === '') {
      setPromptStats({ responseCount: 0, recentResponses: [] });
      return;
    }

    try {
      // Get count of videos with the same prompt
      const { data: promptVideos, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          created_at,
          profiles!videos_user_id_fkey (
            display_name,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('prompt', video.prompt)
        .neq('id', video.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setPromptStats({
        responseCount: promptVideos?.length || 0,
        recentResponses: promptVideos || []
      });
    } catch (error) {
      console.error('Error loading prompt stats:', error);
      setPromptStats({ responseCount: 0, recentResponses: [] });
    }
  };

  const creatorName = creatorProfile?.display_name || 
    (creatorProfile?.first_name ? `${creatorProfile.first_name} ${creatorProfile.last_name || ''}`.trim() : 'Anonymous');

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-auto p-0 overflow-hidden max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-6 border-b border-amber-200/30 dark:border-amber-800/30">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Moment That Inspires</span>
              {video.prompt && video.prompt.trim() !== '' && promptStats.responseCount > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                  {promptStats.responseCount} people inspired by this prompt
                </span>
              )}
              {(!video.prompt || video.prompt.trim() === '') && (
                <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                  Prompt assignment needed
                </span>
              )}
            </div>
            <DialogTitle className="text-2xl font-serif text-foreground leading-tight">{video.title}</DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 animate-pulse flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
                playsInline
                preload="auto"
                controlsList="nodownload"
                muted={false}
                autoFocus
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Video unavailable</p>
              </div>
            )}
          </div>

          {/* Prompt Section - Prominently Displayed */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6 rounded-2xl border-2 border-amber-200/50 dark:border-amber-800/30 shadow-lg">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  The Inspiring Prompt
                </h3>
              </div>
              
              {video.prompt && video.prompt.trim() !== '' ? (
                <div className="space-y-4">
                  <p className="text-amber-900 dark:text-amber-100 text-base leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                    "{video.prompt}"
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => onRecordYourOwn(video.prompt!)}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Record Your Own Story
                    </Button>
                    
                    {promptStats.responseCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowSimilarPrompts(!showSimilarPrompts)}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/20"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        See {promptStats.responseCount} Other Responses
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lightbulb className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-red-700 dark:text-red-300 font-medium">
                      This video doesn't have a prompt assigned yet.
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                      Admins can assign a prompt to make this video part of the inspiration experience.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300"
                      onClick={() => {
                        console.log(`Admin needs to assign prompt for video ${video.id}`);
                        window.location.href = `/admin?assignPrompt=${video.id}`;
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Assign Prompt (Admin)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar Prompt Responses */}
          {showSimilarPrompts && promptStats.recentResponses.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-amber-600" />
                Other responses to this prompt
              </h4>
              <div className="grid gap-3">
                {promptStats.recentResponses.map((response: any) => (
                  <div key={response.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{response.title}</p>
                      <p className="text-xs text-muted-foreground">
                        by {response.profiles?.display_name || 
                            `${response.profiles?.first_name} ${response.profiles?.last_name}`.trim() || 
                            'Anonymous'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator Info */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{creatorName}</p>
              <p className="text-sm text-muted-foreground">Video creator</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{video.likes_count} likes</p>
            </div>
          </div>

          {/* Engagement encouragement */}
          {video.prompt && video.prompt.trim() !== '' && (
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
              <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
                ✨ <strong>Inspired?</strong> Share your story! Every voice adds to our collective memory.
              </p>
              <Button
                onClick={() => onRecordYourOwn(video.prompt!)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/20"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Share Your Take
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MomentsCarouselProps {
  videos: Video[];
  onVideoSelect: (video: Video) => void;
}

export function MomentsCarousel({ videos, onVideoSelect }: MomentsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleVideos, setVisibleVideos] = useState(new Set<string>());
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoPositions, setVideoPositions] = useState<Record<string, number>>({});
  const [shouldPauseAll, setShouldPauseAll] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  // Auto-advance timer
  useEffect(() => {
    if (videos.length === 0) return;

    const timer = setInterval(() => {
      if (!playingVideoId && !isAutoScrolling) { // Only auto-advance if no video is playing and not auto-scrolling
        setCurrentIndex(prevIndex => 
          prevIndex === videos.length - 1 ? 0 : prevIndex + 1
        );
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [videos.length, playingVideoId, isAutoScrolling]);

  // Auto-center highlighted prompt when currentIndex changes
  useEffect(() => {
    if (videos.length > 0) {
      scrollToIndexWithVisibilityCheck(currentIndex, 'auto');
    }
  }, [currentIndex, videos.length]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (videoId) {
            if (entry.isIntersecting) {
              setVisibleVideos(prev => new Set([...prev, videoId]));
            } else {
              setVisibleVideos(prev => {
                const newSet = new Set(prev);
                newSet.delete(videoId);
                return newSet;
              });
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Check if an item is visible in the viewport
  const isItemVisible = (index: number): boolean => {
    const container = scrollContainerRef.current;
    const card = cardRefs.current[index];
    
    if (!container || !card) return false;
    
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    
    // Check if the card is at least 80% visible in the container
    const cardCenter = cardRect.left + cardRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const tolerance = containerRect.width * 0.4; // 40% of container width
    
    return Math.abs(cardCenter - containerCenter) <= tolerance;
  };

  // Enhanced scroll to index with visibility check
  const scrollToIndexWithVisibilityCheck = (index: number, trigger: 'auto' | 'manual' = 'manual') => {
    if (!scrollContainerRef.current || index < 0 || index >= videos.length) return;
    
    // Don't animate if item is already centered (unless it's a manual trigger)
    if (trigger === 'auto' && isItemVisible(index)) {
      return;
    }
    
    setIsAutoScrolling(true);
    
    // Pause currently playing video when scrolling
    if (playingVideoId) {
      setShouldPauseAll(true);
      setTimeout(() => setShouldPauseAll(false), 100);
    }
    
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    const cardWidth = index === currentIndex ? 288 : 256; // Active cards are larger (w-72 vs w-64)
    const gap = 16; // gap-4 = 16px
    
    // Calculate position to center the selected card
    const cardPosition = index * (cardWidth + gap);
    const centerOffset = (containerWidth - cardWidth) / 2;
    const scrollPosition = Math.max(0, cardPosition - centerOffset);
    
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
    
    // Announce for screen readers
    if (trigger === 'manual') {
      announceForScreenReader(`Video ${index + 1} of ${videos.length} selected: ${videos[index]?.title}`);
    }
    
    // Reset auto-scrolling flag after animation
    setTimeout(() => {
      setIsAutoScrolling(false);
    }, 600); // Match CSS transition duration
  };

  // Screen reader announcement
  const announceForScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Scroll to specific index (public method)
  const scrollToIndex = (index: number) => {
    setCurrentIndex(index);
    scrollToIndexWithVisibilityCheck(index, 'manual');
  };

  // Enhanced next/prev with proper centering
  const nextSlide = () => {
    const newIndex = currentIndex === videos.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(newIndex);
  };

  const prevSlide = () => {
    const newIndex = currentIndex === 0 ? videos.length - 1 : currentIndex - 1;
    scrollToIndex(newIndex);
  };

  // Enhanced card click handler
  const handleCardClick = (video: Video, index: number) => {
    // If clicking on a different card, center it first
    if (index !== currentIndex) {
      setCurrentIndex(index);
      scrollToIndexWithVisibilityCheck(index, 'manual');
      return;
    }
    
    // If clicking on the centered card, open modal
    handleVideoClick(video);
  };

  const handleVideoClick = (video: Video) => {
    // Pause all preview videos before opening modal
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    setSelectedVideo(video);
    setIsModalOpen(true);
    onVideoSelect(video);
  };

  const handleRecordYourOwn = (prompt: string) => {
    setIsModalOpen(false);
    setSelectedVideo(null);
    // Navigate to record page with prompt pre-filled
    const searchParams = new URLSearchParams();
    searchParams.set('prompt', prompt);
    window.location.href = `/record?${searchParams.toString()}`;
  };

  const handlePlayStateChange = (videoId: string, isPlaying: boolean, position?: number) => {
    if (isPlaying) {
      // Pause all other videos when one starts playing
      if (playingVideoId && playingVideoId !== videoId) {
        setShouldPauseAll(true);
        setTimeout(() => setShouldPauseAll(false), 100);
      }
      setPlayingVideoId(videoId);
    } else {
      if (playingVideoId === videoId) {
        setPlayingVideoId(null);
      }
    }

    if (position !== undefined) {
      setVideoPositions(prev => ({
        ...prev,
        [videoId]: position
      }));
    }
  };

  // Enhanced touch/drag handlers with momentum
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragVelocity, setDragVelocity] = useState(0);
  const [lastDragTime, setLastDragTime] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setLastDragTime(Date.now());
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    
    const now = Date.now();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    
    // Calculate velocity for momentum
    const timeDiff = now - lastDragTime;
    if (timeDiff > 0) {
      setDragVelocity(walk / timeDiff);
    }
    
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    setLastDragTime(now);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Find the closest card to center after drag
    if (scrollContainerRef.current && Math.abs(dragVelocity) < 1) {
      const container = scrollContainerRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      cardRefs.current.forEach((card, index) => {
        if (card) {
          const cardRect = card.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const cardCenter = cardRect.left - containerRect.left + container.scrollLeft + cardRect.width / 2;
          const distance = Math.abs(cardCenter - containerCenter);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
      });
      
      // Snap to the closest card
      setTimeout(() => {
        setCurrentIndex(closestIndex);
        scrollToIndexWithVisibilityCheck(closestIndex, 'manual');
      }, 100);
    }
    
    setDragVelocity(0);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setStartX(touch.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setLastDragTime(Date.now());
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const touch = e.touches[0];
    const now = Date.now();
    const x = touch.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    
    const timeDiff = now - lastDragTime;
    if (timeDiff > 0) {
      setDragVelocity(walk / timeDiff);
    }
    
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    setLastDragTime(now);
  };

  const handleTouchEnd = () => {
    handleMouseUp(); // Reuse the same logic
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextSlide();
        break;
      case 'Home':
        e.preventDefault();
        scrollToIndex(0);
        break;
      case 'End':
        e.preventDefault();
        scrollToIndex(videos.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (videos[currentIndex]) {
          handleVideoClick(videos[currentIndex]);
        }
        break;
    }
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No inspiring moments yet</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Carousel */}
      <div className="relative group" role="region" aria-label="Inspirational video carousel" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Navigation arrows - desktop only */}
        <Button
          variant="ghost"
          size="sm"
          onClick={prevSlide}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:shadow-xl hidden md:flex"
          aria-label="Previous video"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={nextSlide}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:shadow-xl hidden md:flex"
          aria-label="Next video"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Cards container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing pb-4 focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="tablist"
          aria-label="Video carousel"
        >
          {videos.map((video, index) => {
            const isActive = index === currentIndex;
            const isVisible = visibleVideos.has(video.id);

            return (
              <Card
                key={video.id}
                data-video-id={video.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                  if (el && observerRef.current) {
                    observerRef.current.observe(el);
                  }
                }}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-label={`Video: ${video.title}${video.prompt ? `. Prompt: ${video.prompt}` : ''}`}
                onClick={() => handleCardClick(video, index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(video, index);
                  }
                }}
                className={`flex-shrink-0 cursor-pointer transition-all duration-500 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${
                  isActive 
                    ? 'w-72 scale-105 shadow-2xl ring-2 ring-amber-400/50 dark:ring-amber-500/50 shadow-amber-200/20 dark:shadow-amber-900/20' 
                    : 'w-64 scale-95 hover:scale-100 hover:shadow-amber-100/20 dark:hover:shadow-amber-900/20'
                } ${
                  isVisible ? 'opacity-100' : 'opacity-60'
                } group border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden rounded-xl`}
              >
                <div className="flex flex-col">
                  <div className="aspect-video overflow-hidden rounded-t-xl">
                    <VideoPreview 
                      video={video} 
                      isActive={isActive}
                      isInView={visibleVideos.has(video.id)}
                      onVideoClick={() => handleVideoClick(video)}
                      shouldPause={shouldPauseAll || (playingVideoId !== null && playingVideoId !== video.id)}
                      playingVideoId={playingVideoId}
                      onPlayStateChange={handlePlayStateChange}
                    />
                  </div>
                  
                  {/* Card content with prompt preview */}
                  <div className="p-3 space-y-2">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
                        {video.title}
                      </h3>
                    </div>

                    {/* Prompt preview */}
                    <PromptPreview prompt={video.prompt} isActive={isActive} videoId={video.id} />

                    {/* Engagement info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-2">
                        <span>{video.likes_count} likes</span>
                        {video.prompt && video.prompt.trim() !== '' && (
                          <span className="text-amber-600 dark:text-amber-400">• Has prompt</span>
                        )}
                      </div>
                      <span className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Featured
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center items-center gap-2" role="tablist" aria-label="Video navigation">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            role="tab"
            aria-selected={index === currentIndex}
            aria-label={`Go to video ${index + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
              index === currentIndex 
                ? 'bg-amber-500 w-6' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>

      {/* Enhanced Video Modal */}
      <EnhancedVideoModal
        video={selectedVideo}
        isOpen={isModalOpen}
        onClose={() => {
          // Clean up when closing modal
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach(video => {
            video.pause();
            video.currentTime = 0;
          });
          
          setIsModalOpen(false);
          setSelectedVideo(null);
        }}
        onRecordYourOwn={handleRecordYourOwn}
      />
    </div>
  );
} 