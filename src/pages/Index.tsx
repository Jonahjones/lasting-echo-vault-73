import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Video, Users, Library, Settings, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user || !profile) {
    return null;
  }

  const quickActions = [
    {
      title: "Record Message",
      description: "Create a new legacy video",
      icon: Video,
      color: "bg-primary",
      path: "/record"
    },
    {
      title: "My Library", 
      description: "View your recorded messages",
      icon: Library,
      color: "bg-accent",
      path: "/library"
    },
    {
      title: "Contacts",
      description: "Manage your loved ones", 
      icon: Users,
      color: "bg-secondary",
      path: "/contacts"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-comfort pb-20">
      {/* Header */}
      <div className="pt-8 pb-6 px-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-gentle">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-light text-foreground">
                Welcome back, {profile.first_name || 'Friend'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Your legacy continues to grow
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="rounded-full"
          >
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <Settings className="w-5 h-5" />
            )}
          </Button>
        </div>

        {profile.tagline && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-foreground italic">
                  "{profile.tagline}"
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 space-y-4 max-w-sm mx-auto">
        <h2 className="text-lg font-serif font-medium text-foreground mb-4">
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.path}
              className="cursor-pointer transition-all duration-300 hover:shadow-warm hover:scale-[1.02] border-0 shadow-gentle"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>  
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
