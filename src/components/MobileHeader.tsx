import { Heart, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function MobileHeader() {
  const { logout, user } = useAuth();

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
          
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Hi {user?.user_metadata?.full_name || user?.email}
            <LogOut className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </header>
  );
}