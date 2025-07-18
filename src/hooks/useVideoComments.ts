import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { VideoComment } from './useSocialFeed';

interface UseVideoCommentsOptions {
  videoId: string;
  enabled?: boolean;
}

export function useVideoComments({ videoId, enabled = true }: UseVideoCommentsOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const subscriptionRef = useRef<any>(null);

  // Load comments for a video
  const loadComments = useCallback(async () => {
    if (!enabled || !videoId) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('video_comments')
        .select(`
          id,
          video_id,
          user_id,
          parent_comment_id,
          content,
          is_edited,
          edited_at,
          created_at,
          user_profile:profiles (
            first_name,
            last_name,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into nested structure
      const commentsMap = new Map<string, VideoComment>();
      const rootComments: VideoComment[] = [];

      // First pass: create all comment objects
      (data || []).forEach((comment: any) => {
        const commentObj: VideoComment = {
          id: comment.id,
          video_id: comment.video_id,
          user_id: comment.user_id,
          parent_comment_id: comment.parent_comment_id,
          content: comment.content,
          is_edited: comment.is_edited,
          edited_at: comment.edited_at,
          created_at: comment.created_at,
          user_profile: comment.user_profile,
          replies: [],
        };
        
        commentsMap.set(comment.id, commentObj);
      });

      // Second pass: organize into hierarchy
      commentsMap.forEach((comment) => {
        if (comment.parent_comment_id) {
          // This is a reply
          const parentComment = commentsMap.get(comment.parent_comment_id);
          if (parentComment) {
            parentComment.replies = parentComment.replies || [];
            parentComment.replies.push(comment);
            // Sort replies by created_at
            parentComment.replies.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
        } else {
          // This is a root comment
          rootComments.push(comment);
        }
      });

      // Sort root comments by created_at (newest first for main feed)
      rootComments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setComments(rootComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: "Error loading comments",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, videoId, toast]);

  // Add a new comment
  const addComment = useCallback(async (content: string, parentCommentId?: string) => {
    if (!user || !content.trim()) return false;

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          parent_comment_id: parentCommentId || null,
          content: content.trim(),
        })
        .select(`
          id,
          video_id,
          user_id,
          parent_comment_id,
          content,
          is_edited,
          edited_at,
          created_at,
          user_profile:profiles (
            first_name,
            last_name,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Create comment object
      const newComment: VideoComment = {
        id: data.id,
        video_id: data.video_id,
        user_id: data.user_id,
        parent_comment_id: data.parent_comment_id,
        content: data.content,
        is_edited: data.is_edited,
        edited_at: data.edited_at,
        created_at: data.created_at,
        user_profile: data.user_profile,
        replies: [],
      };

      // Update local state
      if (parentCommentId) {
        // This is a reply - add to parent's replies
        setComments(prev => 
          prev.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              };
            }
            return comment;
          })
        );
      } else {
        // This is a root comment - add to top
        setComments(prev => [newComment, ...prev]);
      }

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error posting comment",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, videoId, toast]);

  // Edit a comment
  const editComment = useCallback(async (commentId: string, newContent: string) => {
    if (!user || !newContent.trim()) return false;

    try {
      const { error } = await (supabase as any)
        .from('video_comments')
        .update({ 
          content: newContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user can only edit their own comments

      if (error) throw error;

      // Update local state
      const updateCommentInTree = (comments: VideoComment[]): VideoComment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              content: newContent.trim(),
              is_edited: true,
              edited_at: new Date().toISOString()
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies)
            };
          }
          return comment;
        });
      };

      setComments(prev => updateCommentInTree(prev));

      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error editing comment:', error);
      toast({
        title: "Error updating comment",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return false;

    try {
      const { error } = await (supabase as any)
        .from('video_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user can only delete their own comments

      if (error) throw error;

      // Update local state
      const removeCommentFromTree = (comments: VideoComment[]): VideoComment[] => {
        return comments
          .filter(comment => comment.id !== commentId)
          .map(comment => ({
            ...comment,
            replies: comment.replies ? removeCommentFromTree(comment.replies) : []
          }));
      };

      setComments(prev => removeCommentFromTree(prev));

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error deleting comment",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  // Get display name for a user
  const getDisplayName = useCallback((userProfile: VideoComment['user_profile']) => {
    if (userProfile.display_name) return userProfile.display_name;
    if (userProfile.first_name || userProfile.last_name) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
    }
    return 'Anonymous User';
  }, []);

  // Load comments when videoId changes
  useEffect(() => {
    if (enabled && videoId) {
      loadComments();
    }
  }, [enabled, videoId, loadComments]);

  // Set up real-time subscription for comments
  useEffect(() => {
    if (!enabled || !videoId) return;

    const channel = supabase
      .channel(`video_comments_${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_comments',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Don't add if it's from current user (already added optimistically)
            const newComment = payload.new as any;
            if (newComment.user_id === user?.id) return;

            // Reload comments to get proper user profile data
            loadComments();
          } else if (payload.eventType === 'UPDATE') {
            // Reload to get updated data
            loadComments();
          } else if (payload.eventType === 'DELETE') {
            const deletedComment = payload.old as any;
            if (deletedComment.user_id === user?.id) return;

            // Remove from local state
            const removeCommentFromTree = (comments: VideoComment[]): VideoComment[] => {
              return comments
                .filter(comment => comment.id !== deletedComment.id)
                .map(comment => ({
                  ...comment,
                  replies: comment.replies ? removeCommentFromTree(comment.replies) : []
                }));
            };

            setComments(prev => removeCommentFromTree(prev));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [enabled, videoId, user?.id, loadComments]);

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