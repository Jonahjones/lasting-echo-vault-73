import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';

interface LevelBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showXP?: boolean;
  className?: string;
}

export function LevelBadge({ size = 'md', showXP = false, className = '' }: LevelBadgeProps) {
  const { userGamification, getCurrentBadge, loading } = useGamification();

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

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
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