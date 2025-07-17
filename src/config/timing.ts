/**
 * Centralized Timing Configuration
 * 
 * All time-based settings for the application are defined here.
 * Values are in milliseconds unless otherwise specified.
 * 
 * Usage:
 * import { TIMING } from '@/config/timing';
 * setTimeout(callback, TIMING.UI.TOAST_DURATION);
 */

export const TIMING = {
  // Authentication & Session Management
  AUTH: {
    /** JWT token expiry time in seconds */
    TOKEN_EXPIRY_SECONDS: 3600, // 1 hour
    
    /** Session timeout for regular users in minutes */
    SESSION_TIMEOUT_MINUTES: 60, // 1 hour
    
    /** Admin session timeout in minutes */
    ADMIN_SESSION_TIMEOUT_MINUTES: 15,
    
    /** Profile fetch timeout */
    PROFILE_FETCH_TIMEOUT_MS: 10000, // 10 seconds
    
    /** Profile creation timeout */
    PROFILE_CREATION_TIMEOUT_MS: 10000, // 10 seconds
    
    /** Retry delay multiplier for exponential backoff */
    RETRY_DELAY_BASE_MS: 1000, // 1 second
  },

  // User Interface & Animations
  UI: {
    /** Standard toast notification duration */
    TOAST_DURATION_MS: 4000, // 4 seconds
    
    /** Success toast duration */
    TOAST_SUCCESS_DURATION_MS: 3000, // 3 seconds
    
    /** Error toast duration */
    TOAST_ERROR_DURATION_MS: 5000, // 5 seconds
    
    /** Configuration update notification duration */
    TOAST_CONFIG_UPDATE_DURATION_MS: 5000, // 5 seconds
    
    /** Button animation duration */
    BUTTON_ANIMATION_MS: 600,
    
    /** Modal close animation delay */
    MODAL_CLOSE_ANIMATION_MS: 300,
    
    /** Celebration display duration */
    CELEBRATION_DURATION_MS: 5000, // 5 seconds
    
    /** Sound tooltip display duration */
    SOUND_TOOLTIP_DURATION_MS: 3000, // 3 seconds
    
    /** Patience message delay */
    PATIENCE_MESSAGE_DELAY_MS: 5000, // 5 seconds
    
    /** Patience timeout delay */
    PATIENCE_TIMEOUT_DELAY_MS: 6000, // 6 seconds
    
    /** Profile load window */
    PROFILE_LOAD_WINDOW_MS: 3000, // 3 seconds
    
    /** General UI timeout */
    UI_TIMEOUT_MS: 15000, // 15 seconds
  },

  // File Upload & Processing
  UPLOAD: {
    /** File upload timeout */
    UPLOAD_TIMEOUT_MS: 30000, // 30 seconds
    
    /** Save operation timeout */
    SAVE_TIMEOUT_MS: 15000, // 15 seconds
    
    /** Video processing timeout */
    PROCESSING_TIMEOUT_MS: 600000, // 10 minutes
    
    /** Upload retry delay */
    UPLOAD_RETRY_DELAY_MS: 2000, // 2 seconds
  },

  // Real-time & Polling
  REALTIME: {
    /** Dashboard data refresh interval */
    DASHBOARD_REFRESH_INTERVAL_MS: 30000, // 30 seconds
    
    /** Admin session check interval */
    ADMIN_CHECK_INTERVAL_MS: 60000, // 1 minute
    
    /** Connection retry delay */
    CONNECTION_RETRY_DELAY_MS: 5000, // 5 seconds
    
    /** Real-time reconnection timeout */
    RECONNECTION_TIMEOUT_MS: 10000, // 10 seconds
  },

  // Video & Media
  VIDEO: {
    /** Video recording timer update interval */
    RECORDING_TIMER_INTERVAL_MS: 1000, // 1 second
    
    /** Media recorder data capture interval */
    MEDIA_RECORDER_TIMESLICE_MS: 1000, // 1 second
    
    /** Video player control hide delay */
    CONTROLS_HIDE_DELAY_MS: 3000, // 3 seconds
    
    /** Video seek debounce delay */
    SEEK_DEBOUNCE_MS: 100,
    
    /** Autoplay carousel interval */
    CAROUSEL_AUTOPLAY_INTERVAL_MS: 8000, // 8 seconds
    
    /** Video pause/resume delay */
    VIDEO_PAUSE_RESUME_DELAY_MS: 100,
  },

  // Loading & Progress
  LOADING: {
    /** Message rotation interval for loading screens */
    MESSAGE_ROTATION_INTERVAL_MS: 2000, // 2 seconds
    
    /** Quote rotation interval */
    QUOTE_ROTATION_INTERVAL_MS: 4000, // 4 seconds
    
    /** Progress update interval */
    PROGRESS_UPDATE_INTERVAL_MS: 100,
    
    /** Minimum loading display time */
    MIN_LOADING_TIME_MS: 1000, // 1 second
  },

  // Data & Analytics
  DATA: {
    /** Time calculation constants */
    MILLISECONDS_PER_SECOND: 1000,
    SECONDS_PER_MINUTE: 60,
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,
    
    /** Days since calculation base */
    MILLISECONDS_PER_DAY: 1000 * 60 * 60 * 24,
    
    /** Week ago calculation */
    DAYS_IN_WEEK: 7,
  },

  // Toast System
  TOAST: {
    /** Toast remove delay (very high to prevent auto-removal) */
    REMOVE_DELAY_MS: 1000000,
    
    /** Toast slide animation duration */
    SLIDE_ANIMATION_MS: 300,
    
    /** Toast fade animation duration */
    FADE_ANIMATION_MS: 200,
  },

  // CSS Animation Defaults (for Tailwind classes)
  CSS: {
    /** Standard transition duration */
    TRANSITION_DURATION_MS: 300,
    
    /** Fast transition duration */
    TRANSITION_FAST_MS: 200,
    
    /** Slow transition duration */
    TRANSITION_SLOW_MS: 500,
    
    /** Animation duration for complex effects */
    ANIMATION_DURATION_MS: 1000,
  },

  // Development & Testing
  DEV: {
    /** Debounce delay for development hot reloading */
    HOT_RELOAD_DEBOUNCE_MS: 250,
    
    /** Mock API response delay */
    MOCK_API_DELAY_MS: 500,
    
    /** Test timeout duration */
    TEST_TIMEOUT_MS: 5000,
  }
} as const;

/**
 * Helper functions for common time calculations
 */
export const TimeHelpers = {
  /** Convert seconds to milliseconds */
  secondsToMs: (seconds: number): number => seconds * TIMING.DATA.MILLISECONDS_PER_SECOND,
  
  /** Convert minutes to milliseconds */
  minutesToMs: (minutes: number): number => minutes * TIMING.DATA.SECONDS_PER_MINUTE * TIMING.DATA.MILLISECONDS_PER_SECOND,
  
  /** Convert hours to milliseconds */
  hoursToMs: (hours: number): number => hours * TIMING.DATA.MINUTES_PER_HOUR * TIMING.DATA.SECONDS_PER_MINUTE * TIMING.DATA.MILLISECONDS_PER_SECOND,
  
  /** Convert days to milliseconds */
  daysToMs: (days: number): number => days * TIMING.DATA.MILLISECONDS_PER_DAY,
  
  /** Get current timestamp */
  now: (): number => Date.now(),
  
  /** Check if a timestamp is older than specified milliseconds */
  isOlderThan: (timestamp: number, maxAgeMs: number): boolean => 
    TimeHelpers.now() - timestamp > maxAgeMs,
  
  /** Format time duration for display */
  formatDuration: (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
};

/**
 * Environment-based timing overrides
 * These can be set via environment variables to override defaults
 */
export const ENV_TIMING_OVERRIDES = {
  /** Override token expiry from environment */
  TOKEN_EXPIRY_SECONDS: import.meta.env.VITE_TOKEN_EXPIRY_SECONDS 
    ? parseInt(import.meta.env.VITE_TOKEN_EXPIRY_SECONDS) 
    : TIMING.AUTH.TOKEN_EXPIRY_SECONDS,
  
  /** Override session timeout from environment */
  SESSION_TIMEOUT_MINUTES: import.meta.env.VITE_SESSION_TIMEOUT_MINUTES 
    ? parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) 
    : TIMING.AUTH.SESSION_TIMEOUT_MINUTES,
  
  /** Override polling interval from environment */
  POLL_INTERVAL_MS: import.meta.env.VITE_POLL_INTERVAL_MS 
    ? parseInt(import.meta.env.VITE_POLL_INTERVAL_MS) 
    : TIMING.REALTIME.DASHBOARD_REFRESH_INTERVAL_MS,
  
  /** Override toast duration from environment */
  TOAST_DURATION_MS: import.meta.env.VITE_TOAST_DURATION_MS 
    ? parseInt(import.meta.env.VITE_TOAST_DURATION_MS) 
    : TIMING.UI.TOAST_DURATION_MS,
};

/**
 * Merged timing configuration with environment overrides
 * Use this for actual timing values in components
 */
export const EFFECTIVE_TIMING = {
  ...TIMING,
  AUTH: {
    ...TIMING.AUTH,
    TOKEN_EXPIRY_SECONDS: ENV_TIMING_OVERRIDES.TOKEN_EXPIRY_SECONDS,
    SESSION_TIMEOUT_MINUTES: ENV_TIMING_OVERRIDES.SESSION_TIMEOUT_MINUTES,
  },
  UI: {
    ...TIMING.UI,
    TOAST_DURATION_MS: ENV_TIMING_OVERRIDES.TOAST_DURATION_MS,
  },
  REALTIME: {
    ...TIMING.REALTIME,
    DASHBOARD_REFRESH_INTERVAL_MS: ENV_TIMING_OVERRIDES.POLL_INTERVAL_MS,
  }
} as const;

export default EFFECTIVE_TIMING; 