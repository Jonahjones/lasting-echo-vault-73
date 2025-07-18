import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { SocialFeedVideo } from '@/hooks/useSocialFeed';
import { CommentsSection } from './CommentsSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SocialVideoCardProps {
  video: SocialFeedVideo;
  onLike: (videoId: string) => void;
  onShare?: (video: SocialFeedVideo) => void;
  className?: string;
  autoPlay?: boolean;
}

export function SocialVideoCard({ 
  video, 
  onLike, 
  onShare, 
  className,
  autoPlay = false 
}: SocialVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get user display name
  const getDisplayName = () => {
    if (video.user_profile.display_name) return video.user_profile.display_name;
    if (video.user_profile.first_name || video.user_profile.last_name) {
      return `${video.user_profile.first_name || ''} ${video.user_profile.last_name || ''}`.trim();
    }
    return 'Anonymous User';
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get relationship badge
  const getRelationshipBadge = () => {
    switch (video.share_relationship) {
      case 'own':
        return { text: 'Your Video', color: 'text-blue-600 bg-blue-50' };
      case 'shared_trusted':
        return { text: 'Trusted Contact', color: 'text-green-600 bg-green-50' };
      case 'shared_direct':
        return { text: 'Shared', color: 'text-purple-600 bg-purple-50' };
      case 'public':
        return { text: 'Public', color: 'text-orange-600 bg-orange-50' };
      default:
        return null;
    }
  };

  // Handle video play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handle video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Auto-play when in view (intersection observer)
  useEffect(() => {
    if (!autoPlay || !videoRef.current || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Video is mostly in view, auto-play
            if (videoRef.current && !isPlaying) {
              videoRef.current.play().then(() => {
                setIsPlaying(true);
              }).catch(() => {
                // Auto-play failed, user needs to interact first
              });
            }
          } else {
            // Video is not in view, pause
            if (videoRef.current && isPlaying) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [autoPlay, isPlaying]);

  const relationshipBadge = getRelationshipBadge();

  return (
    <Card ref={cardRef} className={cn("w-full max-w-md mx-auto overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={video.user_profile.avatar_url || undefined} />
            <AvatarFallback className="text-sm font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm truncate">
                {getDisplayName()}
              </h3>
              {relationshipBadge && (
                <span className={cn(
                  "px-2 py-0.5 text-xs rounded-full font-medium",
                  relationshipBadge.color
                )}>
                  {relationshipBadge.text}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onShare && (
              <DropdownMenuItem onClick={() => onShare(video)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Heart className="w-4 h-4 mr-2" />
              Save
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Video Title */}
      <div className="px-4 pb-3">
        <h2 className="font-semibold text-base leading-tight mb-1">
          {video.title}
        </h2>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {video.description}
          </p>
        )}
      </div>

      {/* Video Player */}
      <CardContent className="p-0">
        <div className="relative bg-black rounded-lg mx-4 mb-4 overflow-hidden">
          {video.video_url ? (
            <>
              <video
                ref={videoRef}
                className="w-full aspect-video object-cover"
                src={video.video_url}
                muted={isMuted}
                loop
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onClick={togglePlay}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200">
                {/* Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </Button>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  {/* Progress Bar */}
                  <div className="flex-1 mr-4">
                    <div className="w-full bg-white/20 rounded-full h-1">
                      <div 
                        className="bg-white rounded-full h-1 transition-all duration-200"
                        style={{ 
                          width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
                        }}
                      />
                    </div>
                  </div>

                  {/* Mute Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm p-0"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-video flex items-center justify-center bg-muted">
              <p className="text-muted-foreground">Video unavailable</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center space-x-6">
          {/* Like Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center space-x-2 hover:bg-transparent",
              video.user_has_liked && "text-red-500"
            )}
            onClick={() => onLike(video.id)}
          >
            <Heart className={cn(
              "w-5 h-5",
              video.user_has_liked && "fill-current"
            )} />
            <span className="text-sm font-medium">
              {video.likes_count > 0 && video.likes_count}
            </span>
          </Button>

          {/* Comments Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 hover:bg-transparent"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              {video.comments_count > 0 && video.comments_count}
            </span>
          </Button>

          {/* Share Button */}
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 hover:bg-transparent"
              onClick={() => onShare(video)}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border">
          <CommentsSection 
            videoId={video.id}
            onClose={() => setShowComments(false)}
          />
        </div>
      )}
    </Card>
  );
} 