-- Create comprehensive system configuration table for instant updates
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN (
    'storage_limits', 
    'video_limits', 
    'feature_flags', 
    'ui_settings', 
    'notification_settings',
    'gamification_settings',
    'pricing_settings',
    'security_settings'
  )),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Public read access for active configs
CREATE POLICY "Active system configs are publicly readable"
ON public.system_config
FOR SELECT
USING (is_active = true);

-- Admin-only write access
CREATE POLICY "Admins can manage system configs"
ON public.system_config
FOR ALL
USING (public.is_user_admin());

-- Add updated_at trigger
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system configurations
INSERT INTO public.system_config (config_key, config_value, config_type, description) VALUES

-- Storage & Video Limits
('free_tier_limits', '{
  "max_videos": 3,
  "max_storage_gb": 2.0,
  "max_video_duration_minutes": 5,
  "max_file_size_mb": 100
}', 'storage_limits', 'Limits for free tier users'),

('premium_tier_limits', '{
  "max_videos": 100,
  "max_storage_gb": 50.0,
  "max_video_duration_minutes": 30,
  "max_file_size_mb": 500
}', 'storage_limits', 'Limits for premium tier users'),

-- Feature Flags
('feature_flags', '{
  "video_sharing_enabled": true,
  "public_gallery_enabled": true,
  "ai_prompts_enabled": true,
  "gamification_enabled": true,
  "contact_invites_enabled": true,
  "scheduled_delivery_enabled": true,
  "legacy_website_generation": false
}', 'feature_flags', 'Global feature toggles'),

-- UI Settings
('ui_settings', '{
  "maintenance_mode": false,
  "maintenance_message": "We are currently performing scheduled maintenance. Please check back soon.",
  "welcome_message": "Preserve your memories for future generations",
  "max_daily_prompts": 3,
  "enable_dark_mode": true,
  "show_beta_features": false
}', 'ui_settings', 'User interface and display settings'),

-- Notification Settings
('notification_settings', '{
  "email_notifications_enabled": true,
  "push_notifications_enabled": true,
  "reminder_frequency_days": 7,
  "digest_frequency": "weekly",
  "admin_alert_thresholds": {
    "storage_usage_percent": 80,
    "error_rate_percent": 5
  }
}', 'notification_settings', 'Global notification preferences'),

-- Gamification Settings
('gamification_settings', '{
  "xp_multiplier": 1.0,
  "level_up_bonus_xp": 50,
  "daily_login_bonus": 5,
  "achievement_notifications": true,
  "leaderboard_enabled": false,
  "seasonal_events_enabled": true
}', 'gamification_settings', 'XP and achievement system settings'),

-- Security Settings
('security_settings', '{
  "session_timeout_minutes": 60,
  "max_login_attempts": 5,
  "password_min_length": 8,
  "require_email_verification": true,
  "admin_session_timeout_minutes": 15,
  "rate_limit_requests_per_minute": 60
}', 'security_settings', 'Security and authentication settings'),

-- Upload & Processing Settings
('upload_settings', '{
  "allowed_video_formats": ["mp4", "mov", "avi", "webm"],
  "max_concurrent_uploads": 3,
  "auto_generate_thumbnails": true,
  "video_compression_quality": "medium",
  "processing_timeout_minutes": 10
}', 'storage_limits', 'File upload and processing configuration'),

-- Timing Configuration
('timing_settings', '{
  "auth": {
    "token_expiry_seconds": 3600,
    "session_timeout_minutes": 60,
    "admin_session_timeout_minutes": 15,
    "profile_fetch_timeout_ms": 10000,
    "profile_creation_timeout_ms": 10000,
    "retry_delay_base_ms": 1000
  },
  "ui": {
    "toast_duration_ms": 4000,
    "toast_success_duration_ms": 3000,
    "toast_error_duration_ms": 5000,
    "toast_config_update_duration_ms": 5000,
    "button_animation_ms": 600,
    "modal_close_animation_ms": 300,
    "celebration_duration_ms": 5000,
    "sound_tooltip_duration_ms": 3000,
    "patience_message_delay_ms": 5000,
    "patience_timeout_delay_ms": 6000,
    "profile_load_window_ms": 3000,
    "ui_timeout_ms": 15000
  },
  "upload": {
    "upload_timeout_ms": 30000,
    "save_timeout_ms": 15000,
    "processing_timeout_ms": 600000,
    "upload_retry_delay_ms": 2000
  },
  "realtime": {
    "dashboard_refresh_interval_ms": 30000,
    "admin_check_interval_ms": 60000,
    "connection_retry_delay_ms": 5000,
    "reconnection_timeout_ms": 10000
  },
  "video": {
    "recording_timer_interval_ms": 1000,
    "media_recorder_timeslice_ms": 1000,
    "controls_hide_delay_ms": 3000,
    "seek_debounce_ms": 100,
    "carousel_autoplay_interval_ms": 8000,
    "video_pause_resume_delay_ms": 100
  },
  "loading": {
    "message_rotation_interval_ms": 2000,
    "quote_rotation_interval_ms": 4000,
    "progress_update_interval_ms": 100,
    "min_loading_time_ms": 1000
  }
}', 'ui_settings', 'Centralized timing configuration for all time-based operations');

-- Add real-time replication for instant updates
ALTER TABLE public.system_config REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;

-- Create indexes for performance
CREATE INDEX idx_system_config_type ON public.system_config(config_type);
CREATE INDEX idx_system_config_active ON public.system_config(is_active) WHERE is_active = true;
CREATE INDEX idx_system_config_key ON public.system_config(config_key);

-- Create a view for easier config access
CREATE VIEW public.active_config AS
SELECT 
  config_key,
  config_value,
  config_type,
  description,
  updated_at
FROM public.system_config 
WHERE is_active = true;

-- Grant select on view to authenticated users
GRANT SELECT ON public.active_config TO authenticated; 