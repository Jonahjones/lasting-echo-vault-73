import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Video, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateEncouragementProps {
  onRecordNow: () => void;
  onRecordLater: () => void;
  className?: string;
}

export function EmptyStateEncouragement({ 
  onRecordNow, 
  onRecordLater, 
  className 
}: EmptyStateEncouragementProps) {
  return (
    <div className={cn("min-h-screen bg-gradient-comfort flex items-center justify-center px-4", className)}>
      <div className="w-full max-w-lg">
        <Card className="shadow-comfort border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-gentle">
              <Heart className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <div className="space-y-4">
              <CardTitle className="text-3xl font-serif font-light text-foreground leading-relaxed">
                Your Story Matters
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
                Every moment you don't record is a precious memory that could be shared with those you love. Your voice, your wisdom, your heart—they all deserve to be remembered.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8 px-8 pb-8">
            {/* Inspiration Cards */}
            <div className="grid gap-4">
              <div className="flex items-center space-x-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Share Your Wisdom</p>
                  <p className="text-xs text-muted-foreground">The lessons you've learned are gifts to future generations</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-accent/5 rounded-xl border border-accent/20">
                <Clock className="w-6 h-6 text-accent-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Capture This Moment</p>
                  <p className="text-xs text-muted-foreground">Today's feelings and thoughts will be tomorrow's treasures</p>
                </div>
              </div>
            </div>

            {/* Gentle Reminder */}
            <div className="text-center space-y-4">
              <blockquote className="text-base text-foreground font-serif italic leading-relaxed">
                "The best gift you can give your loved ones is the gift of your authentic self, preserved in time."
              </blockquote>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={onRecordNow}
                size="lg"
                className="w-full h-16 text-lg font-medium shadow-gentle hover:shadow-warm transition-all duration-300 hover:scale-[1.02]"
                aria-label="Record your memory now"
              >
                <Video className="w-6 h-6 mr-3" />
                Record My Memory Now
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
              
              <Button
                onClick={onRecordLater}
                variant="outline"
                size="lg"
                className="w-full h-12 text-base font-medium border-border/60 hover:border-primary/30 hover:bg-primary/5"
                aria-label="Remind me to record later"
              >
                Remind Me Later
              </Button>
            </div>

            {/* Gentle Message */}
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We'll gently remind you to capture your memories. Your story is too important to forget.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}