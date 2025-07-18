import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Crown, Zap, Calendar, TrendingUp, Award } from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';
import { useGamificationCelebration } from '@/contexts/GamificationCelebrationContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TodayStats {
  xpGained: number;
  videosCreated: number;
  promptsCompleted: number;
}

interface LevelDropdownProps {
  children: React.ReactNode;
  className?: string;
}

export function LevelDropdown({ children, className = '' }: LevelDropdownProps) {
  const { userGamification, getCurrentBadge, getLevelProgress, loading } = useGamification();
  const { xpAnimation } = useGamificationCelebration();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats>({ xpGained: 0, videosCreated: 0, promptsCompleted: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Load today's stats when dropdown opens
  useEffect(() => {
    if (open && user) {
      loadTodayStats();
    }
  }, [open, user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const loadTodayStats = useCallback(async () => {
    if (!user) return;
    
    setLoadingStats(true);
    try {
      // Get today's date range in user's local timezone
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();
      
      console.log('Loading today stats for date range:', { todayStart, tomorrowStart, userId: user.id });
      
      // Get today's XP transactions - try both transaction_date and created_at fields
      const { data: xpTransactions, error: xpError } = await supabase
        .from('xp_transactions')
        .select('xp_amount, action_type, transaction_date, created_at')
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .lt('created_at', tomorrowStart);

      if (xpError) {
        console.error('Error loading XP transactions:', xpError);
      }

      // Get today's videos
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id, prompt, created_at')
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .lt('created_at', tomorrowStart);

      if (videosError) {
        console.error('Error loading videos:', videosError);
      }

      console.log('Today\'s XP transactions:', xpTransactions);
      console.log('Today\'s videos:', videos);

      const totalXP = xpTransactions?.reduce((sum, tx) => sum + tx.xp_amount, 0) || 0;
      const videosCount = videos?.length || 0;
      const promptsCount = videos?.filter(v => v.prompt).length || 0;

      setTodayStats({
        xpGained: totalXP,
        videosCreated: videosCount,
        promptsCompleted: promptsCount
      });
    } catch (error) {
      console.error('Error loading today stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  const handleToggle = useCallback((event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleToggle(event);
    } else if (event.key === 'Escape' && open) {
      setOpen(false);
    }
  }, [handleToggle, open]);

  if (loading || !userGamification) {
    return (
      <div className={`relative ${className}`}>
        <div 
          className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded transition-all"
          tabIndex={0}
          aria-label="Loading level information"
        >
          {children}
        </div>
      </div>
    );
  }

  const currentBadge = getCurrentBadge();
  const { progress, xpInLevel, xpForNextLevel } = getLevelProgress(
    userGamification.total_xp, 
    userGamification.current_level
  );
  const isMaxLevel = userGamification.current_level >= 5;

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      {/* Clickable Level Badge Trigger */}
      <div 
        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded transition-all duration-200 hover:scale-105"
        role="button"
        tabIndex={0}
        aria-label={`Level ${userGamification.current_level} - ${open ? 'Close' : 'Open'} level details`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50 opacity-100 transition-all duration-200 max-w-[calc(100vw-1rem)]">
          <Card className="border shadow-lg bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center space-x-2" aria-level={1}>
                  {currentBadge ? (
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: currentBadge.color }}
                        aria-label={`${currentBadge.name} badge`}
                      >
                        <div dangerouslySetInnerHTML={{ __html: currentBadge.svg_icon }} />
                      </div>
                      <span>Level {userGamification.current_level}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Star className="w-6 h-6 text-yellow-500" aria-hidden="true" />
                      <span>Level {userGamification.current_level}</span>
                    </div>
                  )}
                </CardTitle>
                <Badge variant={isMaxLevel ? "default" : "secondary"}>
                  {isMaxLevel ? "Max Level" : `${xpInLevel}/${xpForNextLevel} XP`}
                </Badge>
              </div>
              
              {currentBadge && (
                <p className="text-sm text-muted-foreground">{currentBadge.name}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Bar */}
              {!isMaxLevel && (
                <div className="space-y-2" role="region" aria-labelledby="progress-heading">
                  <div className="flex justify-between text-sm">
                    <span id="progress-heading">Progress to Level {userGamification.current_level + 1}</span>
                    <span aria-label={`${Math.round(progress)} percent complete`}>{Math.round(progress)}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={`h-3 transition-all duration-1000 ${xpAnimation.isAnimating ? 'animate-pulse' : ''}`}
                    aria-label={`Level progress: ${Math.round(progress)}% complete`}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {xpForNextLevel - xpInLevel} XP needed for next level
                  </div>
                </div>
              )}

              {isMaxLevel && (
                <div className="text-center py-4" role="region" aria-label="Maximum level achievement">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" aria-hidden="true" />
                  <p className="font-semibold text-yellow-600">Maximum Level Reached!</p>
                  <p className="text-sm text-muted-foreground">
                    Total XP: {userGamification.total_xp.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Today's Stats */}
              <div className="space-y-3" role="region" aria-labelledby="today-stats-heading">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  <span id="today-stats-heading">Today's Activity</span>
                </div>
                
                {loadingStats ? (
                  <div className="space-y-2" aria-label="Loading today's statistics">
                    <div className="h-3 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-xs" role="list" aria-label="Today's activity statistics">
                    <div 
                      className="text-center p-2 bg-muted/50 rounded" 
                      role="listitem" 
                      aria-label={`${todayStats.xpGained} XP gained today`}
                    >
                      <div className="font-semibold text-green-600">+{todayStats.xpGained}</div>
                      <div className="text-muted-foreground">XP Gained</div>
                    </div>
                    <div 
                      className="text-center p-2 bg-muted/50 rounded" 
                      role="listitem" 
                      aria-label={`${todayStats.videosCreated} videos created today`}
                    >
                      <div className="font-semibold text-blue-600">{todayStats.videosCreated}</div>
                      <div className="text-muted-foreground">Videos</div>
                    </div>
                    <div 
                      className="text-center p-2 bg-muted/50 rounded" 
                      role="listitem" 
                      aria-label={`${todayStats.promptsCompleted} prompts completed today`}
                    >
                      <div className="font-semibold text-purple-600">{todayStats.promptsCompleted}</div>
                      <div className="text-muted-foreground">Prompts</div>
                    </div>
                  </div>
                )}
              </div>

              {/* XP Animation Display */}
              {xpAnimation.isAnimating && (
                                 <div 
                   className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 rounded-lg p-3 opacity-100 transition-all duration-300"
                   role="alert"
                   aria-label={`You just gained ${xpAnimation.xpGained} XP`}
                 >
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <Zap className="w-5 h-5 animate-bounce" aria-hidden="true" />
                    <span className="font-bold text-lg">+{xpAnimation.xpGained} XP</span>
                    <Zap className="w-5 h-5 animate-bounce" aria-hidden="true" />
                  </div>
                  <div className="text-center text-xs text-green-700 mt-1">
                    Great job! Keep going!
                  </div>
                </div>
              )}

              {/* Quick Stats Summary */}
              <div className="pt-2 border-t" role="region" aria-label="Level summary">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Total XP:</span>
                    <span className="font-medium">{userGamification.total_xp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Level:</span>
                    <span className="font-medium">{userGamification.current_level}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 