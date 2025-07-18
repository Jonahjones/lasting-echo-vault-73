import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { EFFECTIVE_TIMING } from '@/config/timing';

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  tagline: string | null;
  onboarding_completed: boolean;
  first_video_recorded: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTriggeredWelcome, setHasTriggeredWelcome] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchProfile = async (userId: string, maxRetries = 2): Promise<{ success: boolean; profile: Profile | null }> => {
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`Fetching profile for user: ${userId} (attempt ${retryCount + 1})`);
        setError(null);
        
        // Add timeout to prevent hanging
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), EFFECTIVE_TIMING.AUTH.PROFILE_FETCH_TIMEOUT_MS)
        );

        const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

        console.log('Profile fetch result:', { data, error });

        if (error) {
          console.error('Error fetching profile:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        // If no profile found, create one
        if (!data) {
          console.warn('🚨 No profile found for user, creating fallback profile');
          console.log('Profile creation details:', { 
            userId, 
            attemptNumber: retryCount + 1,
            timestamp: new Date().toISOString()
          });
          
          const createPromise = supabase
            .from('profiles')
            .insert({
              user_id: userId,
              first_name: null,
              last_name: null,
              display_name: null,
              onboarding_completed: false,
              first_video_recorded: false
            })
            .select()
            .single();

          const createTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile creation timeout')), EFFECTIVE_TIMING.AUTH.PROFILE_CREATION_TIMEOUT_MS)
          );

          const { data: newProfile, error: createError } = await Promise.race([createPromise, createTimeoutPromise]) as any;

          if (createError) {
            console.error('Error creating profile:', createError);
            throw new Error(`Failed to create profile: ${createError.message}`);
          }

          return { success: true, profile: newProfile };
        }

        return { success: true, profile: data };
      } catch (error) {
        console.error(`Profile fetch attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount > maxRetries) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
          setError(errorMessage);
          return { success: false, profile: null };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, EFFECTIVE_TIMING.AUTH.RETRY_DELAY_BASE_MS * retryCount));
      }
    }
    
    return { success: false, profile: null };
  };

  const refreshProfile = async () => {
    if (user) {
      const result = await fetchProfile(user.id);
      if (result.success) {
        setProfile(result.profile);
      }
    }
  };

  const retry = async () => {
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    
    try {
      if (user) {
        const result = await fetchProfile(user.id);
        if (result.success) {
          setProfile(result.profile);
          setError(null);
        }
      } else {
        // If no user, try to get session again
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const result = await fetchProfile(session.user.id);
          if (result.success) {
            setProfile(result.profile);
            setError(null);
          }
        } else {
          setError('No user session found. Please log in again.');
        }
      }
    } catch (error) {
      console.error('Retry failed:', error);
      setError('Failed to restore session. Please try logging in again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let currentUserId: string | null = null;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event, !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only fetch profile if user changed
          if (currentUserId !== session.user.id) {
            currentUserId = session.user.id;
            
            // Defer profile fetching to avoid deadlock
            setTimeout(async () => {
              if (!isMounted) return;
              
              const result = await fetchProfile(session.user.id);
              if (result.success && isMounted) {
                setProfile(result.profile);
                
                // Create welcome notification for new signups - but only once
                if (event === 'SIGNED_IN' && !hasTriggeredWelcome && result.profile && !result.profile.onboarding_completed) {
                  setTimeout(async () => {
                    if (!isMounted) return;
                    
                    try {
                      // Check if user already has a welcome notification to prevent duplicates
                      const { data: existingWelcome } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .eq('type', 'daily_prompt')
                        .ilike('title', '%Welcome%')
                        .maybeSingle();

                      if (!existingWelcome && isMounted) {
                        setHasTriggeredWelcome(true);
                        const welcomePrompt = "Welcome! Start by recording your first memory.";

                        await supabase
                          .from('notifications')
                          .insert({
                            user_id: session.user.id,
                            type: 'daily_prompt',
                            title: 'Welcome to One Final Moment!',
                            message: `${welcomePrompt} Share a favorite childhood memory, a lesson you've learned, or something that makes you smile.`,
                            data: { 
                              prompt_text: welcomePrompt, 
                              action: 'welcome_video',
                              is_welcome: true 
                            }
                          });
                      }
                    } catch (error) {
                      console.error('Error creating welcome notification:', error);
                    }
                  }, 0);
                }
              }
              
              // Only set loading to false AFTER profile fetch is complete
              if (isMounted) {
                setIsLoading(false);
              }
            }, 0);
          } else {
            // User didn't change, but still set loading to false
            setIsLoading(false);
          }
        } else {
          setProfile(null);
          setHasTriggeredWelcome(false);
          currentUserId = null;
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          currentUserId = session.user.id;
          const result = await fetchProfile(session.user.id);
          if (result.success && isMounted) {
            setProfile(result.profile);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        if (isMounted) {
          console.error('Error getting session:', error);
          setError('Failed to restore session. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };
    
    initializeSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    setIsLoading(false);
    return !error;
  };

  const signup = async (email: string, password: string, name?: string): Promise<boolean> => {
    setIsLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    // Parse name if provided
    let firstName = '';
    let lastName = '';
    if (name) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // For development/testing - you can temporarily disable email confirmation
    // Remove this option in production!
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName || email.split('@')[0],
          last_name: lastName,
          name: name || email.split('@')[0]
        }
        // Uncomment the line below to skip email verification during testing
        // emailRedirectTo: undefined  // This disables email verification
      }
    });
    
    setIsLoading(false);
    return !error;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any cached data
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Set a flag for logout success message
      localStorage.setItem('logout_success', 'true');
      
      // The auth state change will be handled by the onAuthStateChange listener
      // and the app will automatically redirect to auth page
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear local state even if signOut failed
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Still set success flag since user is logged out locally
      localStorage.setItem('logout_success', 'true');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      login, 
      signup, 
      logout, 
      isLoading,
      error,
      retry,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}