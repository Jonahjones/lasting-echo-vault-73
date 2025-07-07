import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AdminVideo {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  likes_count: number;
  file_path: string | null;
  user_email?: string;
  user_name?: string;
}

interface RealtimeContextType {
  videos: AdminVideo[];
  isConnected: boolean;
  connectionState: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  optimisticToggleFeatured: (videoId: string) => void;
  optimisticUpdateLikes: (videoId: string, increment: number) => void;
  refreshVideos: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const { user } = useAuth();
  const { toast } = useToast();

  // Load initial videos data
  const loadVideos = useCallback(async () => {
    try {
      console.log('🔄 Loading videos for real-time sync...');
      
      // Get all public videos with user information
      const { data: videosData, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          user_id,
          is_public,
          is_featured,
          created_at,
          likes_count,
          file_path
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for each video
      const userIds = [...new Set(videosData?.map(v => v.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Combine video and user data
      const videosWithUserInfo = videosData?.map(video => {
        const profile = profiles?.find(p => p.user_id === video.user_id);
        return {
          ...video,
          user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
          user_email: video.user_id.substring(0, 8) + '...'
        };
      }) || [];

      setVideos(videosWithUserInfo);
      console.log(`✅ Loaded ${videosWithUserInfo.length} videos for real-time sync`);
    } catch (error) {
      console.error('❌ Error loading videos:', error);
      setConnectionState('ERROR');
    }
  }, []);

  // Optimistic UI updates
  const optimisticToggleFeatured = useCallback((videoId: string) => {
    setVideos(prev => prev.map(video => 
      video.id === videoId 
        ? { ...video, is_featured: !video.is_featured }
        : video
    ));
  }, []);

  const optimisticUpdateLikes = useCallback((videoId: string, increment: number) => {
    setVideos(prev => prev.map(video => 
      video.id === videoId 
        ? { ...video, likes_count: Math.max(0, video.likes_count + increment) }
        : video
    ));
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('🔗 Setting up real-time subscriptions...');
    setConnectionState('CONNECTING');
    
    // Load initial data
    loadVideos();

    // Subscribe to videos table changes
    const videosChannel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos'
        },
        async (payload) => {
          console.log('🔄 Real-time video change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New video added
            const newVideo = payload.new as any;
            if (newVideo.is_public) {
              // Get user profile for the new video
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('user_id', newVideo.user_id)
                .single();

              const videoWithUserInfo = {
                ...newVideo,
                user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
                user_email: newVideo.user_id.substring(0, 8) + '...'
              };

              setVideos(prev => [videoWithUserInfo, ...prev]);
              
              toast({
                title: "New Video Published!",
                description: `"${newVideo.title}" is now available`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Video updated
            const updatedVideo = payload.new as any;
            setVideos(prev => prev.map(video => {
              if (video.id === updatedVideo.id) {
                return {
                  ...video,
                  ...updatedVideo,
                  user_name: video.user_name, // Keep existing user info
                  user_email: video.user_email
                };
              }
              return video;
            }));

            // Show toast for featured status changes
            if (payload.old?.is_featured !== updatedVideo.is_featured) {
              toast({
                title: updatedVideo.is_featured ? "Video Featured!" : "Video Unfeatured",
                description: `"${updatedVideo.title}" ${updatedVideo.is_featured ? 'added to' : 'removed from'} public feed`,
              });
            }
          } else if (payload.eventType === 'DELETE') {
            // Video deleted
            const deletedVideo = payload.old as any;
            setVideos(prev => prev.filter(video => video.id !== deletedVideo.id));
            
            toast({
              title: "Video Removed",
              description: `"${deletedVideo.title}" is no longer available`,
              variant: "destructive"
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_likes'
        },
        (payload) => {
          console.log('❤️ Real-time like change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Like added
            const like = payload.new as any;
            optimisticUpdateLikes(like.video_id, 1);
          } else if (payload.eventType === 'DELETE') {
            // Like removed
            const like = payload.old as any;
            optimisticUpdateLikes(like.video_id, -1);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time connection status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionState('CONNECTED');
          console.log('✅ Real-time subscriptions active');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          setConnectionState('DISCONNECTED');
          console.log('❌ Real-time connection closed');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionState('ERROR');
          console.log('❌ Real-time connection error');
        }
      });

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions');
      supabase.removeChannel(videosChannel);
    };
  }, [loadVideos, optimisticUpdateLikes, toast]);

  // Connection status indicator
  useEffect(() => {
    if (connectionState === 'CONNECTED' && !toast) {
      console.log('🔗 Real-time sync enabled');
    } else if (connectionState === 'ERROR') {
      toast({
        title: "Connection Issue",
        description: "Real-time updates may be delayed. Refreshing...",
        variant: "destructive"
      });
      
      // Retry connection after 5 seconds
      setTimeout(() => {
        loadVideos();
      }, 5000);
    }
  }, [connectionState, toast, loadVideos]);

  const value: RealtimeContextType = {
    videos,
    isConnected,
    connectionState,
    optimisticToggleFeatured,
    optimisticUpdateLikes,
    refreshVideos: loadVideos
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}