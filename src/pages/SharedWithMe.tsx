import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Inbox, 
  Play, 
  Calendar, 
  User, 
  Eye, 
  Trash2, 
  Archive,
  Heart,
  CheckSquare,
  Square
} from 'lucide-react';
import { useVideoShares } from '@/hooks/useVideoShares';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function SharedWithMe() {
  const { sharedWithMe, loading, markAsViewed } = useVideoShares();
  const [selectedShares, setSelectedShares] = useState<string[]>([]);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleSelectShare = (shareId: string) => {
    setSelectedShares(prev => 
      prev.includes(shareId) 
        ? prev.filter(id => id !== shareId)
        : [...prev, shareId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedShares.length === sharedWithMe.length) {
      setSelectedShares([]);
    } else {
      setSelectedShares(sharedWithMe.map(share => share.id));
    }
  };

  const handlePlayVideo = async (share: any) => {
    if (!share.video?.file_path) return;

    try {
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(share.video.file_path);

      setPlayingVideo(publicUrl);
      
      // Mark as viewed if not already
      if (!share.viewed_at) {
        await markAsViewed(share.id);
      }
    } catch (error) {
      console.error('Error playing video:', error);
      toast({
        title: 'Playback Error',
        description: 'Could not load video. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const markSelectedAsViewed = async () => {
    for (const shareId of selectedShares) {
      const share = sharedWithMe.find(s => s.id === shareId);
      if (share && !share.viewed_at) {
        await markAsViewed(shareId);
      }
    }
    setSelectedShares([]);
    toast({
      title: 'Marked as Viewed',
      description: `${selectedShares.length} video${selectedShares.length > 1 ? 's' : ''} marked as viewed`
    });
  };

  const deleteSelected = async () => {
    // Note: This would typically soft-delete from user's inbox, not hard delete
    // For now, we'll show a placeholder action
    toast({
      title: 'Delete Action',
      description: 'Delete functionality will be implemented here',
    });
  };

  const getSenderName = (share: any) => {
    const profile = share.video?.owner_profile;
    if (profile?.display_name) return profile.display_name;
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return 'Unknown Sender';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center pb-20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <Inbox className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your shared videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface pb-20">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-gentle">
              <Inbox className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Shared With Me
              </h1>
              <p className="text-lg text-muted-foreground">
                Videos shared by friends and family
              </p>
            </div>
          </div>
          
          {sharedWithMe.length > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {sharedWithMe.filter(s => !s.viewed_at).length} new
            </Badge>
          )}
        </div>

        {/* Bulk Actions */}
        {sharedWithMe.length > 0 && (
          <div className="flex items-center justify-between bg-card rounded-lg p-4 mb-6 border shadow-sm">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center space-x-2"
              >
                {selectedShares.length === sharedWithMe.length ? 
                  <CheckSquare className="w-4 h-4" /> : 
                  <Square className="w-4 h-4" />
                }
                <span>
                  {selectedShares.length === sharedWithMe.length ? 'Deselect All' : 'Select All'}
                </span>
              </Button>
              
              {selectedShares.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedShares.length} selected
                </span>
              )}
            </div>

            {selectedShares.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markSelectedAsViewed}
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Mark Viewed</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteSelected}
                  className="flex items-center space-x-2 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 max-w-4xl mx-auto">
        {sharedWithMe.length === 0 ? (
          // Empty State
          <Card className="max-w-md mx-auto shadow-gentle border-primary/10">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-gentle mb-4">
                <Heart className="w-10 h-10 text-primary-foreground" />
              </div>
              
              <CardTitle className="text-2xl font-serif font-light text-foreground">
                No videos shared with you (yet)
              </CardTitle>
              <p className="text-muted-foreground leading-relaxed">
                When friends or family send you memories, they'll appear here.
              </p>
            </CardHeader>
          </Card>
        ) : (
          // Video List
          <div className="space-y-4">
            {sharedWithMe.map((share) => (
              <Card 
                key={share.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  !share.viewed_at ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={selectedShares.includes(share.id)}
                      onCheckedChange={() => toggleSelectShare(share.id)}
                      className="mt-1"
                    />

                    {/* Video Thumbnail/Icon */}
                    <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center shadow-gentle flex-shrink-0">
                      <Play className="w-8 h-8 text-primary-foreground" />
                    </div>

                    {/* Video Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {share.video?.title || 'Untitled Video'}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>From {getSenderName(share)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!share.viewed_at && (
                            <Badge variant="default" className="bg-primary">
                              New
                            </Badge>
                          )}
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDistanceToNow(new Date(share.shared_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      {share.video?.description && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {share.video.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <Button
                          onClick={() => handlePlayVideo(share)}
                          className="bg-gradient-primary hover:shadow-gentle transition-all duration-300"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Watch Video
                        </Button>

                        {share.viewed_at && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Eye className="w-4 h-4 mr-1" />
                            Viewed {formatDistanceToNow(new Date(share.viewed_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full">
            <Button
              onClick={() => setPlayingVideo(null)}
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              variant="ghost"
              size="sm"
            >
              ✕ Close
            </Button>
            <video
              src={playingVideo}
              controls
              autoPlay
              className="w-full max-h-[70vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}