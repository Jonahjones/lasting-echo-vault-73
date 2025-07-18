import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, MoreHorizontal, X, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CommentsSectionProps {
  videoId: string;
  onClose?: () => void;
}

interface CommentItemProps {
  comment: any;
  onReply: (commentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  getDisplayName: (userProfile: any) => string;
  currentUserId?: string;
  isReply?: boolean;
}

function CommentItem({ 
  comment, 
  onReply, 
  onEdit, 
  onDelete, 
  getDisplayName, 
  currentUserId,
  isReply = false 
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);

  const isOwner = currentUserId === comment.user_id;

  const getUserInitials = (userProfile: any) => {
    const name = getDisplayName(userProfile);
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent);
      setShowEditForm(false);
    } else {
      setShowEditForm(false);
    }
  };

  const handleDelete = () => {
    onDelete(comment.id);
    setShowDeleteDialog(false);
  };

  return (
    <div className={cn("space-y-3", isReply && "ml-8")}>
      <div className="flex space-x-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.user_profile.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getUserInitials(comment.user_profile)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-sm">
                {getDisplayName(comment.user_profile)}
              </h4>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                      <Edit2 className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {showEditForm ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                  placeholder="Edit your comment..."
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleEditSubmit}>
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setShowEditForm(false);
                      setEditContent(comment.content);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">
                  {comment.content}
                </p>
                {comment.is_edited && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Edited
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-4 mt-1 ml-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                Reply
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[60px] text-sm"
                placeholder="Write a reply..."
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleReplySubmit}>
                  Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply: any) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  getDisplayName={getDisplayName}
                  currentUserId={currentUserId}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function CommentsSection({ videoId, onClose }: CommentsSectionProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  
  const {
    comments,
    loading,
    submitting,
    addComment,
    editComment,
    deleteComment,
    getDisplayName,
  } = useVideoComments({ videoId });

  const handleAddComment = async () => {
    if (newComment.trim()) {
      const success = await addComment(newComment);
      if (success) {
        setNewComment('');
      }
    }
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    await addComment(content, parentCommentId);
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const email = user.email || '';
    return email.charAt(0).toUpperCase();
  };

  return (
    <Card className="border-0 rounded-none">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* New Comment Form */}
        {user && (
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
                placeholder="Write a comment..."
              />
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onEdit={editComment}
                onDelete={deleteComment}
                getDisplayName={getDisplayName}
                currentUserId={user?.id}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No comments yet. Be the first to comment!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 