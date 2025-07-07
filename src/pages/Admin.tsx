import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, EyeOff, Video, User, Calendar, Search, LogOut, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoPreview } from "@/components/admin/VideoPreview";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";

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
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<AdminVideo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const { toast } = useToast();
  const { user } = useAuth();
  const { videos: realtimeVideos, isConnected, optimisticToggleFeatured } = useRealtime();

  const ADMIN_PASSWORD = "Admin3272!";
  const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  console.log('🔍 Debug: ADMIN_PASSWORD is set to:', ADMIN_PASSWORD);

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

  // Use real-time videos from context instead of local state
  useEffect(() => {
    if (isAuthenticated) {
      setVideos(realtimeVideos);
    }
  }, [realtimeVideos, isAuthenticated]);

  // Filter real-time videos based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredVideos(realtimeVideos);
      return;
    }

    const filtered = realtimeVideos.filter(video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVideos(filtered);
  }, [realtimeVideos, searchTerm]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First try to sign in with provided credentials
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword
      });

      // If login fails and this is the admin email, try to create the account
      if (authError && email === 'jonah3272@gmail.com') {
        console.log('🔧 Creating admin account for jonah3272@gmail.com...');
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: 'jonah3272@gmail.com',
          password: loginPassword, // Use the password they entered
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });

        if (signupError) {
          toast({
            title: "Account Creation Failed",
            description: signupError.message,
            variant: "destructive"
          });
          return;
        }

        authData = signupData;
        console.log('✅ Admin account created:', authData.user?.id);
        
        toast({
          title: "Account Created",
          description: "Admin account created successfully. You can now access the admin panel.",
        });
      } else if (authError) {
        toast({
          title: "Login Failed",
          description: authError.message,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ User logged in:', authData.user?.id);
      
      // If this is the admin email, add them to admin_users table
      if (email === 'jonah3272@gmail.com' && authData.user) {
        try {
          const { error: adminError } = await supabase
            .from('admin_users')
            .upsert({ 
              user_id: authData.user.id, 
              role: 'super_admin' 
            }, { 
              onConflict: 'user_id' 
            });
          
          if (adminError) {
            console.error('❌ Admin registration error:', adminError);
            toast({
              title: "Admin Setup Error",
              description: "Could not register admin permissions. Please try again.",
              variant: "destructive"
            });
            return;
          }

          console.log('✅ User added to admin_users table');
          setIsAuthenticated(true);
          loadVideos();
          
          toast({
            title: "Admin Access Granted",
            description: "Welcome to the admin panel",
          });
          
          setShowLoginForm(false);
          setEmail("");
          setLoginPassword("");
          return;
        } catch (error) {
          console.error('❌ Exception during admin setup:', error);
          toast({
            title: "Admin Setup Error", 
            description: "Could not register admin permissions. Please try again.",
            variant: "destructive"
          });
          return;
        }
      }
      
      setShowLoginForm(false);
      setEmail("");
      setLoginPassword("");
      
      toast({
        title: "Login Successful",
        description: "You can now enter the admin password to access the panel.",
      });
    } catch (error) {
      console.error('❌ Login failed:', error);
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple direct password check
    if (password === "Admin3272!") {
      try {
        setIsAuthenticated(true);
        setLastActivity(Date.now());
        
        loadVideos();
        
        // Log admin access
        logAdminAction("LOGIN", { 
          timestamp: new Date().toISOString(),
          access_type: 'direct_password'
        });
        
        toast({
          title: "Admin Access Granted",
          description: "Welcome to the admin panel",
        });
      } catch (error) {
        console.error('❌ Admin authentication failed:', error);
        toast({
          title: "Admin Access Error", 
          description: "Authentication failed. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      console.log('❌ Password mismatch. Entered:', `"${password}"`, 'Expected: "Admin3272!"');
      toast({
        title: "Access Denied",
        description: "Invalid password",
        variant: "destructive"
      });
    }
    setPassword("");
  };

  const handleLogout = async () => {
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
    // Optimistic update first
    optimisticToggleFeatured(videoId);
    
    const newFeaturedState = !currentlyFeatured;
    console.log(`🔄 Admin toggling video ${videoId}: ${currentlyFeatured} → ${newFeaturedState}`);
    
    try {
      const response = await fetch(`https://fradbhfppmwjcouodahf.supabase.co/functions/v1/admin-toggle-featured`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYWRiaGZwcG13amNvdW9kYWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDkxNDMsImV4cCI6MjA2NzIyNTE0M30.HlIxWduJjc5kXnLzCYxY688dSeT1yj5CfFyjjuZclFw`,
        },
        body: JSON.stringify({
          videoId,
          is_featured: newFeaturedState,
          admin_password: 'Admin3272!'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Admin operation failed');
      }

      toast({
        title: newFeaturedState ? "Video Featured!" : "Video Unfeatured",
        description: newFeaturedState ? 
          "Video will now appear in public feed" : 
          "Video removed from public feed",
      });

    } catch (error) {
      console.error('❌ Admin toggle failed:', error);
      // Rollback optimistic update on error
      optimisticToggleFeatured(videoId);
      
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
                {!user && !showLoginForm && "Login to your account or enter admin password directly"}
                {!user && showLoginForm && "Enter your account credentials to login"}
                {user && "Enter the admin password to access the panel"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!user && showLoginForm ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Login to Account
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowLoginForm(false)}
                  className="w-full"
                >
                  Use Admin Password Instead
                </Button>
              </form>
            ) : (
              /* Admin Password Form */
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password</Label>
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
                {!user && (
                  <>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowLoginForm(true)}
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Login to Account First
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setPassword("");
                        setEmail("");
                        setLoginPassword("");
                        setShowLoginForm(false);
                        console.log('🔄 Reset form state');
                      }}
                      className="w-full text-xs"
                    >
                      Reset Form
                    </Button>
                  </>
                )}
              </form>
            )}
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