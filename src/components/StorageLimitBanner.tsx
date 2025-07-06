import { AlertTriangle, Crown, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StorageLimitBannerProps {
  videoCount: number;
  storageLimit: number;
  isAtLimit: boolean;
  className?: string;
}

export function StorageLimitBanner({ videoCount, storageLimit, isAtLimit, className = "" }: StorageLimitBannerProps) {
  const remaining = storageLimit - videoCount;
  
  const getBannerMessage = () => {
    if (isAtLimit) {
      return "You've reached your storage limit. Upgrade to Premium for unlimited recordings.";
    }
    
    if (remaining === 1) {
      return "You're just 1 video away from your limit.";
    }
    
    if (remaining === 2) {
      return "You're just 2 videos away from your limit.";
    }
    
    return `${remaining} videos remaining before your limit.`;
  };

  const getBannerVariant = () => {
    if (isAtLimit) return "destructive";
    if (remaining <= 1) return "destructive";
    return "default";
  };

  if (videoCount === 0) return null;

  return (
    <Alert variant={getBannerVariant()} className={`shadow-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isAtLimit ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
          <div className="space-y-1">
            <AlertDescription className="font-medium">
              {getBannerMessage()}
            </AlertDescription>
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant="outline" className="px-2 py-0.5">
                {videoCount} / {storageLimit} videos used
              </Badge>
            </div>
          </div>
        </div>
        
        {isAtLimit && (
          <Button size="sm" variant="secondary" className="flex items-center space-x-1">
            <Crown className="w-4 h-4" />
            <span>Upgrade</span>
          </Button>
        )}
      </div>
    </Alert>
  );
}