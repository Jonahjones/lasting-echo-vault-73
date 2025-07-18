import React from 'react';
import { SocialFeed } from '@/components/social-feed/SocialFeed';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function SocialFeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Social Feed
          </h1>
          <p className="text-muted-foreground">
            Discover and engage with videos shared by your network
          </p>
        </div>

        {/* Social Feed */}
        <SocialFeed 
          autoPlayVideos={true}
          pageSize={10}
          className="w-full"
        />
      </div>
    </div>
  );
} 