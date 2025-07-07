import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/useGamification';
import { Trophy, Star } from 'lucide-react';

interface XPProgressBarProps {
  className?: string;
  showDetails?: boolean;
}

export function XPProgressBar({ className = '', showDetails = true }: XPProgressBarProps) {
  const { userGamification, getLevelProgress, loading } = useGamification();

  if (loading || !userGamification) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="w-20 h-4 bg-muted rounded animate-pulse" />
          <div className="w-16 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-full h-2 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const { progress, xpInLevel, xpForNextLevel } = getLevelProgress(
    userGamification.total_xp, 
    userGamification.current_level
  );

  const isMaxLevel = userGamification.current_level >= 5;

  if (isMaxLevel) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-center space-x-2 text-yellow-600">
          <Trophy className="w-5 h-5" />
          <span className="font-semibold">Max Level Reached!</span>
          <Trophy className="w-5 h-5" />
        </div>
        {showDetails && (
          <div className="text-center text-sm text-muted-foreground">
            Total XP: {userGamification.total_xp.toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showDetails && (
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Star className="w-4 h-4" />
            <span>Level {userGamification.current_level}</span>
          </div>
          <span className="font-medium text-foreground">
            {xpInLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
          </span>
        </div>
      )}
      
      <Progress 
        value={progress} 
        className="h-2 bg-muted"
      />
      
      {showDetails && (
        <div className="text-xs text-muted-foreground text-center">
          {Math.round(progress)}% to Level {userGamification.current_level + 1}
        </div>
      )}
    </div>
  );
}