import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoLikes } from "@/hooks/useVideoLikes";
import { cn } from "@/lib/utils";

interface VideoLikeButtonProps {
  videoId: string;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "button" | "inline";
  showCount?: boolean;
  className?: string;
}

export function VideoLikeButton({ 
  videoId, 
  size = "md", 
  variant = "minimal",
  showCount = true,
  className 
}: VideoLikeButtonProps) {
  const { hasLiked, likesCount, isLoading, toggleLike } = useVideoLikes(videoId);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLike}
        disabled={isLoading}
        className={cn(
          "flex items-center space-x-2 transition-all duration-200 hover:scale-105",
          className
        )}
      >
        <Heart 
          className={cn(
            sizeClasses[size],
            "transition-all duration-300",
            hasLiked 
              ? "fill-red-500 text-red-500 animate-pulse" 
              : "text-muted-foreground hover:text-red-400",
            isLoading && "opacity-50"
          )}
        />
        {showCount && (
          <span className={cn(
            textSizeClasses[size],
            hasLiked ? "text-red-500 font-medium" : "text-muted-foreground"
          )}>
            {likesCount}
          </span>
        )}
      </Button>
    );
  }

  if (variant === "inline") {
    return (
      <button
        onClick={toggleLike}
        disabled={isLoading}
        className={cn(
          "flex items-center space-x-1 transition-all duration-200 hover:scale-105 focus:outline-none",
          className
        )}
      >
        <Heart 
          className={cn(
            sizeClasses[size],
            "transition-all duration-300",
            hasLiked 
              ? "fill-red-500 text-red-500" 
              : "text-muted-foreground hover:text-red-400",
            isLoading && "opacity-50"
          )}
        />
        {showCount && (
          <span className={cn(
            textSizeClasses[size],
            hasLiked ? "text-red-500 font-medium" : "text-muted-foreground"
          )}>
            {likesCount}
          </span>
        )}
      </button>
    );
  }

  // Minimal variant (default)
  return (
    <button
      onClick={toggleLike}
      disabled={isLoading}
      className={cn(
        "group flex items-center space-x-1 transition-all duration-200 focus:outline-none",
        "hover:scale-110 active:scale-95",
        className
      )}
    >
      <div className="relative">
        <Heart 
          className={cn(
            sizeClasses[size],
            "transition-all duration-300",
            hasLiked 
              ? "fill-red-500 text-red-500 drop-shadow-sm" 
              : "text-muted-foreground group-hover:text-red-400",
            isLoading && "opacity-50"
          )}
        />
        {/* Pulse animation on like */}
        {hasLiked && (
          <Heart 
            className={cn(
              sizeClasses[size],
              "absolute inset-0 fill-red-500 text-red-500 animate-ping opacity-30"
            )}
          />
        )}
      </div>
      {showCount && (
        <span className={cn(
          textSizeClasses[size],
          "transition-colors duration-200",
          hasLiked 
            ? "text-red-500 font-medium" 
            : "text-muted-foreground group-hover:text-foreground"
        )}>
          {likesCount}
        </span>
      )}
    </button>
  );
}