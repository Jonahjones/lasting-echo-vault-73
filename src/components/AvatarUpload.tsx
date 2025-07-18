import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange?: (url: string | null) => void;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({ currentAvatarUrl, onAvatarChange, size = "lg" }: AvatarUploadProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32"
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, or WebP image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique filename with proper path structure
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage with timeout
      const uploadPromise = supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 30000)
      );

      const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (uploadError) throw uploadError;

      // Get public URL using the path from upload response
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(uploadData.path);

      // Add cache busting parameter to ensure immediate display
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('Avatar uploaded successfully:', { path: uploadData.path, publicUrl, cacheBustedUrl });

      // Update user profile with avatar URL
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Refresh profile context to update everywhere instantly
      await refreshProfile();
      onAvatarChange?.(cacheBustedUrl);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully"
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Upload failed",
        description: `Failed to update your avatar: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile context to update everywhere instantly
      await refreshProfile();
      onAvatarChange?.(null);
      
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed"
      });

    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Error",
        description: "Failed to remove avatar. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} border-2 border-border transition-all duration-200 group-hover:border-primary/50`}>
          <AvatarImage src={currentAvatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <User className={size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-12 h-12"} />
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
             onClick={handleUploadClick}>
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>

      {size === "lg" && (
        <div className="flex flex-col items-center space-y-2">
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            variant="outline"
            size="sm"
            className="w-32"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Photo"}
          </Button>
          
          {currentAvatarUrl && (
            <Button
              onClick={handleRemoveAvatar}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80"
            >
              Remove Photo
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}