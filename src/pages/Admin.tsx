import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, EyeOff, Video, User, Calendar, Search, LogOut, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoPreview } from "@/components/admin/VideoPreview";
import { useAuth } from "@/contexts/AuthContext";

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

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<AdminVideo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const { toast } = useToast();
  const { user } = useAuth();

  const ADMIN_PASSWORD = "Admin3272!";
  const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  // Auto-logout after inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = () => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        handleLogout();
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity",
          variant: "destructive"
        });
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    
    const resetActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousedown', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('scroll', resetActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousedown', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('scroll', resetActivity);
    };
  }, [isAuthenticated, lastActivity]);

  // Filter videos based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredVideos(videos);
      return;
    }

    const filtered = videos.filter(video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVideos(filtered);
  }, [videos, searchTerm]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      // Check if user is logged into Supabase
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log into your Supabase account first, then access the admin panel.",
          variant: "destructive"
        });
        return;
      }

      try {
        console.log('🔧 Adding user to admin_users table:', user.id);
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .upsert({ 
            user_id: user.id, 
            role: 'moderator' 
          }, { 
            onConflict: 'user_id' 
          })
          .select();
        
        if (adminError) {
          console.error('❌ Failed to add to admin_users:', adminError);
          toast({
            title: "Admin Setup Error",
            description: "Could not register admin permissions. Please try again.",
            variant: "destructive"
          });
          return;
        } else {
          console.log('✅ User successfully added to admin_users table:', adminData);
        }
      } catch (error) {
        console.error('❌ Admin table update failed:', error);
        toast({
          title: "Admin Setup Error", 
          description: "Database error. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      setIsAuthenticated(true);
      setLastActivity(Date.now());
      
      loadVideos();
      
      // Log admin access
      logAdminAction("LOGIN", { timestamp: new Date().toISOString() });
      
      toast({
        title: "Admin Access Granted",
        description: "Welcome to the admin panel",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid password",
        variant: "destructive"
      });
    }
    setPassword("");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    setVideos([]);
    setFilteredVideos([]);
    logAdminAction("LOGOUT", { timestamp: new Date().toISOString() });
  };

  const logAdminAction = async (action: string, details: any) => {
    try {
      await supabase
        .from('admin_access_logs')
        .insert({
          action,
          details,
          ip_address: 'client-ip' // In a real app, you'd get the actual IP
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const loadVideos = async () => {
    setLoading(true);
    try {
      console.log('Admin: Loading all public videos for moderation...');
      
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

      console.log(`Admin: Found ${videosData?.length || 0} public videos`);
      console.log('Admin: Featured status breakdown:', {
        total: videosData?.length || 0,
        featured: videosData?.filter(v => v.is_featured).length || 0,
        notFeatured: videosData?.filter(v => !v.is_featured).length || 0
      });

      // Get user profiles for each video
      const userIds = [...new Set(videosData?.map(v => v.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Get user emails from auth metadata (this would require admin privileges in real scenario)
      const videosWithUserInfo = videosData?.map(video => {
        const profile = profiles?.find(p => p.user_id === video.user_id);
        return {
          ...video,
          user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
          user_email: video.user_id.substring(0, 8) + '...' // Shortened for privacy
        };
      }) || [];

      setVideos(videosWithUserInfo);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (videoId: string, currentlyFeatured: boolean) => {
    const newFeaturedState = !currentlyFeatured;
    console.log(`🔄 Admin toggling video ${videoId}: ${currentlyFeatured} → ${newFeaturedState}`);
    
    try {
      // If user is authenticated to admin panel, they have admin privileges
      console.log('📤 Sending database update...');
      const { data, error } = await supabase
        .from('videos')
        .update({ 
          is_featured: newFeaturedState,
          is_public: true  // Ensure public when featuring
        })
        .eq('id', videoId)
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No rows updated - video not found or permission denied');
        throw new Error('Video not found or insufficient permissions');
      }

      console.log('✅ Database updated successfully:', data[0]);

      // Update local state immediately
      setVideos(prev => prev.map(video => 
        video.id === videoId 
          ? { ...video, is_featured: newFeaturedState, is_public: true }
          : video
      ));

      // Log admin action
      await logAdminAction(
        newFeaturedState ? "FEATURE_VIDEO" : "UNFEATURE_VIDEO", 
        { videoId, title: videos.find(v => v.id === videoId)?.title, success: true }
      );

      toast({
        title: newFeaturedState ? "Video Featured!" : "Video Unfeatured",
        description: newFeaturedState ? 
          "Video will now appear in public feed" : 
          "Video removed from public feed",
      });

    } catch (error) {
      console.error('❌ Toggle failed:', error);
      toast({
        title: "Update Failed",
        description: `Failed to ${newFeaturedState ? 'feature' : 'unfeature'} video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-comfort">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-serif">Admin Access</CardTitle>
              <CardDescription>
                You must be logged into your account first. Then enter the admin password.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="text-center"
                />
              </div>
              <Button type="submit" className="w-full">
                <Lock className="w-4 h-4 mr-2" />
                Access Admin Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-comfort pb-8">
      {/* Admin Header */}
      <div className="bg-card border-b border-border shadow-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
                <Badge variant="destructive" className="text-xs">
                  ADMIN MODE
                </Badge>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search and Stats */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                Public Video Moderation
              </h2>
              <p className="text-muted-foreground">
                Manage which videos appear in the public feed
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Video className="w-4 h-4" />
              <span>{videos.length} total</span>
              <span>•</span>
              <Eye className="w-4 h-4" />
              <span>{videos.filter(v => v.is_featured).length} featured</span>
              
              {/* Test Button */}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={async () => {
                  if (videos.length > 0) {
                    console.log('🧪 Testing admin toggle on first video...');
                    await toggleFeatured(videos[0].id, videos[0].is_featured);
                  }
                }}
                className="ml-4"
              >
                🧪 Test Toggle
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search videos, titles, or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Videos List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card className="shadow-gentle">
            <CardContent className="p-12 text-center">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No Videos Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No videos match your search criteria" : "No public videos to moderate yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="shadow-gentle hover:shadow-comfort transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Video Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 mr-4">
                          <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                            {video.title}
                          </h3>
                          {video.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {video.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={video.is_featured ? "default" : "secondary"}>
                          {video.is_featured ? "Featured" : "Not Featured"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{video.user_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(video.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>👍 {video.likes_count}</span>
                        </div>
                      </div>
                    </div>

                    <Separator orientation="vertical" className="hidden lg:block h-16" />

                     {/* Controls */}
                     <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 lg:min-w-[200px]">
                       {/* Video Preview */}
                       <VideoPreview
                         videoId={video.id}
                         title={video.title}
                         filePath={video.file_path}
                         className="w-full sm:w-auto"
                       />
                       
                       <div className="flex items-center space-x-3">
                         <Label htmlFor={`featured-${video.id}`} className="text-sm font-medium">
                           {video.is_featured ? "Remove from Feed" : "Add to Feed"}
                         </Label>
                         <Switch
                           id={`featured-${video.id}`}
                           checked={video.is_featured}
                           onCheckedChange={() => toggleFeatured(video.id, video.is_featured)}
                         />
                       </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {video.is_featured ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Visible to all</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hidden from feed</span>
                          </>
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
    </div>
  );
}