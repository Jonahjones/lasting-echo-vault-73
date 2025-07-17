
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Play, Heart, Search, Globe, Lock, Edit, Trash2, Clock, MessageCircle, Shield, Crown, Star, Check, Zap, Archive, Users, Lightbulb, Inbox, User, Calendar, Eye, SlidersHorizontal, ArrowUpDown, Filter, X, Video, Grid3x3, List } from "lucide-react";
import { useVideoLibrary, SavedVideo } from "@/contexts/VideoLibraryContext";
import { usePricing } from "@/contexts/PricingContext";
import { EditVideoModal } from "@/components/EditVideoModal";
import { VideoLikeButton } from "@/components/VideoLikeButton";
import { useVideoShares } from "@/hooks/useVideoShares";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { value: "all", label: "All Messages", icon: Globe, emoji: "🌍" },
  { value: "wisdom", label: "Wisdom", icon: Lightbulb, emoji: "💡" },
  { value: "story", label: "Stories", icon: MessageCircle, emoji: "📖" },
  { value: "love", label: "Love", icon: Heart, emoji: "❤️" },
  { value: "advice", label: "Advice", icon: Clock, emoji: "⏰" }
];

// Dynamic pricing plans are now managed via PricingContext
// Legacy interface for icon mapping
const iconMap: Record<string, any> = {
  Archive,
  Crown,
  Star,
  Heart,
  Shield,
  Users,
  Zap,
  Check
};

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Dynamic pricing
  const { plans: storagePlans, loading: pricingLoading, error: pricingError } = usePricing();
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  // Premium banner dismissal state - persistent across sessions
  const [isPremiumBannerDismissed, setIsPremiumBannerDismissed] = useState(() => {
    const dismissed = localStorage.getItem('premiumBannerDismissed');
    const dismissedAt = localStorage.getItem('premiumBannerDismissedAt');
    
    if (dismissed && dismissedAt) {
      const dismissDate = new Date(dismissedAt);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show banner again after 7 days
      if (daysSinceDismissed < 7) {
        return true;
      } else {
        // Clear old dismissal and show banner again
        localStorage.removeItem('premiumBannerDismissed');
        localStorage.removeItem('premiumBannerDismissedAt');
        return false;
      }
    }
    
    return false;
  });
  
  const { videos, videoCount, storageLimit, storageUsed, storagePercentage, updateVideo, deleteVideo } = useVideoLibrary();
  const { sharedWithMe, markAsViewed } = useVideoShares();
  const { toast } = useToast();

  // Calculate video percentage for display
  const videoPercentage = (videoCount / storageLimit) * 100;

  // Enhanced filtering and sorting state
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const savedView = localStorage.getItem('videoLibraryViewMode');
    return (savedView === 'grid' || savedView === 'list') ? savedView : 'list';
  });

  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    localStorage.setItem('videoLibraryViewMode', newMode);
  };

  const filteredVideos = videos.filter(video => {
    // Enhanced search - includes title, description, and prompt
    const matchesSearch = !searchTerm || 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.prompt && video.prompt.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const videoDate = new Date(video.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = videoDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = videoDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          matchesDate = videoDate >= monthAgo;
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          matchesDate = videoDate >= yearAgo;
          break;
      }
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData?.icon || Heart;
  };

  const handleEditVideo = (updates: Partial<SavedVideo>) => {
    if (!editingVideo) return;
    updateVideo(editingVideo, updates);
    toast({
      title: "Video Updated",
      description: "Your video settings have been saved.",
    });
  };

  const handleDeleteVideo = (videoId: string) => {
    deleteVideo(videoId);
    toast({
      title: "Video Deleted",
      description: "Your video has been removed from the library.",
    });
  };

  const handleDismissPremiumBanner = () => {
    setIsPremiumBannerDismissed(true);
    localStorage.setItem('premiumBannerDismissed', 'true');
    localStorage.setItem('premiumBannerDismissedAt', new Date().toISOString());
    
    toast({
      title: "Banner Hidden",
      description: "The upgrade banner will be hidden for 7 days.",
      duration: 3000,
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

  const [playingVideoTitle, setPlayingVideoTitle] = useState<string | null>(null);

  const handlePlayVideo = (video: SavedVideo) => {
    if (!video.videoUrl) {
      toast({
        title: 'Playback Error',
        description: 'Video URL not available. Please try again.',
        variant: 'destructive'
      });
      return;
    }
    setPlayingVideo(video.videoUrl);
    setPlayingVideoTitle(video.title);
  };

  const handlePlaySharedVideo = async (share: any) => {
    if (!share.video?.file_path) return;

    try {
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(share.video.file_path);

      setPlayingVideo(publicUrl);
      setPlayingVideoTitle(share.video?.title || 'Shared Video');
      
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

  // Group shared videos by sender
  const groupedSharedVideos = sharedWithMe.reduce((groups: Record<string, any[]>, share) => {
    const senderName = getSenderName(share);
    if (!groups[senderName]) {
      groups[senderName] = [];
    }
    groups[senderName].push(share);
    return groups;
  }, {});

  const editingVideoData = editingVideo ? videos.find(v => v.id === editingVideo) : null;

  return (
    <div className="min-h-screen bg-gradient-surface pb-20">
      <div className="container mx-auto px-4 py-8 max-w-sm">
        <div className="mx-auto">
          {/* Compact Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-foreground">
              Library
            </h1>
          </div>

          {/* Smart, Compact CTA Card - Only show if not dismissed and approaching limit */}
          {!isPremiumBannerDismissed && videoCount >= storageLimit - 2 && (
            <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200/50 shadow-gentle mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-200/20 to-amber-300/20 rounded-full -translate-y-8 translate-x-8"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissPremiumBanner}
                className="absolute top-2 right-2 w-6 h-6 p-0 text-muted-foreground/60 hover:text-muted-foreground z-10"
              >
                <span className="sr-only">Dismiss</span>×
              </Button>
              
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground mb-1 text-base">
                      You're just {storageLimit - videoCount} video{storageLimit - videoCount === 1 ? '' : 's'} away from your limit.
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Go Premium for unlimited recordings, priority support, and enhanced storage.
                    </p>
                    <Button 
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact Mobile Tabs */}
          <Tabs defaultValue="messages" className="w-full">
            {/* Sticky Tab Header - Minimal */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/20 -mx-4 px-4 mb-2">
              <TabsList className="flex w-full h-10 bg-transparent p-0 gap-4 justify-center">
                <TabsTrigger 
                  value="messages" 
                  className="flex-none px-2 py-2 bg-transparent border-none shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-all duration-200"
                >
                  My Videos
                </TabsTrigger>
                <TabsTrigger 
                  value="shared" 
                  className="flex-none px-2 py-2 bg-transparent border-none shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-all duration-200 relative"
                >
                  Shared
                  {sharedWithMe.filter(s => !s.viewed_at).length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center p-0 text-xs">
                      {sharedWithMe.filter(s => !s.viewed_at).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="storage" 
                  className="flex-none px-2 py-2 bg-transparent border-none shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-all duration-200"
                >
                  Storage
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="messages" className="space-y-2">
              {/* Compact Filter Section */}
              <div className="sticky top-10 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 space-y-2">
                {/* Single Row: Search + Sort/Date Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Search videos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-8 h-9 text-sm bg-muted/20 border-border/40 rounded-lg placeholder:text-muted-foreground/60 focus:bg-background focus:border-primary/40 transition-all duration-200"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 p-0 text-muted-foreground/60 hover:text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {/* Compact Sort/Date Buttons */}
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-9 h-9 p-0 border-border/40 bg-muted/20 hover:bg-muted/40">
                      <ArrowUpDown className="w-4 h-4" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="title">A-Z</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                    <SelectTrigger className="w-9 h-9 p-0 border-border/40 bg-muted/20 hover:bg-muted/40">
                      <Calendar className="w-4 h-4" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleViewMode}
                    className="w-9 h-9 p-0 border-border/40 bg-muted/20 hover:bg-muted/40"
                    aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                  >
                    {viewMode === 'grid' ? (
                      <List className="w-4 h-4" />
                    ) : (
                      <Grid3x3 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Horizontal Scrollable Category Chips */}
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-1.5 pb-1 min-w-max">
                    {categories.map((category) => {
                      const isSelected = selectedCategory === category.value;
                      return (
                        <button
                          key={category.value}
                          onClick={() => setSelectedCategory(category.value)}
                          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 touch-manipulation min-h-[32px] ${
                            isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : "border border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                          }`}
                        >
                          <span className="text-xs">{category.emoji}</span>
                          <span>{category.label}</span>
                        </button>
                      );
                    })}
                    {/* Clear filters at end of chips */}
                    {(searchTerm || selectedCategory !== 'all' || dateFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("all");
                          setDateFilter("all");
                        }}
                        className="text-xs text-primary hover:text-primary/80 underline px-2 py-1 min-h-[32px] flex items-center whitespace-nowrap"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Compact Results Count */}
              {filteredVideos.length !== videos.length && (
                <div className="text-xs text-muted-foreground mb-1 px-1">
                  {filteredVideos.length} results
                </div>
              )}

              {/* Videos Display - Grid or List View */}
              {filteredVideos.length === 0 ? (
                /* Friendly Empty State */
                <div className="text-center py-12 col-span-full">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    {videos.length === 0 ? (
                      <Video className="w-7 h-7 text-muted-foreground" />
                    ) : (
                      <Search className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {videos.length === 0 ? "No videos yet" : "No videos match your search"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
                    {videos.length === 0 
                      ? "Ready to capture your first precious memory? Every story matters." 
                      : searchTerm || selectedCategory !== 'all' || dateFilter !== 'all'
                        ? "Try different keywords, check your filters, or explore other categories."
                        : "Start by recording your first video message"
                    }
                  </p>
                  <div className="space-y-3">
                    {videos.length === 0 ? (
                      <Button asChild className="bg-gradient-primary">
                        <Link to="/record">
                          <Video className="w-4 h-4 mr-2" />
                          Record Your First Memory
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("all");
                          setDateFilter("all");
                        }}>
                          <X className="w-4 h-4 mr-2" />
                          Clear All Filters
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          or try a <button 
                            onClick={() => setSearchTerm("")}
                            className="text-primary hover:underline"
                          >
                            different search
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredVideos.map((video) => {
                    const CategoryIcon = getCategoryIcon(video.category);
                    const videoDate = new Date(video.createdAt);
                    
                    return (
                      <Card key={video.id} className="border border-border/50 hover:border-border transition-all duration-200 group bg-background">
                        <CardContent className="p-0">
                          {/* Compact Video Thumbnail */}
                          <div 
                            className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden cursor-pointer"
                            onClick={() => handlePlayVideo(video)}
                          >
                            <video
                              src={video.videoUrl}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-8 h-8 text-white/90" />
                            </div>
                            
                            {/* Compact Overlays */}
                            <div className="absolute top-1 left-1 right-1 flex items-start justify-between">
                              <Badge variant="secondary" className="bg-black/60 text-white border-none backdrop-blur-sm text-xs px-1 py-0.5">
                                <CategoryIcon className="w-2 h-2 mr-0.5" />
                                <span className="text-xs">{video.category}</span>
                              </Badge>
                              {video.isPublic ? (
                                <Globe className="w-3 h-3 text-white/90 bg-black/60 rounded-full p-0.5" />
                              ) : (
                                <Lock className="w-3 h-3 text-white/90 bg-black/60 rounded-full p-0.5" />
                              )}
                            </div>

                            <div className="absolute bottom-1 left-1 right-1 flex items-end justify-between">
                              <div className="bg-black/60 text-white text-xs px-1 py-0.5 rounded backdrop-blur-sm">
                                {video.duration}
                              </div>
                            </div>
                          </div>

                          {/* Compact Content */}
                          <div className="p-2">
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <h3 className="font-medium text-foreground text-xs line-clamp-2 flex-1 leading-tight">
                                {video.title}
                              </h3>
                              <div className="flex space-x-0.5 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVideo(video.id);
                                  }}
                                  className="w-5 h-5 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVideo(video.id);
                                  }}
                                  className="w-5 h-5 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <VideoLikeButton videoId={video.id} />
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(videoDate, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVideos.map((video) => {
                    const CategoryIcon = getCategoryIcon(video.category);
                    const videoDate = new Date(video.createdAt);
                    
                    return (
                      <Card key={video.id} className="border border-border/50 hover:border-border transition-all duration-200 group bg-background">
                        <CardContent className="p-0">
                          {/* Enhanced Video Thumbnail with Overlays */}
                          <div 
                            className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden cursor-pointer"
                            onClick={() => handlePlayVideo(video)}
                          >
                            <video
                              src={video.videoUrl}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-10 h-10 text-white/90" />
                            </div>
                            
                            {/* Top Overlay - Category & Privacy */}
                            <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                              <Badge variant="secondary" className="bg-black/60 text-white border-none backdrop-blur-sm text-xs">
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {video.category}
                              </Badge>
                              <div className="bg-black/60 rounded-full p-1 backdrop-blur-sm">
                                {video.isPublic ? (
                                  <Globe className="w-3 h-3 text-white/90" />
                                ) : (
                                  <Lock className="w-3 h-3 text-white/90" />
                                )}
                              </div>
                            </div>

                            {/* Bottom Overlay - Duration & Date */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                              <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {video.duration}
                              </div>
                              <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                                {formatDistanceToNow(videoDate, { addSuffix: true })}
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Content Section */}
                          <div className="p-3">
                            {/* Title and Actions Row */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-foreground text-sm line-clamp-2 flex-1">
                                {video.title}
                              </h3>
                              <div className="flex space-x-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingVideo(video.id)}
                                  className="w-7 h-7 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteVideo(video.id)}
                                  className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Prompt Subtitle (if available) */}
                            {video.prompt && (
                              <div className="mb-2">
                                <p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/30 px-2 py-1 rounded">
                                  "{video.prompt}"
                                </p>
                              </div>
                            )}
                            
                            {/* Description */}
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                              {video.description}
                            </p>
                            
                            {/* Bottom Row - Likes and Status */}
                            <div className="flex items-center justify-between">
                              <VideoLikeButton videoId={video.id} />
                              <div className="flex items-center space-x-2">
                                {video.isPublic ? (
                                  <Badge variant="secondary" className="text-xs">Public</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Private</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {videoDate.toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Shared With Me Tab */}
            <TabsContent value="shared" className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Shared With You
                </h2>
                <p className="text-muted-foreground">
                  Videos and memories shared by friends and family
                </p>
              </div>

              {Object.keys(groupedSharedVideos).length === 0 ? (
                <Card className="shadow-gentle border-primary/10">
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-gentle mb-4">
                      <Heart className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No shared videos yet
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      When friends or family share memories with you, they'll appear here grouped by sender.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSharedVideos).map(([senderName, shares]) => (
                    <div key={senderName} className="space-y-4">
                      {/* Sender Header */}
                      <div className="flex items-center space-x-3 px-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">From {senderName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {shares.length} {shares.length === 1 ? 'memory' : 'memories'} shared
                            {shares.some(s => !s.viewed_at) && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                {shares.filter(s => !s.viewed_at).length} new
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Videos from this sender */}
                      <div className="space-y-3 pl-6 border-l-2 border-muted">
                        {shares.map((share) => (
                          <Card 
                            key={share.id} 
                            className={`transition-all duration-200 hover:shadow-md ${
                              !share.viewed_at ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                {/* Video Thumbnail/Icon */}
                                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-gentle flex-shrink-0">
                                  <Play className="w-6 h-6 text-primary-foreground" />
                                </div>

                                {/* Video Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-semibold text-foreground truncate">
                                        {share.video?.title || 'Untitled Video'}
                                      </h4>
                                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>Shared {formatDistanceToNow(new Date(share.shared_at), { addSuffix: true })}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      {!share.viewed_at && (
                                        <Badge variant="default" className="bg-primary text-xs">
                                          New
                                        </Badge>
                                      )}
                                      {share.is_legacy_release && (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                                          Legacy
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {share.video?.description && (
                                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                      {share.video.description}
                                    </p>
                                  )}

                                  {/* Special message for legacy releases */}
                                  {share.is_legacy_release && (
                                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                                      <p className="text-amber-800 dark:text-amber-200 text-sm">
                                        <strong>Legacy Memory:</strong> This memory was released to you by {share.released_by_name || 'a trusted contact'} following the passing of {senderName}.
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <Button
                                      onClick={() => handlePlaySharedVideo(share)}
                                      className="bg-gradient-primary hover:shadow-gentle transition-all duration-300"
                                      size="sm"
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
                      
                      {/* Separator between senders */}
                      {Object.keys(groupedSharedVideos).indexOf(senderName) < Object.keys(groupedSharedVideos).length - 1 && (
                        <Separator className="my-6" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Storage Tab */}
            <TabsContent value="storage" className="space-y-6">
              {/* Current Usage */}
              <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Archive className="w-5 h-5 text-primary" />
                      <span>Storage Usage</span>
                    </CardTitle>
                    <CardDescription>
                      {storageUsed.toFixed(1)} GB of 2 GB used
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={storagePercentage} className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {storagePercentage > 80 && "Consider upgrading for more storage space"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span>Video Messages</span>
                    </CardTitle>
                    <CardDescription>
                      {videoCount} of {storageLimit} messages created
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={videoPercentage} className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {videoPercentage > 80 && "You're close to your video limit"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Security Features */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Your Security & Privacy</span>
                  </CardTitle>
                  <CardDescription>
                    Military-grade protection for your most precious memories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">End-to-End Encryption</h4>
                        <p className="text-sm text-muted-foreground">
                          Your videos are encrypted before leaving your device
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center mt-1">
                        <Clock className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Permanent Storage</h4>
                        <p className="text-sm text-muted-foreground">
                          Your legacy is preserved forever, across generations
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary-glow/10 rounded-lg flex items-center justify-center mt-1">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Instant Access</h4>
                        <p className="text-sm text-muted-foreground">
                          Trusted contacts receive secure, immediate access
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Storage Plans */}
              <div>
                <h2 className="text-2xl font-bold text-foreground text-center mb-6">
                  Choose Your Legacy Storage Plan
                </h2>
                
                <div className="grid grid-cols-1 gap-6">
                  {storagePlans.map((plan) => {
                    const IconComponent = iconMap[plan.icon_name] || Archive;
                    const storageDisplay = plan.storage_gb ? `${plan.storage_gb} GB` : 'Unlimited';
                    const currentPrice = plan.promotional_price || plan.price;
                    const isOnSale = plan.promotional_price && 
                      (!plan.promo_valid_until || new Date(plan.promo_valid_until) > new Date());
                    
                    return (
                      <Card 
                        key={plan.id} 
                        className={`shadow-card cursor-pointer transition-all duration-300 relative ${
                          selectedPlan === plan.plan_id 
                            ? "ring-2 ring-primary shadow-gentle" 
                            : "hover:shadow-gentle"
                        } ${plan.is_popular ? "border-primary/50" : ""}`}
                        onClick={() => setSelectedPlan(plan.plan_id)}
                      >
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-gradient-accent text-accent-foreground px-3 py-1">
                              Most Popular
                            </Badge>
                          </div>
                        )}
                        
                        <CardHeader className="text-center pb-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <IconComponent className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <div className="text-3xl font-bold text-foreground">
                            {isOnSale && (
                              <span className="text-lg text-muted-foreground line-through mr-2">
                                ${plan.price}
                              </span>
                            )}
                            ${currentPrice}
                            <span className="text-base font-normal text-muted-foreground ml-1">
                              {plan.is_one_time ? 'one-time' : 'monthly'}
                            </span>
                          </div>
                          <CardDescription className="text-sm">
                            {storageDisplay} • Up to {plan.max_videos === 999 ? 'Unlimited' : plan.max_videos} videos
                          </CardDescription>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {plan.description}
                            </p>
                          )}
                        </CardHeader>
                        
                        <CardContent>
                          <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start space-x-2 text-sm">
                                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <Button 
                            variant={selectedPlan === plan.plan_id ? "default" : "outline"}
                            className="w-full"
                            size="lg"
                          >
                            {selectedPlan === plan.plan_id ? "Selected" : "Choose Plan"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Purchase Flow */}
              {selectedPlan && (
                <Card className="shadow-card animate-gentle-scale">
                  <CardHeader>
                    <CardTitle className="text-center">Complete Your Purchase</CardTitle>
                    <CardDescription className="text-center">
                      Secure your legacy with one-time payment, lifetime access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="text-2xl font-bold text-foreground mb-2">
                        {storagePlans.find(p => p.plan_id === selectedPlan)?.name}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        ${storagePlans.find(p => p.plan_id === selectedPlan)?.promotional_price || 
                          storagePlans.find(p => p.plan_id === selectedPlan)?.price} - One-time payment
                      </div>
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button size="lg" variant="default" className="min-w-32">
                        Secure Payment
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => setSelectedPlan(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      30-day money-back guarantee • Secure payment processing
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Edit Video Modal */}
          {editingVideoData && (
            <EditVideoModal
              video={editingVideoData}
              isOpen={!!editingVideo}
              onClose={() => setEditingVideo(null)}
              onSave={handleEditVideo}
            />
          )}

          {/* Video Player Modal */}
          {playingVideo && (
            <Dialog 
              open={!!playingVideo} 
              onOpenChange={() => {
                setPlayingVideo(null);
                setPlayingVideoTitle(null);
              }}
            >
              <DialogContent className="max-w-4xl w-full p-0">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle>{playingVideoTitle || 'Video Player'}</DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <video
                    src={playingVideo}
                    controls
                    autoPlay
                    className="w-full max-h-[70vh] rounded-lg"
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
