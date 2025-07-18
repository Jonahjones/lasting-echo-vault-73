import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SocialFeedVideo {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  user_id: string;
  share_relationship: 'own' | 'shared_direct' | 'shared_trusted' | 'public';
  feed_score: number;
  
  // User profile data
  user_profile: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  
  // Video URL (signed)
  video_url: string | null;
  
  // User interaction state
  user_has_liked: boolean;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  
  // User profile
  user_profile: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  
  // Nested replies
  replies?: VideoComment[];
}

interface UseSocialFeedOptions {
  pageSize?: number;
  refreshInterval?: number;
}

export function useSocialFeed(options: UseSocialFeedOptions = {}) {
  const { pageSize = 10, refreshInterval = 30000 } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [videos, setVideos] = useState<SocialFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const lastVideoRef = useRef<string | null>(null);
  
  // Real-time subscription
  const subscriptionRef = useRef<any>(null);

  // Load social feed data
  const loadFeedPage = useCallback(async (page: number, append: boolean = true) => {
    if (!user) return [];

    try {
      // First ensure user's feed cache is up to date
      await supabase.rpc('refresh_user_social_feed', { target_user_id: user.id });

      // Query the feed with pagination
      const offset = page * pageSize;
      
      const { data, error } = await supabase
        .from('social_feed_cache')
        .select(`
          video_id,
          feed_score,
          share_relationship,
          video:videos (
            id,
            title,
            description,
            file_path,
            created_at,
            likes_count,
            comments_count,
            is_public,
            user_id,
            user_profile:profiles (
              first_name,
              last_name,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('feed_score', { ascending: false })
        .order('added_to_feed_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      // Process the results
      const processedVideos = await Promise.all(
        (data || []).map(async (item: any) => {
          const video = item.video;
          if (!video) return null;

          // Get signed URL for video
          let videoUrl = null;
          if (video.file_path) {
            try {
              const { data: urlData } = await supabase.storage
                .from('videos')
                .createSignedUrl(video.file_path, 3600); // 1 hour
              videoUrl = urlData?.signedUrl || null;
            } catch (error) {
              console.error('Error getting video URL:', error);
            }
          }

          // Check if user has liked this video
          const { data: likeData } = await supabase
            .from('video_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('video_id', video.id)
            .maybeSingle();

          return {
            id: video.id,
            title: video.title,
            description: video.description,
            file_path: video.file_path,
            created_at: video.created_at,
            likes_count: video.likes_count,
            comments_count: video.comments_count,
            is_public: video.is_public,
            user_id: video.user_id,
            share_relationship: item.share_relationship,
            feed_score: item.feed_score,
            user_profile: video.user_profile,
            video_url: videoUrl,
            user_has_liked: !!likeData,
          } as SocialFeedVideo;
        })
      );

      const validVideos = processedVideos.filter(Boolean) as SocialFeedVideo[];
      
      // Check if we have more data
      const hasMoreData = validVideos.length === pageSize;
      setHasMore(hasMoreData);
      
      if (append) {
        setVideos(prev => [...prev, ...validVideos]);
      } else {
        setVideos(validVideos);
      }
      
      return validVideos;
    } catch (error) {
      console.error('Error loading social feed:', error);
      toast({
        title: "Error loading feed",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  }, [user, pageSize, toast]);

  // Initial load
  useEffect(() => {
    if (!user) return;

    const loadInitialFeed = async () => {
      setLoading(true);
      await loadFeedPage(0, false);
      setCurrentPage(0);
      setLoading(false);
    };

    loadInitialFeed();
  }, [user, loadFeedPage]);

  // Load more for infinite scroll
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    const nextPage = currentPage + 1;
    await loadFeedPage(nextPage, true);
    setCurrentPage(nextPage);
  }, [loading, hasMore, currentPage, loadFeedPage]);

  // Refresh feed
  const refresh = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    await loadFeedPage(0, false);
    setCurrentPage(0);
    setRefreshing(false);
  }, [user, loadFeedPage]);

  // Toggle like on video
  const toggleLike = useCallback(async (videoId: string) => {
    if (!user) return;

    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      if (video.user_has_liked) {
        // Unlike
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);

        if (error) throw error;

        // Update local state
        setVideos(prev => prev.map(v => 
          v.id === videoId 
            ? { ...v, user_has_liked: false, likes_count: v.likes_count - 1 }
            : v
        ));
      } else {
        // Like
        const { error } = await supabase
          .from('video_likes')
          .insert({ user_id: user.id, video_id: videoId });

        if (error) throw error;

        // Update local state
        setVideos(prev => prev.map(v => 
          v.id === videoId 
            ? { ...v, user_has_liked: true, likes_count: v.likes_count + 1 }
            : v
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, videos, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to likes changes
    const likesChannel = supabase
      .channel('video_likes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_likes',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLike = payload.new as any;
            setVideos(prev => prev.map(v => 
              v.id === newLike.video_id 
                ? { 
                    ...v, 
                    likes_count: v.likes_count + 1,
                    user_has_liked: newLike.user_id === user.id ? true : v.user_has_liked
                  }
                : v
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedLike = payload.old as any;
            setVideos(prev => prev.map(v => 
              v.id === deletedLike.video_id 
                ? { 
                    ...v, 
                    likes_count: Math.max(0, v.likes_count - 1),
                    user_has_liked: deletedLike.user_id === user.id ? false : v.user_has_liked
                  }
                : v
            ));
          }
        }
      )
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel('video_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_comments',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as any;
            setVideos(prev => prev.map(v => 
              v.id === newComment.video_id 
                ? { ...v, comments_count: v.comments_count + 1 }
                : v
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedComment = payload.old as any;
            setVideos(prev => prev.map(v => 
              v.id === deletedComment.video_id 
                ? { ...v, comments_count: Math.max(0, v.comments_count - 1) }
                : v
            ));
          }
        }
      )
      .subscribe();

    // Subscribe to new videos in feed
    const feedChannel = supabase
      .channel('social_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_feed_cache',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // New video added to feed, refresh to show it
          refresh();
        }
      )
      .subscribe();

    subscriptionRef.current = [likesChannel, commentsChannel, feedChannel];

    return () => {
      subscriptionRef.current?.forEach((channel: any) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, refresh]);

  // Periodic refresh
  useEffect(() => {
    if (!refreshInterval || !user) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval, user]);

  return {
    videos,
    loading,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    toggleLike,
  };
} 