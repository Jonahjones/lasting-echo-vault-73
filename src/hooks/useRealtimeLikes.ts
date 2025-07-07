import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeLikes(videoId: string) {
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!videoId) return;

    // Load initial likes data
    const loadLikes = async () => {
      try {
        // Get total likes count
        const { data: likesData, error: likesError } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', videoId);

        if (likesError) throw likesError;

        setLikesCount(likesData?.length || 0);

        // Check if current user liked the video
        if (user) {
          const { data: userLike, error: userLikeError } = await supabase
            .from('video_likes')
            .select('id')
            .eq('video_id', videoId)
            .eq('user_id', user.id)
            .single();

          if (userLikeError && userLikeError.code !== 'PGRST116') {
            throw userLikeError;
          }

          setIsLiked(!!userLike);
        }
      } catch (error) {
        console.error('Error loading likes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLikes();

    // Set up real-time subscription for likes on this video
    const channel = supabase
      .channel(`video-likes-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_likes',
          filter: `video_id=eq.${videoId}`
        },
        (payload) => {
          console.log('❤️ Like change for video:', videoId, payload);

          if (payload.eventType === 'INSERT') {
            const newLike = payload.new as any;
            setLikesCount(prev => prev + 1);
            
            if (user && newLike.user_id === user.id) {
              setIsLiked(true);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedLike = payload.old as any;
            setLikesCount(prev => Math.max(0, prev - 1));
            
            if (user && deletedLike.user_id === user.id) {
              setIsLiked(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, user]);

  // Optimistic like/unlike
  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to like videos",
        variant: "destructive"
      });
      return;
    }

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      if (wasLiked) {
        // Unlike
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('video_likes')
          .insert({
            video_id: videoId,
            user_id: user.id
          });

        if (error) throw error;
      }
    } catch (error) {
      // Rollback optimistic update on error
      console.error('Error toggling like:', error);
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
      
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    likesCount,
    isLiked,
    loading,
    toggleLike
  };
}