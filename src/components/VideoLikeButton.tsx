import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkLikeStatus();
    }
    fetchLikesCount();
  }, [videoId, user]);

  const checkLikeStatus = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const fetchLikesCount = async () => {
    try {
      const { data } = await supabase
        .from('videos')
        .select('likes_count')
        .eq('id', videoId)
        .single();
      
      setLikesCount(data?.likes_count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  const handleLikeToggle = async () => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
        
        if (error) throw error;
        setIsLiked(false);
      } else {
        // Add like
        const { error } = await supabase
          .from('video_likes')
          .insert({
            video_id: videoId,
            user_id: user.id
          });
        
        if (error) throw error;
        setIsLiked(true);
      }
      
      // Refresh likes count - triggers database function to update count
      await fetchLikesCount();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      onClick={handleLikeToggle}
      disabled={!user || isLoading}
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
          isLoading && "animate-pulse"
        )} 
      />
      <span className="font-medium">
        {likesCount}
      </span>
    </Button>
  );
}