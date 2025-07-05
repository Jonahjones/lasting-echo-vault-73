import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Heart, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  type: 'success' | 'error';
  title?: string;
  message?: string;
  className?: string;
}

export function VideoSuccessModal({ 
  isOpen, 
  onClose, 
  onRetry,
  type = 'success',
  title,
  message,
  className 
}: VideoSuccessModalProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowModal(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  const getIcon = () => {
    if (type === 'success') return CheckCircle;
    return AlertCircle;
  };

  const getTitle = () => {
    if (title) return title;
    if (type === 'success') return 'Memory Saved!';
    return 'Something Went Wrong';
  };

  const getMessage = () => {
    if (message) return message;
    if (type === 'success') return 'Your precious memory has been captured and saved securely. This moment will live on forever.';
    return 'We encountered an issue while saving your memory. Don\'t worry, your recording is safe and we can try again.';
  };

  const IconComponent = getIcon();

  if (!isOpen && !showModal) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300",
      showModal ? "opacity-100" : "opacity-0",
      className
    )}>
      <Card className={cn(
        "w-full max-w-md shadow-comfort border-0 bg-card/90 backdrop-blur-sm transition-all duration-300 transform",
        showModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        <CardHeader className="text-center space-y-4 pb-6">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-gentle",
            type === 'success' ? "bg-gradient-primary" : "bg-destructive"
          )}>
            <IconComponent className={cn(
              "w-8 h-8",
              type === 'success' ? "text-primary-foreground" : "text-destructive-foreground"
            )} />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-serif font-light text-foreground">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed">
              {getMessage()}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6 pb-8">
          {type === 'success' && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <div className="flex items-start space-x-3">
                <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every memory you create becomes a gift of love that transcends time. Thank you for sharing your story.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={cn(
            "space-y-3",
            type === 'error' && onRetry ? "grid grid-cols-2 gap-3 space-y-0" : ""
          )}>
            {type === 'error' && onRetry && (
              <Button
                onClick={onRetry}
                variant="default"
                size="lg"
                className="h-12 shadow-gentle hover:shadow-warm transition-all duration-300"
                aria-label="Retry saving the video"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button
              onClick={handleClose}
              variant={type === 'success' ? "default" : onRetry ? "outline" : "default"}
              size="lg"
              className={cn(
                "h-12 shadow-gentle hover:shadow-warm transition-all duration-300",
                type === 'success' && "w-full"
              )}
              aria-label="Continue"
            >
              {type === 'success' ? (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                "Close"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}