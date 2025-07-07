import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LevelInfoPopover } from './LevelInfoPopover';

interface UserGamification {
  current_level: number;
  total_xp: number;
}

interface BadgeDefinition {
  level_required: number;
  name: string;
  svg_icon: string;
  color: string;
}

interface UserLevelBadgeProps {
  userId: string;
  userName?: string;
  size?: 'sm' | 'md' | 'lg';
  showXP?: boolean;
  className?: string;
}

export function UserLevelBadge({ 
  userId, 
  userName,
  size = 'md', 
  showXP = false, 
  className = '' 
}: UserLevelBadgeProps) {
  const [userGamification, setUserGamification] = useState<UserGamification | null>(null);
  const [currentBadge, setCurrentBadge] = useState<BadgeDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      // Load user gamification data
      const { data: gamification } = await supabase
        .from('user_gamification')
        .select('current_level, total_xp')
        .eq('user_id', userId)
        .single();

      if (gamification) {
        setUserGamification(gamification);

        // Load corresponding badge
        const { data: badge } = await supabase
          .from('badge_definitions')
          .select('level_required, name, svg_icon, color')
          .eq('level_required', gamification.current_level)
          .single();

        setCurrentBadge(badge);
      }
    } catch (error) {
      console.error('Error loading user level data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-muted rounded-full ${getSizeClasses(size)} ${className}`} />
    );
  }

  if (!userGamification) {
    return null;
  }

  const sizeClasses = getSizeClasses(size);
  const textSize = getTextSize(size);

  const badgeContent = currentBadge ? (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`flex items-center justify-center rounded-full ${sizeClasses}`}
        style={{ backgroundColor: currentBadge.color + '20', border: `2px solid ${currentBadge.color}` }}
      >
        <div 
          className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}`}
          style={{ color: currentBadge.color }}
          dangerouslySetInnerHTML={{ __html: currentBadge.svg_icon }}
        />
      </div>
      
      <div className="flex flex-col">
        <Badge 
          variant="secondary" 
          className={`${textSize} font-semibold`}
          style={{ backgroundColor: currentBadge.color + '10', color: currentBadge.color }}
        >
          Level {userGamification.current_level}
        </Badge>
        
        {showXP && (
          <span className="text-xs text-muted-foreground">
            {userGamification.total_xp.toLocaleString()} XP
          </span>
        )}
      </div>
    </div>
  ) : (
    <Badge variant="secondary" className={`${sizeClasses} ${className}`}>
      <span className={textSize}>Level {userGamification.current_level}</span>
    </Badge>
  );

  return (
    <LevelInfoPopover 
      userId={userId} 
      userName={userName}
      trigger={
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
          {badgeContent}
        </div>
      }
    />
  );
}

function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'w-8 h-8';
    case 'lg': return 'w-14 h-14';
    default: return 'w-10 h-10';
  }
}

function getTextSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'text-xs';
    case 'lg': return 'text-base';
    default: return 'text-sm';
  }
}