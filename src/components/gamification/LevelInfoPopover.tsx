import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Crown, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserGamification {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  created_at: string;
  updated_at: string;
}

interface Badge {
  id: string;
  level_required: number;
  name: string;
  description?: string;
  svg_icon: string;
  color: string;
}

interface LevelInfoPopoverProps {
  userId: string;
  trigger: React.ReactNode;
  userName?: string;
}

export function LevelInfoPopover({ userId, trigger, userName }: LevelInfoPopoverProps) {
  const [userGamification, setUserGamification] = useState<UserGamification | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserGamification();
    }
  }, [open, userId]);

  const loadUserGamification = async () => {
    setLoading(true);
    try {
      // Load user gamification data
      const { data: gamification } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Load badge definitions
      const { data: badgeData } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('level_required', { ascending: true });

      setUserGamification(gamification);
      setBadges(badgeData || []);
    } catch (error) {
      console.error('Error loading user gamification:', error);
    } finally {
      setLoading(false);
    }
  };

  const getXPForNextLevel = (currentLevel: number): number => {
    return ((currentLevel + 1) * (currentLevel + 1) * 10);
  };

  const getLevelProgress = (totalXP: number, currentLevel: number) => {
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
  };

  const getCurrentBadge = () => {
    if (!userGamification) return null;
    return badges.find(badge => badge.level_required === userGamification.current_level) || null;
  };

  if (!userGamification && !loading) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground">
              {userName || 'This user'} hasn't started their journey yet
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const currentBadge = getCurrentBadge();
  const { progress, xpInLevel, xpForNextLevel } = userGamification 
    ? getLevelProgress(userGamification.total_xp, userGamification.current_level)
    : { progress: 0, xpInLevel: 0, xpForNextLevel: 0 };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                <div className="w-16 h-3 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded animate-pulse" />
          </div>
        ) : userGamification ? (
          <div className="space-y-4">
            {/* Header with Badge and Level */}
            <div className="flex items-center space-x-3">
              {currentBadge ? (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                  style={{ 
                    backgroundColor: currentBadge.color + '20',
                    borderColor: currentBadge.color
                  }}
                >
                  <div 
                    className="w-6 h-6"
                    style={{ color: currentBadge.color }}
                    dangerouslySetInnerHTML={{ __html: currentBadge.svg_icon }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="font-semibold">
                    Level {userGamification.current_level}
                  </Badge>
                  {currentBadge && (
                    <span className="text-xs font-medium" style={{ color: currentBadge.color }}>
                      {currentBadge.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {userGamification.total_xp.toLocaleString()} XP Total
                </p>
              </div>
            </div>

            {/* Progress to Next Level */}
            {userGamification.current_level < 5 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Progress to Level {userGamification.current_level + 1}
                  </span>
                  <span className="font-medium">
                    {xpInLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {Math.round(progress)}% complete
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="flex items-center justify-center space-x-2 text-yellow-600">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-semibold">Max Level Reached!</span>
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Badge Collection Preview */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center space-x-1">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <span>Badges Earned</span>
                </h4>
                <span className="text-xs text-muted-foreground">
                  {badges.filter(b => b.level_required <= userGamification.current_level).length} / {badges.length}
                </span>
              </div>
              
              <div className="flex space-x-1">
                {badges.slice(0, 5).map((badge) => {
                  const isUnlocked = badge.level_required <= userGamification.current_level;
                  return (
                    <div
                      key={badge.id}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                        isUnlocked ? 'border-2' : 'border border-dashed opacity-40'
                      }`}
                      style={{ 
                        backgroundColor: isUnlocked ? badge.color + '20' : 'transparent',
                        borderColor: isUnlocked ? badge.color : '#ccc'
                      }}
                      title={`${badge.name} - Level ${badge.level_required}`}
                    >
                      {isUnlocked ? (
                        <div 
                          className="w-4 h-4"
                          style={{ color: badge.color }}
                          dangerouslySetInnerHTML={{ __html: badge.svg_icon }}
                        />
                      ) : (
                        <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="border-t pt-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="flex items-center justify-center space-x-1 text-primary">
                    <Zap className="w-3 h-3" />
                    <span className="text-lg font-bold">{userGamification.current_level}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Current Level</p>
                </div>
                <div>
                  <div className="flex items-center justify-center space-x-1 text-primary">
                    <Star className="w-3 h-3" />
                    <span className="text-lg font-bold">{userGamification.total_xp.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}