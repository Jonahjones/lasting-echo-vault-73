import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useGamificationCelebration } from '@/contexts/GamificationCelebrationContext';

export function XPAnimationToast() {
  const { xpAnimation } = useGamificationCelebration();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (xpAnimation.isAnimating) {
      setIsVisible(true);
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [xpAnimation.isAnimating, xpAnimation.animationId]);

  if (!isVisible || !xpAnimation.isAnimating) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 animate-bounce" />
          <span className="font-bold text-lg">+{xpAnimation.xpGained} XP</span>
          <Zap className="w-5 h-5 animate-bounce" />
        </div>
      </div>
    </div>
  );
} 