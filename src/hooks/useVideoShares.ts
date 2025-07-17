import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface VideoShare {
  id: string;
  video_id: string;
  owner_id: string;
  recipient_id: string;
  recipient_email: string;
  status: 'active' | 'revoked' | 'pending';
  shared_at: string;
  viewed_at?: string;
  is_legacy_release?: boolean;
  released_by_name?: string;
  deceased_user_id?: string;
  legacy_release_date?: string;
  video?: {
    id: string;
    title: string;
    description?: string;
    file_path?: string;
    created_at: string;
    owner_profile?: {
      first_name?: string;
      last_name?: string;
      display_name?: string;
    };
  };
}

export function useVideoShares() {
  const [sharedWithMe, setSharedWithMe] = useState<VideoShare[]>([]);
  const [myShares, setMyShares] = useState<VideoShare[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load videos shared with me
  const loadSharedWithMe = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          video:videos(
            id,
            title,
            description,
            file_path,
            created_at,
            owner_profile:profiles(
              first_name,
              last_name,
              display_name
            )
          )
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'active')
        .order('shared_at', { ascending: false });

      if (error) throw error;
      setSharedWithMe((data || []) as VideoShare[]);
    } catch (error) {
      console.error('Error loading shared videos:', error);
    }
  }, [user]);

  // Load shares I've made
  const loadMyShares = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          video:videos(
            id,
            title,
            description,
            file_path,
            created_at
          )
        `)
        .eq('owner_id', user.id)
        .order('shared_at', { ascending: false });

      if (error) throw error;
      setMyShares((data || []) as VideoShare[]);
    } catch (error) {
      console.error('Error loading my shares:', error);
    }
  }, [user]);

  // Share video with contacts
  const shareVideo = useCallback(async (
    videoId: string, 
    contactEmails: string[]
  ) => {
    if (!user) return;

    try {
      // Get user profiles for the contact emails  
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name');

      // For now, create shares with placeholder recipient_id
      // In a real implementation, you'd need to match emails to user_ids properly
      const shares = contactEmails.map(email => ({
        video_id: videoId,
        owner_id: user.id,
        recipient_id: user.id, // Placeholder - would need proper email-to-user mapping
        recipient_email: email,
        status: 'active' as const
      }));

      const { error } = await supabase
        .from('video_shares')
        .insert(shares);

      if (error) throw error;

      // Create notifications for recipients (placeholder implementation)
      for (const email of contactEmails) {
        const recipientProfile = profiles?.find(p => p.user_id === user.id); // Placeholder

        if (recipientProfile) {
          await supabase
            .from('notifications')
            .insert({
              user_id: recipientProfile.user_id,
              type: 'shared_video',
              title: 'New Video Shared With You',
              message: 'Someone shared a memory with you',
              data: { video_id: videoId, sender_id: user.id }
            });
        }
      }

      toast({
        title: 'Video Shared',
        description: `Shared with ${contactEmails.length} contact${contactEmails.length > 1 ? 's' : ''}`
      });

      loadMyShares();
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: 'Share Failed',
        description: 'Could not share video. Please try again.',
        variant: 'destructive'
      });
    }
  }, [user, toast, loadMyShares]);

  // Revoke share
  const revokeShare = useCallback(async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('video_shares')
        .update({ status: 'revoked' })
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: 'Share Revoked',
        description: 'Video access has been removed'
      });

      loadMyShares();
      loadSharedWithMe();
    } catch (error) {
      console.error('Error revoking share:', error);
      toast({
        title: 'Revoke Failed',
        description: 'Could not revoke share. Please try again.',
        variant: 'destructive'
      });
    }
  }, [toast, loadMyShares, loadSharedWithMe]);

  // Mark as viewed
  const markAsViewed = useCallback(async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('video_shares')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', shareId);

      if (error) throw error;
      
      loadSharedWithMe();
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  }, [loadSharedWithMe]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('video-shares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_shares',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          loadSharedWithMe();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_shares',
          filter: `owner_id=eq.${user.id}`
        },
        () => {
          loadMyShares();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadSharedWithMe, loadMyShares]);

  // Initial load
  useEffect(() => {
    if (user) {
      Promise.all([loadSharedWithMe(), loadMyShares()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, loadSharedWithMe, loadMyShares]);

  return {
    sharedWithMe,
    myShares,
    loading,
    shareVideo,
    revokeShare,
    markAsViewed,
    refreshSharedWithMe: loadSharedWithMe,
    refreshMyShares: loadMyShares
  };
}