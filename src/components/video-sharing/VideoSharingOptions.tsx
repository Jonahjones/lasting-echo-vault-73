import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info, Globe, Lock } from "lucide-react";

interface VideoSharingOptionsProps {
  isPublic: boolean;
  onVisibilityChange: (isPublic: boolean) => void;
}

export function VideoSharingOptions({ isPublic, onVisibilityChange }: VideoSharingOptionsProps) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isPublic ? (
            <Globe className="w-5 h-5 text-primary" />
          ) : (
            <Lock className="w-5 h-5 text-primary" />
          )}
          <span>Video Privacy</span>
        </CardTitle>
        <CardDescription>
          Control who can view your video message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-3">
          <div className="flex-1">
            <Label htmlFor="public-toggle" className="font-medium">
              Make video public
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {isPublic 
                ? "Anyone can discover and view this video in the public feed"
                : "Only you and selected contacts can view this video"
              }
            </p>
          </div>
          <Switch
            id="public-toggle"
            checked={isPublic}
            onCheckedChange={onVisibilityChange}
          />
        </div>
        
        <div className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            {isPublic ? (
              <>
                <strong>Public videos:</strong> Will appear in the community feed where other users can discover, view, and like your message. Your name will be visible to all viewers.
              </>
            ) : (
              <>
                <strong>Private videos:</strong> Only visible to you and contacts you specifically share with. Perfect for personal messages and family memories.
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}