import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { formatDistanceToNow } from 'date-fns';
import { 
  Video, 
  Share, 
  Globe, 
  Heart, 
  UserPlus, 
  Eye,
  TrendingUp
} from 'lucide-react';

interface XPHistoryCardProps {
  className?: string;
}

const actionIcons = {
  video_create: Video,
  video_share: Share,
  video_public: Globe,
  video_like: Heart,
  referral: UserPlus,
  video_watch_complete: Eye
};

const actionColors = {
  video_create: 'text-blue-600',
  video_share: 'text-green-600',
  video_public: 'text-purple-600',
  video_like: 'text-red-600',
  referral: 'text-yellow-600',
  video_watch_complete: 'text-indigo-600'
};

export function XPHistoryCard({ className = '' }: XPHistoryCardProps) {
  const { recentTransactions, loading } = useGamification();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Recent XP</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                  <div className="space-y-1">
                    <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                    <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-12 h-6 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentTransactions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Recent XP</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No XP earned yet!</p>
            <p className="text-sm">Start creating and sharing videos to earn XP.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Recent XP</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {recentTransactions.map((transaction) => {
            const IconComponent = actionIcons[transaction.action_type as keyof typeof actionIcons] || Video;
            const colorClass = actionColors[transaction.action_type as keyof typeof actionColors] || 'text-gray-600';
            
            return (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${colorClass}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {getActionDescription(transaction.action_type)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className="bg-green-100 text-green-800 font-semibold"
                >
                  +{transaction.xp_amount} XP
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getActionDescription(actionType: string): string {
  const descriptions = {
    video_create: 'Created video',
    video_share: 'Shared video',
    video_public: 'Made video public',
    video_like: 'Received like',
    referral: 'Successful referral',
    video_watch_complete: 'Video watched'
  };
  
  return descriptions[actionType as keyof typeof descriptions] || 'Unknown action';
}