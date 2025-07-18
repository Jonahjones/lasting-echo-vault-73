import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { LevelInfoPopover } from './LevelInfoPopover';
import { useAuth } from '@/contexts/AuthContext';

interface LevelBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showXP?: boolean;
  className?: string;
  clickable?: boolean;
}

export function LevelBadge({ size = 'md', showXP = false, className = '', clickable = true }: LevelBadgeProps) {
  const { userGamification, getCurrentBadge, loading } = useGamification();
  const { user, profile } = useAuth();

  if (loading || !userGamification) {
    return (
      <div className={`animate-pulse bg-muted rounded-full ${getSizeClasses(size)} ${className}`} />
    );
  }

  const badge = getCurrentBadge();
  const sizeClasses = getSizeClasses(size);
  const textSize = getTextSize(size);

  if (!badge) {
    return (
      <Badge variant="secondary" className={`${sizeClasses} ${className}`}>
        <span className={textSize}>Level {userGamification.current_level}</span>
      </Badge>
    );
  }

  const badgeContent = (
    <div className={`flex items-center space-x-2 ${className} ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}>
      <div 
        className={`flex items-center justify-center rounded-full ${sizeClasses}`}
        style={{ backgroundColor: badge.color + '20', border: `2px solid ${badge.color}` }}
      >
        <div 
          className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}`}
          style={{ color: badge.color }}
          dangerouslySetInnerHTML={{ __html: badge.svg_icon }}
        />
      </div>
      
      <div className="flex flex-col">
        <Badge 
          variant="secondary" 
          className={`${textSize} font-semibold`}
          style={{ backgroundColor: badge.color + '10', color: badge.color }}
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
  );

  if (clickable && user) {
    const displayName = profile?.display_name || 
      (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '') ||
      user?.email || 'You';

    return (
      <LevelInfoPopover 
        userId={user.id} 
        userName={displayName}
        trigger={badgeContent}
      />
    );
  }

  return badgeContent;
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