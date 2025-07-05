import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface VideoLikeData {
  hasLiked: boolean;
  likesCount: number;
  isLoading: boolean;
}

export function useVideoLikes(videoId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likeData, setLikeData] = useState<VideoLikeData>({
    hasLiked: false,
    likesCount: 0,
    isLoading: false
  });

  // Load initial like status and count
  useEffect(() => {
    loadLikeData();
  }, [videoId, user]);

  // Set up real-time subscription for like count changes
  useEffect(() => {
    if (!videoId) return;

    const channel = supabase
      .channel(`video_likes_${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_likes',
          filter: `video_id=eq.${videoId}`
        },
        () => {
          loadLikeData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${videoId}`
        },
        (payload) => {
          if (payload.new.likes_count !== undefined) {
            setLikeData(prev => ({ ...prev, likesCount: payload.new.likes_count }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  const loadLikeData = async () => {
    if (!videoId) return;

    try {
      // Get video likes count
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('likes_count')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      // Check if current user has liked this video
      let hasLiked = false;
      if (user) {
        const { data: userLike, error: likeError } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeError && likeError.code !== 'PGRST116') {
          throw likeError;
        }

        hasLiked = !!userLike;
      }

      setLikeData({
        hasLiked,
        likesCount: video.likes_count || 0,
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading like data:', error);
      setLikeData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to like videos",
        variant: "destructive"
      });
      return;
    }

    if (likeData.isLoading) return;

    setLikeData(prev => ({ ...prev, isLoading: true }));

    try {
      if (likeData.hasLiked) {
        // Unlike the video
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        if (error) throw error;

        setLikeData(prev => ({
          hasLiked: false,
          likesCount: Math.max(0, prev.likesCount - 1),
          isLoading: false
        }));
      } else {
        // Like the video
        const { error } = await supabase
          .from('video_likes')
          .insert({
            video_id: videoId,
            user_id: user.id
          });

        if (error) throw error;

        setLikeData(prev => ({
          hasLiked: true,
          likesCount: prev.likesCount + 1,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setLikeData(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    ...likeData,
    toggleLike
  };
}