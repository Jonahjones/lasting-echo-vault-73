import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Video, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CyclingPrompt {
  id: number;
  prompt_text: string;
  interval_number: number;
  next_change_at: string;
}

interface PromptOfTheDayProps {
  className?: string;
}

export function PromptOfTheDay({ className = "" }: PromptOfTheDayProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentPrompt, setCurrentPrompt] = useState<CyclingPrompt | null>(null);
  const [alternativePrompt, setAlternativePrompt] = useState<string | null>(null);
  const [xpForPrompt, setXpForPrompt] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFirstVideoCelebration, setIsFirstVideoCelebration] = useState(false);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(0);

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

  // Load current cycling prompt
  const loadCurrentPrompt = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_current_cycling_prompt').single();

      if (error) {
        console.error('Error loading cycling prompt:', error);
        // Fallback to a default prompt if none exists
        setCurrentPrompt({
          id: 0,
          prompt_text: "What's something you're grateful for today?",
          interval_number: 0,
          next_change_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });
      } else if (data) {
        setCurrentPrompt(data);
        
        // Show toast when prompt changes (except on initial load)
        if (!isLoading && currentPrompt && data.id !== currentPrompt.id) {
          toast({
            title: "✨ Fresh prompt loaded!",
            description: "A new inspiring prompt is ready for you to record!",
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentPrompt, toast]);

  // Calculate countdown to next prompt
  const updateCountdown = useCallback(() => {
    if (!currentPrompt?.next_change_at) return;
    
    const nextChange = new Date(currentPrompt.next_change_at).getTime();
    const now = Date.now();
    const secondsLeft = Math.max(0, Math.floor((nextChange - now) / 1000));
    
    setNextUpdateIn(secondsLeft);
  }, [currentPrompt?.next_change_at]);

  useEffect(() => {
    if (user) {
      loadCurrentPrompt();
      loadXPConfig();
    }
  }, [user, loadCurrentPrompt]);

  // Set up 5-minute polling for new prompts
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      loadCurrentPrompt();
    }, 5 * 60 * 1000); // Poll every 5 minutes

    return () => clearInterval(interval);
  }, [user, loadCurrentPrompt]);

  // Set up countdown timer
  useEffect(() => {
    if (!currentPrompt?.next_change_at) return;

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    return () => clearInterval(interval);
  }, [currentPrompt?.next_change_at, updateCountdown]);

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

    const promptToUse = alternativePrompt || currentPrompt?.prompt_text;
    
    if (promptToUse) {
      navigate('/record', { 
        state: { 
          prompt: promptToUse,
          isPromptOfTheDay: !alternativePrompt // true only if using cycling prompt, not alternative
        } 
      });
    } else {
      navigate('/record');
    }
  };

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentPromptText = alternativePrompt || currentPrompt?.prompt_text;

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
    <Card className={`shadow-sm border bg-white dark:bg-card transition-all duration-500 ${showCelebration ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''} ${className}`}>
      <CardContent className="p-3 lg:p-4 space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                {alternativePrompt ? "Alternative Prompt" : "Today's Memory Prompt"}
              </span>
            </div>
            {!alternativePrompt && currentPrompt && nextUpdateIn > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                New in {formatCountdown(nextUpdateIn)}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            +{xpForPrompt} XP
          </Badge>
        </div>

        {showCelebration && (
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isFirstVideoCelebration 
                  ? "🎉 Amazing! You've recorded your first memory! Keep building your legacy!" 
                  : "✨ Great job! Your memory has been saved to your library!"}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2 lg:space-y-3">
          <h3 className="text-base lg:text-lg font-medium text-foreground leading-relaxed">
            {currentPromptText || "Loading your inspiring prompt..."}
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleRecordStory}
              className={`flex-1 h-10 text-sm transition-all duration-300 ${
                isButtonAnimating ? 'scale-95' : 'hover:scale-[1.02]'
              }`}
              disabled={!currentPromptText}
            >
              <Video className="mr-2 h-4 w-4" />
              Record Your Story
            </Button>
            
            <Button 
              variant="outline" 
              onClick={getRandomAlternativePrompt}
              className="h-10 text-sm"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Try Different
            </Button>
          </div>
        </div>

        {!alternativePrompt && currentPrompt && (
          <div className="text-xs text-muted-foreground text-center">
            Prompt #{currentPrompt.id} • Refreshes every 5 minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
} 