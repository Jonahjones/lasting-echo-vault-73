import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bell, BellOff, Video, MessageCircle, Calendar, Users, Trash2, CheckCircle, Clock, Heart, Sparkles, Shield } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    refreshNotifications 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Prevent initial flashing by waiting for first load
    if (initialLoad) {
      refreshNotifications().finally(() => {
        setIsInitialized(true);
        setInitialLoad(false);
      });
    }
  }, [user, navigate, refreshNotifications, initialLoad]);

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.is_read
  );

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    switch (notification.type) {
      case 'daily_prompt':
      case 'draft_reminder':
        navigate('/record', { state: { prompt: notification.data?.prompt_text || notification.message }});
        break;
      case 'shared_video':
        navigate('/vault');
        break;
      case 'trusted_contact_added':
        navigate('/trusted-contact-center');
        break;
      default:
        console.log('Unknown notification type:', notification.type);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'daily_prompt': return <Sparkles className="w-5 h-5 text-accent-foreground" />;
      case 'shared_video': return <Video className="w-5 h-5 text-primary" />;
      case 'draft_reminder': return <MessageCircle className="w-5 h-5 text-muted-foreground" />;
      case 'delivery_confirmation': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'trusted_contact_added': return <Shield className="w-5 h-5 text-purple-600" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-card';
    switch (type) {
      case 'daily_prompt': return 'bg-accent/5 border-accent/20';
      case 'shared_video': return 'bg-primary/5 border-primary/20';
      case 'draft_reminder': return 'bg-muted/50 border-border';
      case 'delivery_confirmation': return 'bg-green-50 border-green-200';
      case 'trusted_contact_added': return 'bg-purple-50 border-purple-200';
      default: return 'bg-muted/20 border-border';
    }
  };

  const getActionText = (type: string) => {
    switch (type) {
      case 'daily_prompt':
      case 'draft_reminder': return 'Record Now';
      case 'shared_video': return 'View Video';
      case 'delivery_confirmation': return 'View Details';
      case 'trusted_contact_added': return 'Go to Trusted Contact Center';
      default: return 'View';
    }
  };

  // Don't render anything until initialized to prevent flash
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
            <div className="w-16"></div>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
              <Bell className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} new
              </p>
            )}
          </div>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Filter and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Button>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary hover:text-primary/80"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="shadow-gentle bg-gradient-subtle">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-gentle">
                <Heart className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-serif font-medium text-foreground mb-3">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {filter === 'unread' 
                  ? "You've read all your notifications. Check back later for new prompts and shared memories."
                  : "Keep making memories! When others share videos with you or daily prompts arrive, they'll appear here."
                }
              </p>
              <Button 
                onClick={() => navigate('/record')}
                className="shadow-gentle hover:shadow-warm transition-all duration-300"
              >
                <Video className="w-4 h-4 mr-2" />
                Record a Memory
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification.id}
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:shadow-comfort shadow-gentle",
                  getNotificationBgColor(notification.type, notification.is_read),
                  !notification.is_read && "border-l-4 border-l-primary"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      notification.type === 'daily_prompt' ? "bg-accent/10" :  
                      notification.type === 'shared_video' ? "bg-primary/10" :
                      notification.type === 'delivery_confirmation' ? "bg-green-100" :
                      notification.type === 'trusted_contact_added' ? "bg-purple-100" :
                      "bg-muted"
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium text-foreground mb-1",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                          >
                            {getActionText(notification.type)}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Engagement Message */}
        {filteredNotifications.length > 0 && (
          <Card className="shadow-gentle bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="font-medium text-foreground mb-2">
                Every Prompt is an Opportunity
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each notification is a gentle reminder to capture moments that matter. Your stories become treasures for those you love.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}