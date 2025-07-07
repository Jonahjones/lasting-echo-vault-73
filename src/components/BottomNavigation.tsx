import { Link, useLocation } from "react-router-dom";
import { Heart, Video, Users, Library, Settings, Bell, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useVideoShares } from "@/hooks/useVideoShares";
import { NotificationsCenter } from "./NotificationsCenter";
import { useState } from "react";

export function BottomNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { sharedWithMe } = useVideoShares();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  // Count unread shared videos
  const unreadSharedCount = sharedWithMe.filter(share => !share.viewed_at).length;
  
  const navItems = [
    { path: "/", icon: Heart, label: "Home" },
    { path: "/record", icon: Video, label: "Record" },
    { path: "/shared-with-me", icon: Inbox, label: "Shared" },
    { path: "/library", icon: Library, label: "Library" },
    { path: "/notifications", icon: Bell, label: "Alerts" },
  ];

  // Don't show navigation if user is not authenticated
  if (!user) {
    return null;
  }
  
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-card z-50">
        <div className="flex items-center justify-around h-16 px-2 max-w-sm mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg relative transition-all duration-300 ${
                isActive(path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive(path) ? "text-primary" : ""}`} />
              <span className={`text-xs font-medium ${isActive(path) ? "text-primary" : ""}`}>
                {label}
              </span>
              {path === "/notifications" && unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {path === "/shared-with-me" && unreadSharedCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadSharedCount > 99 ? '99+' : unreadSharedCount}
                </Badge>
              )}
            </Link>
          ))}
          
        </div>
      </nav>
    </>
  );
}