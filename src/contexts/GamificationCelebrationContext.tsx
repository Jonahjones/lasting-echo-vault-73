import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { XPAwardResult } from '@/hooks/useGamification';
import { XPCelebrationModal } from '@/components/gamification/XPCelebrationModal';

interface XPAnimationState {
  isAnimating: boolean;
  xpGained: number;
  showProgress: boolean;
  animationId: string;
}

interface CelebrationContextType {
  showCelebration: (xpResult: XPAwardResult, isDailyPrompt?: boolean, isFirstVideo?: boolean) => void;
  closeCelebration: () => void;
  isShowingCelebration: boolean;
  // XP Animation functions
  triggerXPAnimation: (xpGained: number) => void;
  xpAnimation: XPAnimationState;
  clearXPAnimation: () => void;
}

const GamificationCelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function useGamificationCelebration() {
  const context = useContext(GamificationCelebrationContext);
  if (!context) {
    throw new Error('useGamificationCelebration must be used within a GamificationCelebrationProvider');
  }
  return context;
}

interface GamificationCelebrationProviderProps {
  children: ReactNode;
}

export function GamificationCelebrationProvider({ children }: GamificationCelebrationProviderProps) {
  const [celebrationData, setCelebrationData] = useState<{
    xpResult: XPAwardResult | null;
    isDailyPrompt: boolean;
    isFirstVideo: boolean;
    isOpen: boolean;
  }>({
    xpResult: null,
    isDailyPrompt: false,
    isFirstVideo: false,
    isOpen: false
  });

  const [xpAnimation, setXPAnimation] = useState<XPAnimationState>({
    isAnimating: false,
    xpGained: 0,
    showProgress: false,
    animationId: ''
  });

  const showCelebration = (xpResult: XPAwardResult, isDailyPrompt = false, isFirstVideo = false) => {
    setCelebrationData({
      xpResult,
      isDailyPrompt,
      isFirstVideo,
      isOpen: true
    });
  };

  const closeCelebration = () => {
    setCelebrationData(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const triggerXPAnimation = useCallback((xpGained: number) => {
    const animationId = Date.now().toString();
    
    setXPAnimation({
      isAnimating: true,
      xpGained,
      showProgress: true,
      animationId
    });

    // Clear animation after 3 seconds
    setTimeout(() => {
      setXPAnimation(prev => ({
        ...prev,
        isAnimating: false,
        showProgress: false
      }));
    }, 3000);
  }, []);

  const clearXPAnimation = useCallback(() => {
    setXPAnimation({
      isAnimating: false,
      xpGained: 0,
      showProgress: false,
      animationId: ''
    });
  }, []);

  const value: CelebrationContextType = {
    showCelebration,
    closeCelebration,
    isShowingCelebration: celebrationData.isOpen,
    triggerXPAnimation,
    xpAnimation,
    clearXPAnimation
  };

  return (
    <GamificationCelebrationContext.Provider value={value}>
      {children}
      <XPCelebrationModal
        isOpen={celebrationData.isOpen}
        onClose={closeCelebration}
        xpResult={celebrationData.xpResult}
        isDailyPrompt={celebrationData.isDailyPrompt}
        isFirstVideo={celebrationData.isFirstVideo}
      />
    </GamificationCelebrationContext.Provider>
  );
} 