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
  user_profile: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  video_url: string | null;
  user_has_liked: boolean;
}

interface UseSocialFeedOptions {
  pageSize?: number;
  refreshInterval?: number;
}

export function useSocialFeedFallback(options: UseSocialFeedOptions = {}) {
  const { pageSize = 10, refreshInterval = 30000 } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [videos, setVideos] = useState<SocialFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const subscriptionRef = useRef<any>(null);

  const loadFeedPage = useCallback(async (page: number, append: boolean = true) => {
    if (!user) return [];

    try {
      console.log('🔄 Loading social feed (fallback mode)...');
      
      const feedVideos: SocialFeedVideo[] = [];
      
      // 1. User's own public videos
      const { data: ownVideos, error: ownError } = await supabase
        .from('videos')
        .select(`
          *,
          user_profile:profiles (
            first_name,
            last_name,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(0, 4);

      if (ownError) {
        console.error('Error loading own videos:', ownError);
      }

      // 2. Videos shared directly with user  
      const { data: sharedVideos, error: sharedError } = await supabase
        .from('video_shares')
        .select(`
          *,
          video:videos (
            *,
            user_profile:profiles (
              first_name,
              last_name,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'active')
        .order('shared_at', { ascending: false })
        .range(0, 9);

      if (sharedError) {
        console.error('Error loading shared videos:', sharedError);
      }

      // Process all videos
      const allVideos = [
        ...(ownVideos || []).map((video: any) => ({
          ...video,
          share_relationship: 'own' as const,
          feed_score: 100,
        })),
        ...(sharedVideos || []).map((share: any) => ({
          ...share.video,
          share_relationship: 'shared_direct' as const,
          feed_score: 80,
        })),
      ];

      // Sort by feed score and date
      allVideos.sort((a, b) => {
        if (a.feed_score !== b.feed_score) {
          return b.feed_score - a.feed_score;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Apply pagination
      const offset = page * pageSize;
      const pageVideos = allVideos.slice(offset, offset + pageSize);

      // Process videos
      const processedVideos = await Promise.all(
        pageVideos.map(async (video: any) => {
          let videoUrl = null;
          if (video.file_path) {
            try {
              const { data: urlData } = await supabase.storage
                .from('videos')
                .createSignedUrl(video.file_path, 3600);
              videoUrl = urlData?.signedUrl || null;
            } catch (error) {
              console.error('Error getting video URL:', error);
            }
          }

          let userHasLiked = false;
          try {
            const { data: likeData } = await supabase
              .from('video_likes')
              .select('id')
              .eq('user_id', user.id)
              .eq('video_id', video.id)
              .maybeSingle();
            userHasLiked = !!likeData;
          } catch (error) {
            console.log('ℹ️ Video likes table not found');
          }

          return {
            id: video.id,
            title: video.title,
            description: video.description,
            file_path: video.file_path,
            created_at: video.created_at,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            is_public: video.is_public,
            user_id: video.user_id,
            share_relationship: video.share_relationship,
            feed_score: video.feed_score,
            user_profile: video.user_profile || {
              first_name: null,
              last_name: null,
              display_name: null,
              avatar_url: null,
            },
            video_url: videoUrl,
            user_has_liked: userHasLiked,
          } as SocialFeedVideo;
        })
      );

      const hasMoreData = offset + pageSize < allVideos.length;
      setHasMore(hasMoreData);
      
      if (append) {
        setVideos(prev => [...prev, ...processedVideos]);
      } else {
        setVideos(processedVideos);
      }
      
      console.log('✅ Feed loaded successfully:', processedVideos.length, 'videos');
      return processedVideos;
      
    } catch (error) {
      console.error('❌ Error loading social feed:', error);
      toast({
        title: "Error loading feed",
        description: "Failed to load videos. Check console for details.",
        variant: "destructive",
      });
      return [];
    }
  }, [user, pageSize, toast]);

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

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = currentPage + 1;
    await loadFeedPage(nextPage, true);
    setCurrentPage(nextPage);
  }, [loading, hasMore, currentPage, loadFeedPage]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadFeedPage(0, false);
    setCurrentPage(0);
    setRefreshing(false);
  }, [user, loadFeedPage]);

  const toggleLike = useCallback(async (videoId: string) => {
    if (!user) return;
    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      if (video.user_has_liked) {
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        if (error) throw error;
        setVideos(prev => prev.map(v => 
          v.id === videoId 
            ? { ...v, user_has_liked: false, likes_count: Math.max(0, v.likes_count - 1) }
            : v
        ));
      } else {
        const { error } = await supabase
          .from('video_likes')
          .insert({ user_id: user.id, video_id: videoId });
        if (error) throw error;
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
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  }, [user, videos, toast]);

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