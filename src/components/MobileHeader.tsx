import { Heart, LogOut, User, Users, Video, Library, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useGamification } from "@/hooks/useGamification";

// Compact User Info Component
interface CompactUserInfoProps {
  user: any;
  profile: any;
  displayName: string;
  onLogout: () => void;
}

function CompactUserInfo({ user, profile, displayName, onLogout }: CompactUserInfoProps) {
  const { userGamification, getCurrentBadge, loading } = useGamification();

  const userInitials = profile?.display_name?.[0] || profile?.first_name?.[0] || user?.email?.[0] || 'U';
  const badge = getCurrentBadge();
  const currentLevel = userGamification?.current_level || 1;

  // Create tooltip content with user info and level description
  const tooltipContent = (
    <div className="text-center space-y-1">
      <p className="font-medium">{displayName}</p>
      <p className="text-xs text-muted-foreground">
        Level {currentLevel} • {userGamification?.total_xp?.toLocaleString() || 0} XP
      </p>
      {badge && (
        <p className="text-xs" style={{ color: badge.color }}>
          {badge.name}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex items-center space-x-3">
      {/* User name (hidden on mobile, shown on larger screens) */}
      <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-32">
        {displayName}
      </span>

      {/* Level Badge + Avatar Group */}
      <div className="flex items-center space-x-2">
        {/* Level Badge - positioned to the left of avatar */}
        {!loading && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative z-10">
                  <Badge 
                    variant="secondary" 
                    className="h-6 px-2 text-xs font-semibold rounded-full border-2 border-background shadow-sm"
                    style={{ 
                      backgroundColor: badge?.color ? `${badge.color}15` : undefined,
                      borderColor: 'hsl(var(--background))',
                      color: badge?.color || 'hsl(var(--foreground))'
                    }}
                  >
                    Lvl {currentLevel}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Avatar with Menu Badge Overlay */}
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-9 h-9 ring-2 ring-background hover:ring-primary/20 transition-all duration-200">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Menu Badge - Overlaid on Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default"
                size="sm" 
                className="absolute -bottom-1 -right-1 w-6 h-6 p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] min-w-[44px] sm:min-h-[24px] sm:min-w-[24px] touch-manipulation"
                aria-label="Open navigation menu"
              >
                <Menu className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg">
              <DropdownMenuItem asChild>
                <Link to="/record" className="flex items-center cursor-pointer">
                  <Video className="w-4 h-4 mr-3" />
                  <span>Record</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/library" className="flex items-center cursor-pointer">
                  <Library className="w-4 h-4 mr-3" />
                  <span>Library</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/contacts" className="flex items-center cursor-pointer">
                  <Users className="w-4 h-4 mr-3" />
                  <span>Contacts</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center cursor-pointer">
                  <User className="w-4 h-4 mr-3" />
                  <span>Profile & Settings</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={onLogout} className="flex items-center cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-3" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function MobileHeader() {
  const { logout, user, profile } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const displayName = profile?.display_name || 
    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '') ||
    user?.email || 'User';

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12 lg:h-14">
          {/* Logo - Left aligned */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:shadow-gentle transition-all duration-300">
              <Heart className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">One Final Moment</span>
          </Link>
          
          {/* User Info - Right aligned */}
          {user && (
            <CompactUserInfo
              user={user}
              profile={profile}
              displayName={displayName}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </header>
  );
}