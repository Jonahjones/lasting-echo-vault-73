import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/ConfigContext';
import { 
  Settings, 
  HardDrive, 
  Flag, 
  Eye, 
  Bell, 
  Trophy, 
  Shield, 
  Upload,
  Save,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export function ConfigurationPanel() {
  const { config, loading, isConnected, updateConfig, refreshConfig } = useConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const handleUpdateConfig = async (configKey: string, newValue: any) => {
    setSaving(configKey);
    try {
      await updateConfig(configKey, newValue);
      toast({
        title: "Configuration Updated",
        description: `${configKey} has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleNumericChange = (configKey: string, path: string, value: string) => {
    if (!config) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const currentConfig = config as any;
    const configSection = JSON.parse(JSON.stringify(currentConfig[configKey.replace(/_/g, '')]));
    
    // Navigate to the nested property
    const pathParts = path.split('.');
    let current = configSection;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = numValue;
    
    handleUpdateConfig(configKey, configSection);
  };

  const handleBooleanChange = (configKey: string, path: string, value: boolean) => {
    if (!config) return;
    
    const currentConfig = config as any;
    const configSection = JSON.parse(JSON.stringify(currentConfig[configKey.replace(/_/g, '')]));
    
    // Navigate to the nested property
    const pathParts = path.split('.');
    let current = configSection;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;
    
    handleUpdateConfig(configKey, configSection);
  };

  const handleStringChange = (configKey: string, path: string, value: string) => {
    if (!config) return;
    
    const currentConfig = config as any;
    const configSection = JSON.parse(JSON.stringify(currentConfig[configKey.replace(/_/g, '')]));
    
    // Navigate to the nested property
    const pathParts = path.split('.');
    let current = configSection;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;
    
    handleUpdateConfig(configKey, configSection);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading configuration...</p>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p>Failed to load configuration</p>
          <Button onClick={refreshConfig} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>System Configuration</span>
            <div className={`w-2 h-2 rounded-full ml-auto ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
          </CardTitle>
          <CardDescription>
            Manage system-wide settings that apply to all users instantly
            {isConnected ? ' • Real-time updates active' : ' • Connection offline'}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="storage" className="w-full">
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <TooltipProvider>
              {/* Mobile-first scrollable tabs */}
              <div className="relative">
                <div className="overflow-x-auto scrollbar-hide">
                  <TabsList className="flex w-max min-w-full gap-2 bg-surface p-3 rounded-xl">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="storage" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="Storage Limits Configuration"
                        >
                          <HardDrive className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">Storage Limits</p>
                        <p className="text-xs text-muted-foreground">Configure user storage quotas</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="features" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="Feature Flags Configuration"
                        >
                          <Flag className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">Feature Flags</p>
                        <p className="text-xs text-muted-foreground">Toggle platform features</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="ui" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="User Interface Settings"
                        >
                          <Eye className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">UI Settings</p>
                        <p className="text-xs text-muted-foreground">Interface and display options</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="notifications" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="Notification Settings"
                        >
                          <Bell className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">Notifications</p>
                        <p className="text-xs text-muted-foreground">Configure notification systems</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="gamification" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="Gamification Settings"
                        >
                          <Trophy className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">Gamification</p>
                        <p className="text-xs text-muted-foreground">XP and achievements system</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="security" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="Security Configuration"
                        >
                          <Shield className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">Security</p>
                        <p className="text-xs text-muted-foreground">Privacy and security settings</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="uploads" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="Upload Configuration"
                        >
                          <Upload className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">Upload Settings</p>
                        <p className="text-xs text-muted-foreground">File upload configuration</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="refresh" 
                          className="flex items-center justify-center px-4 py-3 min-h-[48px] min-w-[64px] data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-warm hover:bg-surface hover:shadow-surface transition-all duration-200 rounded-lg"
                          aria-label="System Refresh"
                        >
                          <RefreshCw className="w-6 h-6" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-card border-border shadow-lg">
                        <p className="font-medium">System Refresh</p>
                        <p className="text-xs text-muted-foreground">Reload configuration manually</p>
                      </TooltipContent>
                    </Tooltip>
                  </TabsList>
                </div>
                
                {/* Mobile scroll indicator */}
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 pointer-events-none md:hidden">
                  <div className="w-6 h-6 bg-gradient-to-l from-surface via-surface/80 to-transparent rounded-full"></div>
                </div>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Storage Limits */}
        <TabsContent value="storage" className="px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Free Tier Limits</CardTitle>
                <CardDescription>Storage and video limits for free users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="free-max-videos">Max Videos</Label>
                  <Input
                    id="free-max-videos"
                    type="number"
                    value={config.freeTierLimits.max_videos}
                    onChange={(e) => handleNumericChange('free_tier_limits', 'max_videos', e.target.value)}
                    disabled={saving === 'free_tier_limits'}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free-storage">Max Storage (GB)</Label>
                  <Input
                    id="free-storage"
                    type="number"
                    step="0.1"
                    value={config.freeTierLimits.max_storage_gb}
                    onChange={(e) => handleNumericChange('free_tier_limits', 'max_storage_gb', e.target.value)}
                    disabled={saving === 'free_tier_limits'}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free-duration">Max Duration (minutes)</Label>
                  <Input
                    id="free-duration"
                    type="number"
                    value={config.freeTierLimits.max_video_duration_minutes}
                    onChange={(e) => handleNumericChange('free_tier_limits', 'max_video_duration_minutes', e.target.value)}
                    disabled={saving === 'free_tier_limits'}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free-file-size">Max File Size (MB)</Label>
                  <Input
                    id="free-file-size"
                    type="number"
                    value={config.freeTierLimits.max_file_size_mb}
                    onChange={(e) => handleNumericChange('free_tier_limits', 'max_file_size_mb', e.target.value)}
                    disabled={saving === 'free_tier_limits'}
                    className="h-12"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Premium Tier Limits</CardTitle>
                <CardDescription>Storage and video limits for premium users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="premium-max-videos">Max Videos</Label>
                  <Input
                    id="premium-max-videos"
                    type="number"
                    value={config.premiumTierLimits.max_videos}
                    onChange={(e) => handleNumericChange('premium_tier_limits', 'max_videos', e.target.value)}
                    disabled={saving === 'premium_tier_limits'}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premium-storage">Max Storage (GB)</Label>
                  <Input
                    id="premium-storage"
                    type="number"
                    step="0.1"
                    value={config.premiumTierLimits.max_storage_gb}
                    onChange={(e) => handleNumericChange('premium_tier_limits', 'max_storage_gb', e.target.value)}
                    disabled={saving === 'premium_tier_limits'}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premium-duration">Max Duration (minutes)</Label>
                  <Input
                    id="premium-duration"
                    type="number"
                    value={config.premiumTierLimits.max_video_duration_minutes}
                    onChange={(e) => handleNumericChange('premium_tier_limits', 'max_video_duration_minutes', e.target.value)}
                    disabled={saving === 'premium_tier_limits'}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premium-file-size">Max File Size (MB)</Label>
                  <Input
                    id="premium-file-size"
                    type="number"
                    value={config.premiumTierLimits.max_file_size_mb}
                    onChange={(e) => handleNumericChange('premium_tier_limits', 'max_file_size_mb', e.target.value)}
                    disabled={saving === 'premium_tier_limits'}
                    className="h-12"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features" className="px-4 sm:px-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable features across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <Label htmlFor="video-sharing" className="text-sm font-medium">Video Sharing</Label>
                  <Switch
                    id="video-sharing"
                    checked={config.featureFlags.video_sharing_enabled}
                    onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'video_sharing_enabled', checked)}
                    disabled={saving === 'feature_flags'}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <Label htmlFor="public-gallery" className="text-sm font-medium">Public Gallery</Label>
                  <Switch
                    id="public-gallery"
                    checked={config.featureFlags.public_gallery_enabled}
                    onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'public_gallery_enabled', checked)}
                    disabled={saving === 'feature_flags'}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <Label htmlFor="ai-prompts" className="text-sm font-medium">AI Prompts</Label>
                  <Switch
                    id="ai-prompts"
                    checked={config.featureFlags.ai_prompts_enabled}
                    onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'ai_prompts_enabled', checked)}
                    disabled={saving === 'feature_flags'}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <Label htmlFor="gamification" className="text-sm font-medium">Gamification</Label>
                  <Switch
                    id="gamification"
                    checked={config.featureFlags.gamification_enabled}
                    onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'gamification_enabled', checked)}
                    disabled={saving === 'feature_flags'}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <Label htmlFor="contact-invites" className="text-sm font-medium">Contact Invites</Label>
                  <Switch
                    id="contact-invites"
                    checked={config.featureFlags.contact_invites_enabled}
                    onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'contact_invites_enabled', checked)}
                    disabled={saving === 'feature_flags'}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <Label htmlFor="scheduled-delivery" className="text-sm font-medium">Scheduled Delivery</Label>
                  <Switch
                    id="scheduled-delivery"
                    checked={config.featureFlags.scheduled_delivery_enabled}
                    onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'scheduled_delivery_enabled', checked)}
                    disabled={saving === 'feature_flags'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Settings */}
        <TabsContent value="ui" className="px-4 sm:px-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>UI Settings</CardTitle>
              <CardDescription>Control user interface and display options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                <Label htmlFor="maintenance-mode" className="text-sm font-medium">Maintenance Mode</Label>
                <Switch
                  id="maintenance-mode"
                  checked={config.uiSettings.maintenance_mode}
                  onCheckedChange={(checked) => handleBooleanChange('ui_settings', 'maintenance_mode', checked)}
                  disabled={saving === 'ui_settings'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea
                  id="maintenance-message"
                  value={config.uiSettings.maintenance_message}
                  onChange={(e) => handleStringChange('ui_settings', 'maintenance_message', e.target.value)}
                  disabled={saving === 'ui_settings'}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Input
                  id="welcome-message"
                  value={config.uiSettings.welcome_message}
                  onChange={(e) => handleStringChange('ui_settings', 'welcome_message', e.target.value)}
                  disabled={saving === 'ui_settings'}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-daily-prompts">Max Daily Prompts</Label>
                <Input
                  id="max-daily-prompts"
                  type="number"
                  value={config.uiSettings.max_daily_prompts}
                  onChange={(e) => handleNumericChange('ui_settings', 'max_daily_prompts', e.target.value)}
                  disabled={saving === 'ui_settings'}
                  className="h-12"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure system-wide notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <Switch
                    id="email-notifications"
                    checked={false}
                    disabled={true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <Switch
                    id="push-notifications"
                    checked={false}
                    disabled={true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                  <Switch
                    id="in-app-notifications"
                    checked={false}
                    disabled={true}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Notification settings will be configurable in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gamification */}
        <TabsContent value="gamification" className="px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Gamification Settings</CardTitle>
              <CardDescription>Configure XP, achievements, and engagement features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="gamification-enabled-main">Enable Gamification System</Label>
                <Switch
                  id="gamification-enabled-main"
                  checked={config.featureFlags?.gamification_enabled || false}
                  onCheckedChange={(checked) => handleBooleanChange('feature_flags', 'gamification_enabled', checked)}
                  disabled={saving === 'feature_flags'}
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  XP values are configured in the database and will be updated in real-time. 
                  Current default values: Video Upload (10 XP), Daily Prompt Bonus (15 XP), Public Video (20 XP).
                </p>
                <p className="text-sm text-accent-foreground">
                  ✨ Daily prompt bonus XP is now automatically awarded when users complete today's prompt!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>Privacy and security settings for the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-email-verification">Require Email Verification</Label>
                  <Switch
                    id="require-email-verification"
                    checked={false}
                    disabled={true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-delete-inactive">Auto-delete Inactive Users</Label>
                  <Switch
                    id="auto-delete-inactive"
                    checked={false}
                    disabled={true}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={config.securitySettings?.session_timeout_minutes || 1440}
                  onChange={(e) => handleNumericChange('security_settings', 'session_timeout_minutes', e.target.value)}
                  disabled={saving === 'security_settings'}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Additional security features will be configurable in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Settings */}
        <TabsContent value="uploads" className="px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Configuration</CardTitle>
              <CardDescription>File upload limits and processing settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    value={config.freeTierLimits?.max_file_size_mb || 100}
                    onChange={(e) => handleNumericChange('free_tier_limits', 'max_file_size_mb', e.target.value)}
                    disabled={saving === 'free_tier_limits'}
                  />
                </div>
                <div>
                  <Label htmlFor="processing-timeout">Processing Timeout (minutes)</Label>
                  <Input
                    id="processing-timeout"
                    type="number"
                    value={10}
                    disabled={true}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-transcoding">Enable Auto-transcoding</Label>
                <Switch
                  id="auto-transcoding"
                  checked={false}
                  disabled={true}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Advanced upload settings will be configurable in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refresh Tab */}
        <TabsContent value="refresh" className="px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Management</CardTitle>
              <CardDescription>Manual refresh and system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button 
                  onClick={refreshConfig} 
                  size="lg"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Configuration
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Manually reload configuration from database
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm">
                  <strong>Connection Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-sm">
                  <strong>Real-time Updates:</strong> {isConnected ? 'Active' : 'Inactive'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 