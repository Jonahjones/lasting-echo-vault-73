import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { Lock, Crown } from 'lucide-react';

interface BadgeShowcaseProps {
  className?: string;
}

export function BadgeShowcase({ className = '' }: BadgeShowcaseProps) {
  const { userGamification, badges, getCurrentBadge, loading } = useGamification();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5" />
            <span>Badges</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-16 h-16 bg-muted rounded-full animate-pulse mx-auto" />
                <div className="w-20 h-4 bg-muted rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentBadge = getCurrentBadge();
  const currentLevel = userGamification?.current_level || 1;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Crown className="w-5 h-5 text-yellow-600" />
          <span>Badges Collection</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {badges.map((badge) => {
            const isUnlocked = badge.level_required <= currentLevel;
            const isCurrent = currentBadge?.id === badge.id;
            
            return (
              <div key={badge.id} className="text-center space-y-2">
                <div 
                  className={`relative w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 transition-all duration-300 ${
                    isUnlocked 
                      ? `shadow-lg ${isCurrent ? 'ring-2 ring-primary' : ''}` 
                      : 'opacity-40 border-dashed'
                  }`}
                  style={{ 
                    backgroundColor: isUnlocked ? badge.color + '20' : 'transparent',
                    borderColor: isUnlocked ? badge.color : '#ccc'
                  }}
                >
                  {isUnlocked ? (
                    <div 
                      className="w-8 h-8"
                      style={{ color: badge.color }}
                      dangerouslySetInnerHTML={{ __html: badge.svg_icon }}
                    />
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}
                  
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium truncate">
                    {badge.name}
                  </div>
                  <Badge 
                    variant={isUnlocked ? "default" : "secondary"}
                    className="text-xs"
                  >
                    Level {badge.level_required}
                  </Badge>
                  {badge.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {badge.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}