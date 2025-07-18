import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Trophy, Zap, Sparkles } from 'lucide-react';
import { XPAwardResult } from '@/hooks/useGamification';

interface XPCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpResult: XPAwardResult | null;
  isDailyPrompt?: boolean;
  isFirstVideo?: boolean;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  animationDelay: number;
}

export function XPCelebrationModal({ 
  isOpen, 
  onClose, 
  xpResult, 
  isDailyPrompt, 
  isFirstVideo 
}: XPCelebrationModalProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showXPCounter, setShowXPCounter] = useState(false);
  const [currentXP, setCurrentXP] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const confettiColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  useEffect(() => {
    if (isOpen && xpResult) {
      generateConfetti();
      
      // Show XP counter animation
      setTimeout(() => setShowXPCounter(true), 300);
      
      // Animate XP count up
      setTimeout(() => {
        let count = 0;
        const increment = Math.max(1, Math.floor(xpResult.xpAwarded / 20));
        const timer = setInterval(() => {
          count += increment;
          if (count >= xpResult.xpAwarded) {
            count = xpResult.xpAwarded;
            clearInterval(timer);
            
            // Show level up if applicable
            if (xpResult.wasLevelUp) {
              setTimeout(() => setShowLevelUp(true), 500);
            }
          }
          setCurrentXP(count);
        }, 50);
      }, 800);

      // Auto close after celebration
      const autoCloseTimer = setTimeout(() => {
        onClose();
      }, isDailyPrompt || isFirstVideo ? 8000 : 5000);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [isOpen, xpResult, isDailyPrompt, isFirstVideo, onClose]);

  const generateConfetti = () => {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < (xpResult?.wasLevelUp ? 50 : 30); i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        animationDelay: Math.random() * 2
      });
    }
    setConfetti(pieces);
  };

  const resetState = () => {
    setConfetti([]);
    setShowXPCounter(false);
    setCurrentXP(0);
    setShowLevelUp(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!xpResult) return null;

  const getCelebrationMessage = () => {
    if (isFirstVideo) {
      return "🌟 Congratulations on your first memory! 🌟";
    }
    if (isDailyPrompt) {
      return "✨ Daily Prompt Completed! ✨";
    }
    if (xpResult.wasLevelUp) {
      return "🎉 Level Up! 🎉";
    }
    return "🎯 Great job recording! 🎯";
  };

  const getEncouragementMessage = () => {
    if (isFirstVideo) {
      return "You've taken the first step in preserving your precious memories. Every story you share becomes a treasure for the future.";
    }
    if (isDailyPrompt) {
      return "You've completed today's special prompt! Consider recording more stories to earn additional XP and continue building your legacy.";
    }
    if (xpResult.wasLevelUp) {
      return `Amazing! You've reached Level ${xpResult.currentLevel} and earned the "${xpResult.newBadge?.name}" badge. Keep sharing your stories!`;
    }
    return "Every memory you record brings you closer to your next level. Keep sharing your amazing stories!";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md overflow-hidden relative bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
        {/* Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-3 h-3 opacity-80"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
                animation: `confettiFall 3s ease-out ${piece.animationDelay}s infinite`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center space-y-6 p-6">
          {/* Main Celebration Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {getCelebrationMessage()}
            </h2>
            <p className="text-muted-foreground">
              {getEncouragementMessage()}
            </p>
          </div>

          {/* XP Award Display */}
          {showXPCounter && (
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Zap className="w-6 h-6 text-amber-600" />
                <span className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                  +{currentXP} XP
                </span>
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {xpResult.actionDescription}
              </p>
            </div>
          )}

          {/* Level Up Display */}
          {showLevelUp && xpResult.wasLevelUp && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Trophy className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  Level {xpResult.currentLevel}
                </span>
              </div>
              {xpResult.newBadge && (
                <div className="flex items-center justify-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: xpResult.newBadge.color + '20', border: `2px solid ${xpResult.newBadge.color}` }}
                  >
                    <div 
                      className="w-5 h-5"
                      style={{ color: xpResult.newBadge.color }}
                      dangerouslySetInnerHTML={{ __html: xpResult.newBadge.svg_icon }}
                    />
                  </div>
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {xpResult.newBadge.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Progress to Next Level */}
          {!xpResult.wasLevelUp && xpResult.xpToNextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress to Level {xpResult.currentLevel + 1}</span>
                <span>{xpResult.xpToNextLevel} XP to go</span>
              </div>
              <Progress 
                value={((xpResult.totalXP % 100) / 100) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {(isDailyPrompt || isFirstVideo) && (
              <Button
                variant="default"
                onClick={handleClose}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Star className="w-4 h-4 mr-2" />
                Continue Recording
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              {isDailyPrompt || isFirstVideo ? "Maybe Later" : "Awesome!"}
            </Button>
          </div>
        </div>

        {/* Add CSS for confetti animation to index.css */}
      </DialogContent>
    </Dialog>
  );
} 