import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Video, Shuffle, ArrowRight, Sparkles, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";

interface PromptOfTheDayProps {
  className?: string;
}

interface DailyPrompt {
  id: string;
  prompt_text: string;
  date: string;
}



export function PromptOfTheDay({ className = "" }: PromptOfTheDayProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt | null>(null);
  const [alternativePrompt, setAlternativePrompt] = useState<string | null>(null);
  const [xpForPrompt, setXpForPrompt] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFirstVideoCelebration, setIsFirstVideoCelebration] = useState(false);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);

  // Alternative prompts for variety
  const alternativePrompts = [
    "What's a lesson you learned the hard way?",
    "Share a moment that changed your perspective on life.",
    "What would you tell your younger self?", 
    "Describe a time when you felt truly proud.",
    "What's a family tradition you cherish?",
    "Tell about a friendship that shaped who you are.",
    "What brings you peace in difficult times?",
    "Share your favorite memory from childhood.",
    "What skill are you most proud of developing?",
    "Describe a moment of unexpected kindness you experienced."
  ];

  useEffect(() => {
    if (user) {
      loadTodayPrompt();
      loadXPConfig();
    }
  }, [user]);

  // Check if user just recorded (simple check for celebration)
  useEffect(() => {
    const recordingCompleted = sessionStorage.getItem('recording_completed');
    const firstVideoCompleted = sessionStorage.getItem('first_video_completed');
    
    if (recordingCompleted === 'true') {
      setShowCelebration(true);
      sessionStorage.removeItem('recording_completed');
      
      if (firstVideoCompleted === 'true') {
        sessionStorage.removeItem('first_video_completed');
        setIsFirstVideoCelebration(true);
        // First video gets bonus XP celebration
        setTimeout(() => {
          setShowCelebration(false);
          setIsFirstVideoCelebration(false);
        }, 7000);
      } else {
        setTimeout(() => setShowCelebration(false), 5000);
      }
    }
  }, []);

  const loadTodayPrompt = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('date', today)
        .single();

      if (error) {
        console.error('Error loading today\'s prompt:', error);
        // Fallback to a default prompt if none exists for today
        setTodayPrompt({
          id: 'default',
          prompt_text: "What's something you're grateful for today?",
          date: today
        });
      } else {
        setTodayPrompt(data);
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const loadXPConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('xp_config')
        .select('xp_amount')
        .eq('action_type', 'video_create')
        .eq('is_active', true)
        .single();

      if (data) {
        setXpForPrompt(data.xp_amount);
      }
    } catch (error) {
      console.error('Error loading XP config:', error);
    }
  };

  const getRandomAlternativePrompt = () => {
    const randomPrompt = alternativePrompts[Math.floor(Math.random() * alternativePrompts.length)];
    setAlternativePrompt(randomPrompt);
    
    toast({
      title: "✨ New prompt loaded!",
      description: "Ready to record your response to this inspiring prompt?",
      duration: 3000,
    });
  };

  const handleRecordStory = () => {
    setIsButtonAnimating(true);
    setTimeout(() => setIsButtonAnimating(false), 600);

    const promptToUse = alternativePrompt || todayPrompt?.prompt_text;
    
    if (promptToUse) {
      navigate('/record', { 
        state: { 
          prompt: promptToUse,
          isPromptOfTheDay: !alternativePrompt // true only if using today's prompt, not alternative
        } 
      });
    } else {
      navigate('/record');
    }
  };


  const currentPrompt = alternativePrompt || todayPrompt?.prompt_text;

  if (isLoading) {
    return (
      <Card className={`shadow-sm border bg-white dark:bg-card ${className}`}>
        <CardContent className="p-3 lg:p-4">
          <div className="animate-pulse space-y-2 lg:space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-sm border bg-white dark:bg-card hover:shadow-md transition-shadow duration-300 ${className}`}>
      <CardContent className="p-3 lg:p-4 space-y-2 lg:space-y-3">
        {/* Celebration Banner */}
        {showCelebration && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 animate-in slide-in-from-top duration-500">
            <div className="flex items-center justify-center gap-2 text-green-800 dark:text-green-200">
              <Gift className="w-4 h-4 animate-bounce" />
              <span className="font-semibold text-sm">
                {isFirstVideoCelebration ? `+${xpForPrompt * 2} XP! Welcome! 🎉` : `+${xpForPrompt} XP! Great job! 🎉`}
              </span>
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-3 h-3 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            {alternativePrompt ? "Alternative Prompt" : "Today's Prompt"}
          </h3>
        </div>

        {/* Prompt Card */}
        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
          <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-relaxed text-center">
            "{currentPrompt}"
          </p>
        </div>

        {/* Single Encouragement Line */}
        <p className="text-center text-xs text-gray-600 dark:text-gray-400">
          Record today's prompt to earn {xpForPrompt} XP!
        </p>

        {/* Main CTA Button */}
        <Button
          onClick={handleRecordStory}
          size="lg"
          className={`w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all duration-300 ${
            isButtonAnimating ? 'animate-pulse scale-105' : 'hover:scale-[1.02]'
          }`}
          aria-label={`Record your response to today's prompt: ${currentPrompt}. You'll earn ${xpForPrompt} XP.`}
        >
          <Video className="w-4 h-4 mr-2" />
          Record My Story
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Subtle Secondary Link */}
        <div className="flex justify-center pt-1">
          <button
            onClick={getRandomAlternativePrompt}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 flex items-center gap-1"
            aria-label="Get a different writing prompt if this one doesn't inspire you"
          >
            <Shuffle className="w-3 h-3" />
            See another prompt
          </button>
        </div>
      </CardContent>
    </Card>
  );
} 