import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Configuration type definitions
export interface StorageLimits {
  max_videos: number;
  max_storage_gb: number;
  max_video_duration_minutes: number;
  max_file_size_mb: number;
}

export interface FeatureFlags {
  video_sharing_enabled: boolean;
  public_gallery_enabled: boolean;
  ai_prompts_enabled: boolean;
  gamification_enabled: boolean;
  contact_invites_enabled: boolean;
  scheduled_delivery_enabled: boolean;
  legacy_website_generation: boolean;
}

export interface UISettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  welcome_message: string;
  max_daily_prompts: number;
  enable_dark_mode: boolean;
  show_beta_features: boolean;
}

export interface NotificationSettings {
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  reminder_frequency_days: number;
  digest_frequency: string;
  admin_alert_thresholds: {
    storage_usage_percent: number;
    error_rate_percent: number;
  };
}

export interface GamificationSettings {
  xp_multiplier: number;
  level_up_bonus_xp: number;
  daily_login_bonus: number;
  achievement_notifications: boolean;
  leaderboard_enabled: boolean;
  seasonal_events_enabled: boolean;
}

export interface SecuritySettings {
  session_timeout_minutes: number;
  max_login_attempts: number;
  password_min_length: number;
  require_email_verification: boolean;
  admin_session_timeout_minutes: number;
  rate_limit_requests_per_minute: number;
}

export interface UploadSettings {
  allowed_video_formats: string[];
  max_concurrent_uploads: number;
  auto_generate_thumbnails: boolean;
  video_compression_quality: string;
  processing_timeout_minutes: number;
}

export interface TimingSettings {
  auth: {
    token_expiry_seconds: number;
    session_timeout_minutes: number;
    admin_session_timeout_minutes: number;
    profile_fetch_timeout_ms: number;
    profile_creation_timeout_ms: number;
    retry_delay_base_ms: number;
  };
  ui: {
    toast_duration_ms: number;
    toast_success_duration_ms: number;
    toast_error_duration_ms: number;
    toast_config_update_duration_ms: number;
    button_animation_ms: number;
    modal_close_animation_ms: number;
    celebration_duration_ms: number;
    sound_tooltip_duration_ms: number;
    patience_message_delay_ms: number;
    patience_timeout_delay_ms: number;
    profile_load_window_ms: number;
    ui_timeout_ms: number;
  };
  upload: {
    upload_timeout_ms: number;
    save_timeout_ms: number;
    processing_timeout_ms: number;
    upload_retry_delay_ms: number;
  };
  realtime: {
    dashboard_refresh_interval_ms: number;
    admin_check_interval_ms: number;
    connection_retry_delay_ms: number;
    reconnection_timeout_ms: number;
  };
  video: {
    recording_timer_interval_ms: number;
    media_recorder_timeslice_ms: number;
    controls_hide_delay_ms: number;
    seek_debounce_ms: number;
    carousel_autoplay_interval_ms: number;
    video_pause_resume_delay_ms: number;
  };
  loading: {
    message_rotation_interval_ms: number;
    quote_rotation_interval_ms: number;
    progress_update_interval_ms: number;
    min_loading_time_ms: number;
  };
}

export interface SystemConfiguration {
  freeTierLimits: StorageLimits;
  premiumTierLimits: StorageLimits;
  featureFlags: FeatureFlags;
  uiSettings: UISettings;
  notificationSettings: NotificationSettings;
  gamificationSettings: GamificationSettings;
  securitySettings: SecuritySettings;
  uploadSettings: UploadSettings;
  timingSettings: TimingSettings;
}

interface ConfigContextType {
  config: SystemConfiguration | null;
  loading: boolean;
  isConnected: boolean;
  refreshConfig: () => Promise<void>;
  updateConfig: (configKey: string, newValue: any) => Promise<void>;
}

// Default configuration fallbacks
const defaultConfig: SystemConfiguration = {
  freeTierLimits: {
    max_videos: 3,
    max_storage_gb: 2.0,
    max_video_duration_minutes: 5,
    max_file_size_mb: 100
  },
  premiumTierLimits: {
    max_videos: 100,
    max_storage_gb: 50.0,
    max_video_duration_minutes: 30,
    max_file_size_mb: 500
  },
  featureFlags: {
    video_sharing_enabled: true,
    public_gallery_enabled: true,
    ai_prompts_enabled: true,
    gamification_enabled: true,
    contact_invites_enabled: true,
    scheduled_delivery_enabled: true,
    legacy_website_generation: false
  },
  uiSettings: {
    maintenance_mode: false,
    maintenance_message: "We are currently performing scheduled maintenance. Please check back soon.",
    welcome_message: "Preserve your memories for future generations",
    max_daily_prompts: 3,
    enable_dark_mode: true,
    show_beta_features: false
  },
  notificationSettings: {
    email_notifications_enabled: true,
    push_notifications_enabled: true,
    reminder_frequency_days: 7,
    digest_frequency: "weekly",
    admin_alert_thresholds: {
      storage_usage_percent: 80,
      error_rate_percent: 5
    }
  },
  gamificationSettings: {
    xp_multiplier: 1.0,
    level_up_bonus_xp: 50,
    daily_login_bonus: 5,
    achievement_notifications: true,
    leaderboard_enabled: false,
    seasonal_events_enabled: true
  },
  securitySettings: {
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    password_min_length: 8,
    require_email_verification: true,
    admin_session_timeout_minutes: 15,
    rate_limit_requests_per_minute: 60
  },
  uploadSettings: {
    allowed_video_formats: ["mp4", "mov", "avi", "webm"],
    max_concurrent_uploads: 3,
    auto_generate_thumbnails: true,
    video_compression_quality: "medium",
    processing_timeout_minutes: 10
  },
  timingSettings: {
    auth: {
      token_expiry_seconds: 3600,
      session_timeout_minutes: 60,
      admin_session_timeout_minutes: 15,
      profile_fetch_timeout_ms: 10000,
      profile_creation_timeout_ms: 10000,
      retry_delay_base_ms: 1000
    },
    ui: {
      toast_duration_ms: 4000,
      toast_success_duration_ms: 3000,
      toast_error_duration_ms: 5000,
      toast_config_update_duration_ms: 5000,
      button_animation_ms: 600,
      modal_close_animation_ms: 300,
      celebration_duration_ms: 5000,
      sound_tooltip_duration_ms: 3000,
      patience_message_delay_ms: 5000,
      patience_timeout_delay_ms: 6000,
      profile_load_window_ms: 3000,
      ui_timeout_ms: 15000
    },
    upload: {
      upload_timeout_ms: 30000,
      save_timeout_ms: 15000,
      processing_timeout_ms: 600000,
      upload_retry_delay_ms: 2000
    },
    realtime: {
      dashboard_refresh_interval_ms: 30000,
      admin_check_interval_ms: 60000,
      connection_retry_delay_ms: 5000,
      reconnection_timeout_ms: 10000
    },
    video: {
      recording_timer_interval_ms: 1000,
      media_recorder_timeslice_ms: 1000,
      controls_hide_delay_ms: 3000,
      seek_debounce_ms: 100,
      carousel_autoplay_interval_ms: 8000,
      video_pause_resume_delay_ms: 100
    },
    loading: {
      message_rotation_interval_ms: 2000,
      quote_rotation_interval_ms: 4000,
      progress_update_interval_ms: 100,
      min_loading_time_ms: 1000
    }
  }
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SystemConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Fetch configuration from database
  const fetchConfig = async () => {
    try {
      console.log('🔧 Loading system configuration...');
      
      const { data, error } = await supabase
        .from('system_config' as any)
        .select('config_key, config_value')
        .eq('is_active', true);

      if (error) throw error;

      console.log(`✅ Loaded ${data?.length || 0} configuration entries`);

      // Transform flat config data into structured object
      const configMap = new Map((data as any)?.map((item: any) => [item.config_key, item.config_value]) || []);
      
      const systemConfig: SystemConfiguration = {
        freeTierLimits: (configMap.get('free_tier_limits') as StorageLimits) || defaultConfig.freeTierLimits,
        premiumTierLimits: (configMap.get('premium_tier_limits') as StorageLimits) || defaultConfig.premiumTierLimits,
        featureFlags: (configMap.get('feature_flags') as FeatureFlags) || defaultConfig.featureFlags,
        uiSettings: (configMap.get('ui_settings') as UISettings) || defaultConfig.uiSettings,
        notificationSettings: (configMap.get('notification_settings') as NotificationSettings) || defaultConfig.notificationSettings,
        gamificationSettings: (configMap.get('gamification_settings') as GamificationSettings) || defaultConfig.gamificationSettings,
        securitySettings: (configMap.get('security_settings') as SecuritySettings) || defaultConfig.securitySettings,
        uploadSettings: (configMap.get('upload_settings') as UploadSettings) || defaultConfig.uploadSettings,
        timingSettings: (configMap.get('timing_settings') as TimingSettings) || defaultConfig.timingSettings,
      };

      setConfig(systemConfig);
      console.log('🎯 System configuration loaded:', systemConfig);
      
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      
      // Use default config on error
      setConfig(defaultConfig);
      
      toast({
        title: "Configuration Error",
        description: "Using default settings. Some features may be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update configuration
  const updateConfig = async (configKey: string, newValue: any) => {
    try {
      const { error } = await supabase
        .from('system_config' as any)
        .update({ 
          config_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', configKey);

      if (error) throw error;

      console.log(`✅ Updated configuration: ${configKey}`);
      
    } catch (error) {
      console.error(`❌ Error updating configuration ${configKey}:`, error);
      throw error;
    }
  };

  // Set up real-time subscription for instant config updates
  useEffect(() => {
    console.log('🔗 Setting up configuration real-time subscription...');
    
    // Load initial configuration
    fetchConfig();

    // Subscribe to configuration changes
    const configChannel = supabase
      .channel('system-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_config'
        },
        (payload) => {
          console.log('⚙️ Real-time configuration change:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedConfig = payload.new as any;
            
            // Show toast notification for configuration changes
            toast({
              title: "Configuration Updated",
              description: `System settings have been updated by an administrator.`,
              duration: 5000,
            });
            
            // Refresh entire configuration to ensure consistency
            fetchConfig();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Configuration subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('✅ Configuration real-time updates active');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log('❌ Configuration real-time connection closed');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.log('❌ Configuration real-time connection error');
        }
      });

    // Cleanup subscription
    return () => {
      console.log('🧹 Cleaning up configuration subscription');
      supabase.removeChannel(configChannel);
    };
  }, [toast]);

  const value: ConfigContextType = {
    config,
    loading,
    isConnected,
    refreshConfig: fetchConfig,
    updateConfig
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Convenience hooks for specific config sections
export function useStorageLimits(tier: 'free' | 'premium' = 'free') {
  const { config } = useConfig();
  return tier === 'free' ? config?.freeTierLimits : config?.premiumTierLimits;
}

export function useFeatureFlags() {
  const { config } = useConfig();
  return config?.featureFlags;
}

export function useUISettings() {
  const { config } = useConfig();
  return config?.uiSettings;
}

export function useTimingSettings() {
  const { config } = useConfig();
  return config?.timingSettings;
} 