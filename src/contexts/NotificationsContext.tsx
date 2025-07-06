import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type: 'shared_video' | 'daily_prompt' | 'draft_reminder' | 'delivery_confirmation';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyPrompt {
  id: string;
  prompt_text: string;
  date: string;
  created_at: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  createSkippedFirstVideoNotification: () => Promise<void>;
  createSecondVideoNotification: () => Promise<void>;
  createDailyPromptNotification: () => Promise<void>;
  createWelcomeNotification: () => Promise<void>;
  getTodaysPrompt: () => Promise<DailyPrompt | null>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const createSkippedFirstVideoNotification = async () => {
    if (!user) return;

    try {
      // Check if user already has this type of notification
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'draft_reminder')
        .maybeSingle();

      if (existingNotification) return; // Already has this notification

      // Create the notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'draft_reminder',
          title: 'Your First Memory Awaits',
          message: 'Take a moment to capture something meaningful. Your story matters.',
          data: { action: 'first_video_reminder' }
        });

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error creating skipped first video notification:', error);
    }
  };

  const createSecondVideoNotification = async () => {
    if (!user) return;

    try {
      // Array of meaningful prompts for second video notifications
      const promptOptions = [
        "Share a favorite story from your childhood that still makes you smile.",
        "Describe a family tradition you hope will be passed down forever.",
        "What is the best lesson you learned from your parents or grandparents?",
        "What advice would you give your younger self if you could?",
        "Tell the story of how you met your closest friend.",
        "What was the proudest moment of your life?",
        "Share a funny or embarrassing moment from your school years.",
        "What challenge in life taught you the most?",
        "Describe the day you became a parent.",
        "What dream do you still hope to achieve or wish you had pursued?",
        "Tell us about a family holiday or vacation you'll always remember.",
        "What's your favorite family recipe, and what memories are connected to it?",
        "Share a story about your favorite pet or animal companion.",
        "Describe the bravest thing you've ever done.",
        "What does happiness look like to you?",
        "Tell about a time you felt scared and what helped you through it.",
        "Who has had the biggest impact on your life, and why?",
        "Share a lesson you learned from making a mistake.",
        "What's the kindest thing someone ever did for you?",
        "What is a habit or routine that made your life better?",
        "Tell the story of your first job and what you learned from it.",
        "What advice would you give about friendship?",
        "What does love mean to you?",
        "Share a memory from a special family celebration.",
        "What is your favorite memory with your children or grandchildren?",
        "Tell about a tradition you started in your own family.",
        "What do you hope your children or grandchildren learn from you?",
        "What is the best piece of advice you ever received?",
        "What makes your family unique?",
        "Describe a time you overcame a fear.",
        "Share a moment when you laughed until you cried.",
        "What's a place that feels like home to you?",
        "Tell a story about an important teacher or mentor.",
        "Share a moment that changed your life.",
        "What are you most grateful for right now?",
        "What do you hope your legacy will be?",
        "Tell us about your favorite season or time of year and why it's meaningful.",
        "Share a memory of helping someone in need.",
        "What advice would you give about handling tough times?",
        "Describe a perfect day spent with the people you love.",
        "What family value or belief do you hope is passed on?",
        "Tell us about your first car or your first driving experience.",
        "What's a story from your parents' or grandparents' childhood that you want remembered?",
        "What's a simple pleasure that always makes you happy?",
        "What are you most proud of accomplishing in your life?",
        "What's something you admire about each of your children or family members?",
        "Share a memory from a family gathering or reunion.",
        "What do you wish for the future of our family?",
        "Tell us about a family challenge you faced together and how you got through it.",
        "What is a hope, wish, or blessing you want to leave for your loved ones?"
      ];

      // Select a random prompt
      const randomPrompt = promptOptions[Math.floor(Math.random() * promptOptions.length)];

      // Create the notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'daily_prompt',
          title: 'Ready for Another Recording?',
          message: `Tap to start your next memory: "${randomPrompt}"`,
          data: { prompt_text: randomPrompt, action: 'second_video' }
        });

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error creating second video notification:', error);
    }
  };

  const getTodaysPrompt = async (): Promise<DailyPrompt | null> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as DailyPrompt | null;
    } catch (error) {
      console.error('Error fetching today\'s prompt:', error);
      return null;
    }
  };

  const createWelcomeNotification = async () => {
    if (!user) return;

    try {
      // Welcome prompts to get new users started
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

      // Select a random welcome prompt
      const randomPrompt = welcomePrompts[Math.floor(Math.random() * welcomePrompts.length)];

      // Create the welcome notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'daily_prompt',
          title: 'Welcome to One Final Moment!',
          message: `Ready to create your first memory? ${randomPrompt}`,
          data: { 
            prompt_text: randomPrompt, 
            action: 'welcome_video',
            is_welcome: true 
          }
        });

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error creating welcome notification:', error);
    }
  };

  const createDailyPromptNotification = async () => {
    if (!user) return;

    try {
      const todaysPrompt = await getTodaysPrompt();
      
      if (!todaysPrompt) {
        console.log('No daily prompt available for today');
        return;
      }

      // Check if user already has today's prompt notification
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'daily_prompt')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (existingNotification) {
        console.log('User already has today\'s prompt notification');
        return;
      }

      // Create the daily prompt notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'daily_prompt',
          title: 'Today\'s Memory Prompt',
          message: `Take a moment to reflect: "${todaysPrompt.prompt_text}"`,
          data: { 
            prompt_text: todaysPrompt.prompt_text, 
            prompt_id: todaysPrompt.id,
            action: 'daily_prompt' 
          }
        });

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error creating daily prompt notification:', error);
    }
  };

  const refreshNotifications = fetchNotifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        createSkippedFirstVideoNotification,
        createSecondVideoNotification,
        createDailyPromptNotification,
        createWelcomeNotification,
        getTodaysPrompt,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}