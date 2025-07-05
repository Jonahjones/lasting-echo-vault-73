import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandedLoaderProps {
  isVisible: boolean;
  title?: string;
  messages?: string[];
  showPatienceMessage?: boolean;
  className?: string;
}

const defaultMessages = [
  "Getting things ready for your special moment…",
  "Preparing your memory capture experience…",
  "Setting up the perfect space for your story…",
  "Almost ready to capture your meaningful memory…"
];

const memoryQuotes = [
  "\"The moments we share become the memories we cherish.\"",
  "\"Every story matters, every memory is precious.\"",
  "\"Your voice carries love across time.\"",
  "\"Creating connections that last forever.\"",
  "\"Preserving what matters most.\""
];

export function BrandedLoader({ 
  isVisible, 
  title = "Memory Journal", 
  messages = defaultMessages,
  showPatienceMessage = true,
  className 
}: BrandedLoaderProps) {
  const [currentMessage, setCurrentMessage] = useState(messages[0]);
  const [showPatience, setShowPatience] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(memoryQuotes[0]);

  useEffect(() => {
    if (!isVisible) return;

    let messageIndex = 0;
    let quoteIndex = 0;

    // Rotate through loading messages
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }, 2500);

    // Rotate through quotes
    const quoteInterval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % memoryQuotes.length;
      setCurrentQuote(memoryQuotes[quoteIndex]);
    }, 4000);

    // Show patience message after 6 seconds
    const patienceTimeout = setTimeout(() => {
      if (showPatienceMessage && isVisible) {
        setShowPatience(true);
        setCurrentMessage("Thanks for your patience—your story is important to us.");
      }
    }, 6000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(quoteInterval);
      clearTimeout(patienceTimeout);
    };
  }, [isVisible, messages, showPatienceMessage]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-gradient-comfort backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="text-center space-y-8 px-6 max-w-md mx-auto animate-fade-in">
        {/* Brand Logo */}
        <div className="flex items-center justify-center space-x-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-gentle animate-gentle-scale">
              <Heart className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-primary/20 rounded-3xl animate-warm-pulse"></div>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl font-serif font-light text-foreground">
          {title}
        </h1>

        {/* Loading Spinner */}
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>

        {/* Loading Message */}
        <div className="space-y-4">
          <p 
            className="text-lg font-medium text-foreground transition-all duration-500 animate-fade-in"
            key={currentMessage}
            role="status"
            aria-live="polite"
          >
            {currentMessage}
          </p>
          
          {showPatience && (
            <p className="text-sm text-muted-foreground animate-fade-in">
              Your moment of connection is almost ready
            </p>
          )}
        </div>

        {/* Inspirational Quote */}
        <div className="border-t border-border/30 pt-6">
          <p 
            className="text-base text-muted-foreground italic font-serif leading-relaxed transition-all duration-700"
            key={currentQuote}
          >
            {currentQuote}
          </p>
        </div>
      </div>
    </div>
  );
}