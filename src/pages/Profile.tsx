import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Globe, LogOut, Mail, Smartphone, Edit, Trophy, Target, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { XPProgressBar } from "@/components/gamification/XPProgressBar";
import { BadgeShowcase } from "@/components/gamification/BadgeShowcase";
import { XPHistoryCard } from "@/components/gamification/XPHistoryCard";

export default function Profile() {
  const { user, logout, profile } = useAuth();
  const { toast } = useToast();
  
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [recordingReminders, setRecordingReminders] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleProfileVisibilityChange = (isPublic: boolean) => {
    setIsPublicProfile(isPublic);
    toast({
      title: "Profile updated",
      description: `Your profile is now ${isPublic ? 'public' : 'private'}.`,
    });
  };

  const handleNotificationChange = (type: string, enabled: boolean) => {
    switch (type) {
      case 'email':
        setEmailNotifications(enabled);
        break;
      case 'push':
        setPushNotifications(enabled);
        break;
      case 'reminders':
        setRecordingReminders(enabled);
        break;
    }
    toast({
      title: "Settings updated",
      description: `${type} notifications ${enabled ? 'enabled' : 'disabled'}.`,
    });
  };

  // Single source of truth: use profile data
  const displayName = profile?.display_name || 
    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '') ||
    user?.email || 'Unknown User';
  
  const userInitials = profile?.display_name?.[0] || profile?.first_name?.[0] || user?.email?.[0] || 'U';

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="container mx-auto px-4 py-8 max-w-sm">
        <div className="mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Profile & Settings
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>

          {/* Tabbed Interface */}
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="account" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Account Info</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Info Tab */}
            <TabsContent value="account" className="space-y-6">
              {/* Profile Edit Form or Profile Display */}
              {isEditingProfile ? (
                <div className="mb-6">
                  <ProfileEditForm 
                    onCancel={() => setIsEditingProfile(false)}
                    onSave={() => setIsEditingProfile(false)}
                  />
                </div>
              ) : (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-primary" />
                        <span>Personal Information</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Avatar Section */}
                      <div className="flex flex-col items-center space-y-4">
                        <Avatar className="w-24 h-24 border-2 border-border">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Level Badge and XP Progress */}
                        <div className="text-center space-y-3">
                          <LevelBadge size="lg" showXP />
                          <XPProgressBar />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* User Details */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                          <p className="text-foreground font-medium">{displayName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                          <p className="text-foreground font-medium">{user?.email}</p>
                        </div>
                        {profile?.tagline && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Personal Tagline</Label>
                            <p className="text-foreground font-medium italic">"{profile.tagline}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gamification Section */}
              <div className="grid gap-6">
                <BadgeShowcase />
                <XPHistoryCard />
              </div>

              {/* Account Actions */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LogOut className="w-5 h-5 text-destructive" />
                    <span>Account Actions</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your account access
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex justify-center">
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="w-full"
                    size="lg"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Profile Visibility */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <span>Profile Visibility</span>
                  </CardTitle>
                  <CardDescription>
                    Control who can see your profile and legacy messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="public-profile">Public Profile</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow others to discover your public legacy messages
                      </p>
                    </div>
                    <Switch
                      id="public-profile"
                      checked={isPublicProfile}
                      onCheckedChange={handleProfileVisibilityChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <span>Notification Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Choose how you'd like to be notified about important updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates and reminders via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive push notifications on your device
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={pushNotifications}
                      onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <Label htmlFor="recording-reminders">Recording Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminded to record new legacy messages
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="recording-reminders"
                      checked={recordingReminders}
                      onCheckedChange={(checked) => handleNotificationChange('reminders', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}