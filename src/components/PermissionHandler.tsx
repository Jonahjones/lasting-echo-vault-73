import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Mic, AlertCircle, RefreshCw, Settings, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermissionHandlerProps {
  onPermissionGranted: () => void;
  onSkipForNow: () => void;
  permissionType: 'camera' | 'microphone' | 'both';
  className?: string;
}

export function PermissionHandler({ 
  onPermissionGranted, 
  onSkipForNow, 
  permissionType = 'both',
  className 
}: PermissionHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasTriedBefore, setHasTriedBefore] = useState(false);

  const handleRetryPermissions = async () => {
    setIsRetrying(true);
    setHasTriedBefore(true);
    
    try {
      const constraints = {
        video: permissionType === 'camera' || permissionType === 'both',
        audio: permissionType === 'microphone' || permissionType === 'both'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop the stream immediately as we just needed to test permissions
      stream.getTracks().forEach(track => track.stop());
      
      onPermissionGranted();
    } catch (error) {
      console.error('Permission still denied:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getIcon = () => {
    if (permissionType === 'camera') return Camera;
    if (permissionType === 'microphone') return Mic;
    return Camera; // Default for 'both'
  };

  const getTitle = () => {
    if (permissionType === 'camera') return 'Camera Access Needed';
    if (permissionType === 'microphone') return 'Microphone Access Needed';
    return 'Camera & Microphone Access Needed';
  };

  const getDescription = () => {
    if (permissionType === 'camera') return 'To record your video message, we need access to your camera.';
    if (permissionType === 'microphone') return 'To capture your voice, we need access to your microphone.';
    return 'To record your video message, we need access to your camera and microphone.';
  };

  const IconComponent = getIcon();

  return (
    <div className={cn("min-h-screen bg-gradient-comfort flex items-center justify-center px-4", className)}>
      <div className="w-full max-w-md">
        <Card className="shadow-comfort border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle">
              <IconComponent className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-serif font-light text-foreground">
                {getTitle()}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed">
                {getDescription()}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 px-6 pb-8">
            {/* Permission Explanation */}
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Why do we need this?
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your privacy matters to us. We only access your {permissionType === 'both' ? 'camera and microphone' : permissionType} to create your personal video message. Nothing is stored or shared without your explicit permission.
                  </p>
                </div>
              </div>
            </div>

            {/* Browser Instructions */}
            {hasTriedBefore && (
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <div className="flex items-start space-x-3">
                  <Settings className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Still having trouble?
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Check your browser settings and make sure camera/microphone access is allowed for this site. Look for a camera icon in your address bar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleRetryPermissions}
                disabled={isRetrying}
                size="lg"
                className="w-full h-14 text-lg font-medium shadow-gentle hover:shadow-warm transition-all duration-300"
                aria-label={`Grant ${permissionType} permissions to continue`}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    Requesting Access...
                  </>
                ) : (
                  <>
                    <IconComponent className="w-5 h-5 mr-3" />
                    {hasTriedBefore ? 'Try Again' : 'Grant Access'}
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </>
                )}
              </Button>
              
              <Button
                onClick={onSkipForNow}
                variant="outline"
                size="lg"
                className="w-full h-12 text-base font-medium border-border/60 hover:border-primary/30 hover:bg-primary/5"
                aria-label="Skip for now and record later"
              >
                I'll Record Later
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can always record your message later from your dashboard. Your memories are worth the wait.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}