import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Simplified comment interface for fallback
export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  user_profile: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: VideoComment[];
}

interface UseVideoCommentsOptions {
  videoId: string;
  enabled?: boolean;
}

export function useVideoCommentsFallback({ videoId, enabled = true }: UseVideoCommentsOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load comments (fallback - returns empty for now)
  const loadComments = useCallback(async () => {
    if (!enabled || !videoId) return;

    setLoading(true);
    try {
      console.log('ℹ️ Comments fallback mode - video_comments table not available');
      
      // For now, return empty comments since the table doesn't exist
      // In the future, you could implement a basic comments table or use a different approach
      setComments([]);
      
    } catch (error) {
      console.error('Error in comments fallback:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, videoId]);

  // Add comment (fallback - shows message)
  const addComment = useCallback(async (content: string, parentCommentId?: string) => {
    if (!user || !content.trim()) return false;

    console.log('ℹ️ Comments fallback - would add comment:', content);
    
    toast({
      title: "Comments not available",
      description: "Comments will be available after the database migration is applied.",
      variant: "default",
    });

    return false;
  }, [user, toast]);

  // Edit comment (fallback)
  const editComment = useCallback(async (commentId: string, newContent: string) => {
    console.log('ℹ️ Comments fallback - would edit comment:', commentId, newContent);
    return false;
  }, []);

  // Delete comment (fallback)
  const deleteComment = useCallback(async (commentId: string) => {
    console.log('ℹ️ Comments fallback - would delete comment:', commentId);
    return false;
  }, []);

  // Get display name
  const getDisplayName = useCallback((userProfile: VideoComment['user_profile']) => {
    if (userProfile.display_name) return userProfile.display_name;
    if (userProfile.first_name || userProfile.last_name) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
    }
    return 'Anonymous User';
  }, []);

  // Load comments when enabled
  useEffect(() => {
    if (enabled && videoId) {
      loadComments();
    }
  }, [enabled, videoId, loadComments]);

  return {
    comments,
    loading,
    submitting,
    addComment,
    editComment,
    deleteComment,
    getDisplayName,
    refresh: loadComments,
  };
} 