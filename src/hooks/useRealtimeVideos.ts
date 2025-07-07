import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Video {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  likes_count: number;
  file_path: string | null;
}

export function useRealtimeVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Load initial user videos
    const loadUserVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setVideos(data || []);
      } catch (error) {
        console.error('Error loading user videos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserVideos();

    // Set up real-time subscription for user's videos
    const channel = supabase
      .channel('user-videos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📹 User video change:', payload);

          if (payload.eventType === 'INSERT') {
            const newVideo = payload.new as Video;
            setVideos(prev => [newVideo, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedVideo = payload.new as Video;
            setVideos(prev => prev.map(video => 
              video.id === updatedVideo.id ? updatedVideo : video
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedVideo = payload.old as Video;
            setVideos(prev => prev.filter(video => video.id !== deletedVideo.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Optimistic updates
  const optimisticUpdate = (videoId: string, updates: Partial<Video>) => {
    setVideos(prev => prev.map(video => 
      video.id === videoId ? { ...video, ...updates } : video
    ));
  };

  const optimisticDelete = (videoId: string) => {
    setVideos(prev => prev.filter(video => video.id !== videoId));
  };

  const optimisticAdd = (video: Video) => {
    setVideos(prev => [video, ...prev]);
  };

  return {
    videos,
    loading,
    optimisticUpdate,
    optimisticDelete,
    optimisticAdd
  };
}