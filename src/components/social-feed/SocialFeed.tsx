import React, { useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { SocialVideoCard } from './SocialVideoCard';
import { useToast } from '@/hooks/use-toast';

interface SocialFeedProps {
  className?: string;
  autoPlayVideos?: boolean;
  pageSize?: number;
}

export function SocialFeed({ 
  className = '', 
  autoPlayVideos = true,
  pageSize = 10 
}: SocialFeedProps) {
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const { 
    videos, 
    loading, 
    refreshing, 
    hasMore, 
    loadMore, 
    refresh, 
    toggleLike 
  } = useSocialFeed({ pageSize });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loadMore, loading, hasMore]);

  // Pull to refresh functionality
  const handlePullToRefresh = useCallback(() => {
    if (refreshing) return;
    refresh();
  }, [refresh, refreshing]);

  // Handle video sharing
  const handleShare = async (video: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: video.description || 'Check out this memory',
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Video link has been copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Sharing failed",
        description: "Failed to share video. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="w-full max-w-md mx-auto space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden animate-pulse">
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2 mb-4" />
            <div className="aspect-video bg-muted rounded-lg mb-4" />
            <div className="flex space-x-6">
              <div className="h-4 bg-muted rounded w-8" />
              <div className="h-4 bg-muted rounded w-8" />
              <div className="h-4 bg-muted rounded w-8" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No videos yet</h3>
        <p className="text-muted-foreground mb-4">
          Your social feed will appear here as friends share videos with you or make their videos public.
        </p>
        <Button onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Feed
        </Button>
      </CardContent>
    </Card>
  );

  // Error state
  const ErrorState = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
        <p className="text-muted-foreground mb-4">
          Failed to load your feed. Please try again.
        </p>
        <Button onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Pull to Refresh Indicator */}
      {refreshing && (
        <div className="flex justify-center py-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Feed Container */}
      <div 
        ref={feedRef}
        className="space-y-6 pb-20"
        style={{ minHeight: '100vh' }}
      >
        {/* Loading State */}
        {loading && videos.length === 0 && <LoadingSkeleton />}

        {/* Videos */}
        {videos.map((video, index) => (
          <SocialVideoCard
            key={video.id}
            video={video}
            onLike={toggleLike}
            onShare={handleShare}
            autoPlay={autoPlayVideos}
            className="w-full max-w-md mx-auto"
          />
        ))}

        {/* Empty State */}
        {!loading && videos.length === 0 && <EmptyState />}

        {/* Load More Trigger */}
        {hasMore && (
          <div 
            ref={loadMoreRef}
            className="flex justify-center py-8"
          >
            {loading ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading more videos...</span>
              </div>
            ) : (
              <Button 
                variant="outline" 
                onClick={loadMore}
                className="w-full max-w-md"
              >
                Load More Videos
              </Button>
            )}
          </div>
        )}

        {/* End of Feed */}
        {!loading && !hasMore && videos.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">You're all caught up! 🎉</p>
            <Button 
              variant="ghost" 
              onClick={refresh}
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Feed
            </Button>
          </div>
        )}
      </div>

      {/* Floating Refresh Button (Hidden on mobile to avoid conflicts) */}
      <div className="fixed bottom-24 right-4 hidden lg:block">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={handlePullToRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
} 