import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, EyeOff, Video, User, Calendar, Search, LogOut, Lock, Mail, Grid3x3, List, Play } from "lucide-react";
import { LanguageSwitcher } from "@/components/admin/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoPreview } from "@/components/admin/VideoPreview";
import { VideoThumbnailPreview } from "@/components/admin/VideoThumbnailPreview";
import { ConfigurationPanel } from "@/components/admin/ConfigurationPanel";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { EmailTestPanel } from "@/components/admin/EmailTestPanel";
import { ContactDiagnostics } from "@/components/admin/ContactDiagnostics";
import { ContactEmailValidator } from "@/components/admin/ContactEmailValidator";
import { EmailVerificationDiagnostics } from "@/components/admin/EmailVerificationDiagnostics";
import { TrustedContactDebugger } from "@/components/admin/TrustedContactDebugger";
import { TrustedContactSystemDebugger } from "@/components/admin/TrustedContactSystemDebugger";
import { InvitationChecker } from "@/components/admin/InvitationChecker";
import { SchemaMigrationTool } from "@/components/admin/SchemaMigrationTool";
import { GoogleSSOProfileFixer } from "@/components/admin/GoogleSSOProfileFixer";
import { RelationshipMapper } from "@/components/admin/RelationshipMapper";
import { SSOUserContactsDiagnostic } from "@/components/admin/SSOUserContactsDiagnostic";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { EFFECTIVE_TIMING } from "@/config/timing";
import { TrustedContactInvitationTest } from "@/components/admin/TrustedContactInvitationTest";

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
  const [activeTab, setActiveTab] = useState<'videos' | 'configuration' | 'email-test' | 'contact-diagnostics' | 'email-validation' | 'signup-verification' | 'trusted-debug' | 'invitation-checker' | 'sso-fixer' | 'sso-diagnostic' | 'relationship-mapper' | 'schema-migration' | 'trusted-invitation-test'>('videos');
  
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const savedView = localStorage.getItem('adminPanelViewMode');
    return (savedView === 'grid' || savedView === 'list') ? savedView : 'list';
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { videos: realtimeVideos, isConnected, optimisticToggleFeatured } = useRealtime();

  const ADMIN_PASSWORD = "Admin3272!";
  const SESSION_TIMEOUT = EFFECTIVE_TIMING.AUTH.ADMIN_SESSION_TIMEOUT_MINUTES * 60 * 1000;

  console.log('🔍 Debug: ADMIN_PASSWORD is set to:', ADMIN_PASSWORD);

  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    localStorage.setItem('adminPanelViewMode', newMode);
  };

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

    const interval = setInterval(checkTimeout, EFFECTIVE_TIMING.REALTIME.ADMIN_CHECK_INTERVAL_MS);
    
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
    <div className="min-h-screen bg-gradient-surface pb-8">
      {/* Admin Header */}
      <div className="bg-card border-b border-border shadow-card sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-foreground truncate">Admin Panel</h1>
                <Badge variant="destructive" className="text-xs">
                  ADMIN MODE
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <LanguageSwitcher />
              <Button variant="outline" onClick={handleLogout} className="h-9 px-3">
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg w-full max-w-fit">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'videos' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Video Moderation
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'configuration' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              System Configuration
            </button>
            <button
              onClick={() => setActiveTab('email-test')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'email-test' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Email Testing
            </button>
            <button
              onClick={() => setActiveTab('contact-diagnostics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'contact-diagnostics' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Contact Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('email-validation')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'email-validation' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Email Validation
            </button>
            <button
              onClick={() => setActiveTab('signup-verification')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'signup-verification' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Signup Verification
            </button>
            <button
              onClick={() => setActiveTab('trusted-debug')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'trusted-debug' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Trusted Debug
            </button>
            <button
              onClick={() => setActiveTab('invitation-checker')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'invitation-checker' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Invitation Checker
            </button>
            <button
              onClick={() => setActiveTab('sso-fixer')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sso-fixer' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              SSO Profile Fix
            </button>
            <button
              onClick={() => setActiveTab('sso-diagnostic')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sso-diagnostic' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              SSO Contact Debug
            </button>
            <button
              onClick={() => setActiveTab('relationship-mapper')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'relationship-mapper' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Relationship Fix
            </button>
            <button
              onClick={() => setActiveTab('schema-migration')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'schema-migration' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Schema Migration
            </button>
            <button
              onClick={() => setActiveTab('trusted-invitation-test')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'trusted-invitation-test' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Trusted Invitation Test
            </button>
          </div>
        </div>

        {activeTab === 'videos' && (
          <>
        {/* Search and Stats */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="w-full sm:w-auto">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                Public Video Moderation
              </h2>
              <p className="text-muted-foreground">
                Manage which videos appear in the public feed
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Video className="w-4 h-4" />
                <span>{videos.length} total</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{videos.filter(v => v.is_featured).length} featured</span>
              </div>
              
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
                className="ml-0 sm:ml-4"
              >
                🧪 Test Toggle
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search videos, titles, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            
            {/* View Mode Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
              className="w-full sm:w-auto h-12 sm:h-9 sm:px-3"
              aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {viewMode === 'grid' ? (
                <>
                  <List className="w-4 h-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">List View</span>
                </>
              ) : (
                <>
                  <Grid3x3 className="w-4 h-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Grid View</span>
                </>
              )}
            </Button>
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
        ) : viewMode === 'grid' ? (
          /* Grid View - Compact for viewing lots of videos */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredVideos.map((video, index) => (
              <Card key={video.id} className="shadow-gentle hover:shadow-comfort transition-all duration-200 group overflow-hidden">
                <div className="relative">
                  {/* Video Thumbnail at Top */}
                  <VideoThumbnailPreview
                    videoId={video.id}
                    title={video.title}
                    filePath={video.file_path}
                    aspectRatio="video"
                    showQuickPlay={true}
                    priority={index < 6} // Prioritize first 6 videos
                    className="rounded-none"
                  />
                </div>
                <CardContent className="p-4">
                  {/* Compact Video Info */}
                  <div className="space-y-3">
                    {/* Title and Featured Badge */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground text-sm line-clamp-2 leading-tight">
                        {video.title}
                      </h3>
                      <Badge 
                        variant={video.is_featured ? "default" : "secondary"}
                        className="text-xs w-full justify-center"
                      >
                        {video.is_featured ? "Featured" : "Not Featured"}
                      </Badge>
                    </div>

                    {/* Description (if available) */}
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}

                    {/* User and Date */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span className="truncate">{video.user_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(video.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>👍 {video.likes_count}</span>
                      </div>
                    </div>

                    {/* Compact Controls */}
                    <div className="space-y-2 pt-2 border-t border-border/20">
                      {/* Video Preview Button */}
                      <VideoPreview
                        videoId={video.id}
                        title={video.title}
                        filePath={video.file_path}
                        className="w-full"
                      />
                      
                      {/* Feature Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {video.is_featured ? "Featured" : "Hidden"}
                        </span>
                        <Switch
                          id={`featured-grid-${video.id}`}
                          checked={video.is_featured}
                          onCheckedChange={() => toggleFeatured(video.id, video.is_featured)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View - Detailed for comprehensive review */
          <div className="space-y-4">
            {filteredVideos.map((video, index) => (
              <Card key={video.id} className="shadow-gentle hover:shadow-comfort transition-all duration-200 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Thumbnail and Video Info */}
                    <div className="flex gap-4 flex-1">
                      {/* Video Thumbnail */}
                      <div className="flex-shrink-0">
                        <VideoThumbnailPreview
                          videoId={video.id}
                          title={video.title}
                          filePath={video.file_path}
                          aspectRatio="video"
                          showQuickPlay={true}
                          priority={index < 4} // Prioritize first 4 videos in list view
                          className="w-32 md:w-40"
                        />
                      </div>
                      
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
          </>
        )}

        {activeTab === 'configuration' && (
          <ConfigurationPanel />
        )}

        {activeTab === 'email-test' && (
          <EmailTestPanel />
        )}

        {activeTab === 'contact-diagnostics' && (
          <ContactDiagnostics />
        )}

        {activeTab === 'email-validation' && (
          <ContactEmailValidator />
        )}

        {activeTab === 'signup-verification' && (
          <EmailVerificationDiagnostics />
        )}

        {activeTab === 'trusted-debug' && (
          <TrustedContactSystemDebugger />
        )}

        {activeTab === 'invitation-checker' && (
          <InvitationChecker />
        )}

        {activeTab === 'sso-fixer' && (
          <GoogleSSOProfileFixer />
        )}

        {activeTab === 'sso-diagnostic' && (
          <SSOUserContactsDiagnostic />
        )}

        {activeTab === 'relationship-mapper' && (
          <RelationshipMapper />
        )}

        {activeTab === 'schema-migration' && (
          <SchemaMigrationTool />
        )}

        {activeTab === 'trusted-invitation-test' && (
          <TrustedContactInvitationTest />
        )}
      </div>
    </div>
  );
}