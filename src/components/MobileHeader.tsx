import { Heart, LogOut, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { NotificationsCenter } from "./NotificationsCenter";
import { useState } from "react";

export function MobileHeader() {
  const { logout, user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

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
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
            
            <Link to="/profile">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate max-w-20">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <NotificationsCenter 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </header>
  );
}