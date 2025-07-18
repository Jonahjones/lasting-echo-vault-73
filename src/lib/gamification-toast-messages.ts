import { toast } from '@/hooks/use-toast';

export interface GamificationToastOptions {
  xpAwarded: number;
  totalXP: number;
  actionDescription: string;
  isDailyPrompt?: boolean;
  isFirstVideo?: boolean;
  wasLevelUp?: boolean;
  currentLevel?: number;
  newBadgeName?: string;
}

export function showVideoSavedToast(options: GamificationToastOptions) {
  const { xpAwarded, isDailyPrompt, isFirstVideo } = options;
  
  let title = "🎬 Video Saved Successfully!";
  let description = `Your memory has been preserved and you earned ${xpAwarded} XP!`;

  if (isFirstVideo) {
    title = "🌟 First Memory Recorded!";
    description = `Congratulations on your first video! You earned ${xpAwarded} XP and started your memory journey.`;
  } else if (isDailyPrompt) {
    title = "✨ Daily Prompt Completed!";
    description = `Great job completing today's prompt! You earned ${xpAwarded} XP plus bonus XP for daily engagement.`;
  }

  toast({
    title,
    description,
    duration: 5000,
  });
}

export function showXPGainToast(options: GamificationToastOptions) {
  const { xpAwarded, actionDescription, wasLevelUp, currentLevel, newBadgeName } = options;

  if (wasLevelUp && newBadgeName) {
    toast({
      title: "🎉 Level Up!",
      description: `Amazing! You reached Level ${currentLevel} and earned the "${newBadgeName}" badge! (+${xpAwarded} XP)`,
      duration: 6000,
    });
  } else {
    toast({
      title: `✨ +${xpAwarded} XP Earned!`,
      description: actionDescription,
      duration: 4000,
    });
  }
}

export function showDailyPromptCompletionToast() {
  toast({
    title: "🏆 Daily Challenge Complete!",
    description: "You've completed today's special prompt! Consider recording more stories to earn additional XP.",
    duration: 6000,
  });
}

export function showAdditionalPromptToast() {
  toast({
    title: "🎯 Great Story!",
    description: "You earned 5 XP for recording an additional prompt. Every story matters!",
    duration: 4000,
  });
}

export function showProgressToast(currentLevel: number, xpToNextLevel: number) {
  toast({
    title: "📈 Making Progress!",
    description: `Level ${currentLevel} • ${xpToNextLevel} XP to next level. Keep sharing your stories!`,
    duration: 4000,
  });
} 