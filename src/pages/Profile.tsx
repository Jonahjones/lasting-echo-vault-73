import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Globe, LogOut, Mail, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [recordingReminders, setRecordingReminders] = useState(true);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
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

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="container mx-auto px-4 py-8 max-w-sm">
        <div className="mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Profile Settings
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>

          {/* User Info */}
          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-foreground font-medium">{user?.user_metadata?.full_name || user?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-foreground font-medium">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Visibility */}
          <Card className="shadow-card mb-6">
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
          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-primary" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>
                Choose how you'd like to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
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
                      Get reminded to record new messages
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

          {/* Logout */}
          <Card className="shadow-card">
            <CardContent className="pt-6 flex justify-center">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-[90%]"
                  size="lg"
                >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}