import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

  const fetchProfile = async (userId: string, timeout = 10000) => {
    try {
      console.log('Fetching profile for user:', userId);
      setError(null);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), timeout);
      });

      // Race between the actual request and timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      console.log('Profile fetch result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
        return false;
      }

      setProfile(data || null);
      return true;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile');
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const retry = async () => {
    if (user) {
      setIsLoading(true);
      setRetryCount(prev => prev + 1);
      const success = await fetchProfile(user.id);
      if (success) {
        setError(null);
      }
      setIsLoading(false);
    } else {
      // If no user, try to get session again
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const success = await fetchProfile(session.user.id);
          if (success) {
            setError(null);
          }
        } else {
          setError('No user session found. Please log in again.');
        }
      } catch (error) {
        setError('Failed to restore session');
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let profileFetched = false;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only fetch profile if we haven't already fetched it for this user
          if (!profileFetched) {
            profileFetched = true;
            const success = await fetchProfile(session.user.id);
            if (!success) {
              profileFetched = false; // Allow retry on failure
            }
          }

          // Create welcome notification for new signups - but only once
          if (event === 'SIGNED_IN' && !hasTriggeredWelcome) {
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
              // Delay slightly to ensure NotificationsContext is ready
              setTimeout(async () => {
                if (!isMounted) return;
                try {
                  const welcomePrompts = [
                    "Welcome! Let's start with something simple - tell us about your favorite childhood memory.",
                    "Share a piece of advice you'd give to someone just starting their career.",
                    "What's a family tradition that means a lot to you?",
                    "Tell us about a moment that made you laugh recently.",
                    "Share your favorite recipe and the story behind it.",
                    "What's the best gift you've ever received, and why was it special?",
                    "Describe a place that feels like home to you.",
                    "What's something you learned from your parents or grandparents?",
                    "Share a memory from your first day at a new job or school.",
                    "Tell us about a friend who has made a big impact on your life.",
                    "What's a hobby or activity that brings you joy?",
                    "Share a moment when you felt proud of yourself.",
                    "What's your favorite season and what makes it special?",
                    "Tell us about a book, movie, or song that changed how you see the world.",
                    "What's a simple pleasure that always makes you smile?"
                  ];

                  const randomPrompt = welcomePrompts[Math.floor(Math.random() * welcomePrompts.length)];

                  await supabase
                    .from('notifications')
                    .insert({
                      user_id: session.user.id,
                      type: 'daily_prompt',
                      title: 'Welcome to One Final Moment!',
                      message: `Ready to create your first memory? ${randomPrompt}`,
                      data: { 
                        prompt_text: randomPrompt, 
                        action: 'welcome_video',
                        is_welcome: true 
                      }
                    });
                } catch (error) {
                  console.error('Error creating welcome notification:', error);
                }
              }, 1000);
            }
          }
        } else {
          setProfile(null);
          setHasTriggeredWelcome(false);
          profileFetched = false;
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        profileFetched = true;
        const success = await fetchProfile(session.user.id);
        if (!success) {
          profileFetched = false; // Allow retry on failure
        }
      }
      
      setIsLoading(false);
    }).catch((error) => {
      if (isMounted) {
        console.error('Error getting session:', error);
        setError('Failed to restore session');
        setIsLoading(false);
      }
    });

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
      
      // Show success message and redirect
      setTimeout(() => {
        window.location.href = '/auth?logout=success';
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect even if there's an error
      window.location.href = '/auth';
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