import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserGamification {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  created_at: string;
  updated_at: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  action_type: string;
  xp_amount: number;
  reference_id?: string;
  transaction_date: string;
  created_at: string;
}

export interface Badge {
  id: string;
  level_required: number;
  name: string;
  description?: string;
  svg_icon: string;
  color: string;
  created_at: string;
}

export interface XPAwardResult {
  success: boolean;
  xpAwarded: number;
  totalXP: number;
  currentLevel: number;
  wasLevelUp: boolean;
  newBadge?: Badge;
  xpToNextLevel?: number;
  actionDescription: string;
}

export function useGamification() {
  const [userGamification, setUserGamification] = useState<UserGamification | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<XPTransaction[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate XP needed for next level
  const getXPForNextLevel = useCallback((currentLevel: number): number => {
    return ((currentLevel + 1) * (currentLevel + 1) * 10);
  }, []);

  // Calculate progress to next level
  const getLevelProgress = useCallback((totalXP: number, currentLevel: number) => {
    if (currentLevel >= 5) return { progress: 100, xpInLevel: 0, xpForNextLevel: 0 };
    
    let xpForCurrentLevel = 0;
    for (let i = 2; i <= currentLevel; i++) {
      xpForCurrentLevel += (i * i * 10);
    }
    
    const xpInCurrentLevel = totalXP - xpForCurrentLevel;
    const xpForNextLevel = getXPForNextLevel(currentLevel);
    const progress = Math.min((xpInCurrentLevel / xpForNextLevel) * 100, 100);
    
    return {
      progress,
      xpInLevel: xpInCurrentLevel,
      xpForNextLevel
    };
  }, [getXPForNextLevel]);

  // Load user gamification data
  const loadGamificationData = useCallback(async () => {
    if (!user) return;

    try {
      // Load user gamification stats
      const { data: gamification, error: gamificationError } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gamificationError && gamificationError.code !== 'PGRST116') {
        throw gamificationError;
      }

      if (gamification) {
        setUserGamification(gamification);
      } else {
        // Create initial gamification record for new user
        const { data: newGamification, error: createError } = await supabase
          .from('user_gamification')
          .insert({
            user_id: user.id,
            total_xp: 0,
            current_level: 1
          })
          .select()
          .single();

        if (createError) throw createError;
        setUserGamification(newGamification);
      }

      // Load recent XP transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;
      setRecentTransactions(transactions || []);

      // Load badge definitions
      const { data: badgeData, error: badgeError } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('level_required', { ascending: true });

      if (badgeError) throw badgeError;
      setBadges(badgeData || []);

    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Award XP for an action
  const awardXP = useCallback(async (
    actionType: 'video_create' | 'video_share' | 'video_public' | 'video_like' | 'referral' | 'video_watch_complete' | 'daily_prompt' | 'additional_prompt',
    referenceId?: string
  ): Promise<XPAwardResult | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('award-xp', {
        body: {
          userId: user.id,
          actionType,
          referenceId,
          ipAddress: undefined // Could add IP tracking for abuse prevention
        }
      });

      if (error) throw error;

      const result = data as XPAwardResult;

      // Show XP notification
      toast({
        title: `+${result.xpAwarded} XP`,
        description: result.actionDescription,
        duration: 3000,
      });

      // Show level up notification if applicable
      if (result.wasLevelUp && result.newBadge) {
        toast({
          title: "🎉 Level Up!",
          description: `You reached level ${result.currentLevel} and earned the "${result.newBadge.name}" badge!`,
          duration: 5000,
        });
      }

      // Refresh local data
      await loadGamificationData();

      return result;
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }, [user, toast, loadGamificationData]);

  // Get current user's badge
  const getCurrentBadge = useCallback(() => {
    if (!userGamification) return null;
    return badges.find(badge => badge.level_required === userGamification.current_level) || null;
  }, [userGamification, badges]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('gamification-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gamification',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadGamificationData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadGamificationData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadGamificationData]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadGamificationData();
    }
  }, [user, loadGamificationData]);

  return {
    userGamification,
    recentTransactions,
    badges,
    loading,
    awardXP,
    getCurrentBadge,
    getLevelProgress,
    refreshData: loadGamificationData
  };
}