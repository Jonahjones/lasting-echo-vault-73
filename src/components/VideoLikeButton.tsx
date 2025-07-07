import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeLikes } from '@/hooks/useRealtimeLikes';
import { cn } from '@/lib/utils';

interface VideoLikeButtonProps {
  videoId: string;
  variant?: 'default' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VideoLikeButton({ 
  videoId, 
  variant = 'default', 
  size = 'md', 
  className 
}: VideoLikeButtonProps) {
  const { user } = useAuth();
  const { likesCount, isLiked, loading, toggleLike } = useRealtimeLikes(videoId);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';  
      default: return 'w-5 h-5';
    }
  };

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        <Heart 
          className={cn(
            getSizeClasses(),
            isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground"
          )} 
        />
        <span className="text-sm font-medium text-muted-foreground">
          {likesCount}
        </span>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLike}
      disabled={!user || loading}
      className={cn(
        "flex items-center space-x-2 hover:bg-red-50 hover:text-red-600 transition-colors",
        className
      )}
      aria-label={isLiked ? "Unlike video" : "Like video"}
    >
      <Heart 
        className={cn(
          getSizeClasses(),
          isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground",
          loading && "animate-pulse"
        )} 
      />
      <span className="font-medium">
        {likesCount}
      </span>
    </Button>
  );
}