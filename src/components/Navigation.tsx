import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Video, Users, Library, Shield, Inbox, ShieldCheck, UserCheck } from "lucide-react";
import { useTrustedContactStatus } from "@/hooks/useTrustedContactStatus";

export function Navigation() {
  const location = useLocation();
  const { isTrustedContact, isLoading } = useTrustedContactStatus();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-card border-b border-border shadow-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:shadow-gentle transition-all duration-300">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">One Final Moment</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/">Home</Link>
            </Button>
            
            <Button
              variant={isActive("/record") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/record" className="flex items-center space-x-1">
                <Video className="w-4 h-4" />
                <span>Record</span>
              </Link>
            </Button>
            
            <Button
              variant={isActive("/contacts") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/contacts" className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>Contacts</span>
              </Link>
            </Button>
            
            <Button
              variant={isActive("/shared-with-me") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/shared-with-me" className="flex items-center space-x-1">
                <Inbox className="w-4 h-4" />
                <span>Shared</span>
              </Link>
            </Button>
            
            <Button
              variant={isActive("/library") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/library" className="flex items-center space-x-1">
                <Library className="w-4 h-4" />
                <span>Library</span>
              </Link>
            </Button>
            

            
            {/* Trusted Contact Center - Always Available */}
            <Button
              variant={isActive("/trusted-contact-center") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/trusted-contact-center" className="flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Trusted Center</span>
              </Link>
            </Button>
            
            {/* Trusted Contact Dashboard - Show relationships where current user is trusted */}
            {!isLoading && isTrustedContact && (
              <Button
                variant={isActive("/trusted-contact-dashboard") ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link to="/trusted-contact-dashboard" className="flex items-center space-x-1">
                  <UserCheck className="w-4 h-4" />
                  <span>My Roles</span>
                </Link>
              </Button>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <div className="w-5 h-5 flex flex-col justify-center items-center">
                <div className="w-4 h-0.5 bg-foreground mb-1"></div>
                <div className="w-4 h-0.5 bg-foreground mb-1"></div>
                <div className="w-4 h-0.5 bg-foreground"></div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}