import { Heart, LogOut, Settings, User, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { useState } from "react";

export function MobileHeader() {
  const { logout, user, profile } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/auth";
  };

  return (
    <header className="bg-card border-b border-border shadow-card sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:shadow-gentle transition-all duration-300">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">One Final Moment</span>
          </Link>
          
          <div className="flex items-center space-x-2">
            <LevelBadge size="sm" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {profile?.display_name?.[0] || profile?.first_name?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-20">
                    {profile?.display_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '') || user?.email || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contacts" className="flex items-center cursor-pointer">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Contacts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center cursor-pointer">
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy & Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}