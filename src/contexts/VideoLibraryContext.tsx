import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useGamificationCelebration } from './GamificationCelebrationContext';

export interface SavedVideo {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  duration: string;
  videoUrl: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  category: "wisdom" | "story" | "love" | "advice";
  createdAt: string;
  scheduledDeliveryDate?: string;
  sharedWithContacts?: string[];
}

interface VideoLibraryContextType {
  videos: SavedVideo[];
  videoCount: number;
  storageLimit: number;
  storageUsed: number; // in GB
  storagePercentage: number;
  isAtStorageLimit: boolean;
  saveVideo: (videoData: {
    title: string;
    description: string;
    prompt?: string;
    videoBlob: Blob;
    duration: string;
    isPublic: boolean;
    category: "wisdom" | "story" | "love" | "advice";
    scheduledDeliveryDate?: Date;
    sharedWithContacts?: string[];
    isPromptOfTheDay?: boolean;
    shareMode?: 'regular' | 'trusted';
  }) => Promise<void>;
  updateVideo: (id: string, updates: Partial<SavedVideo>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  loading: boolean;
}

// Helper function to check if a prompt matches the current cycling prompt
const isDailyPromptCompletion = async (prompt: string): Promise<boolean> => {
  try {
    const { data: currentPrompt } = await (supabase as any).rpc('get_current_cycling_prompt').single();

    return currentPrompt && (
      currentPrompt.prompt_text === prompt ||
      // Also check for partial matches as prompts may be modified slightly
      prompt.includes(currentPrompt.prompt_text) ||
      currentPrompt.prompt_text.includes(prompt)
    );
  } catch (error) {
    console.error('Error checking cycling prompt:', error);
    return false;
  }
};

const VideoLibraryContext = createContext<VideoLibraryContextType | null>(null);

export function VideoLibraryProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { triggerXPAnimation } = useGamificationCelebration();

  // Storage limits - can be moved to a config later
  const storageLimit = 5; // Free tier video count limit (updated from 3 to 5)
  const storageLimitGB = 2; // Free tier storage limit in GB
  const videoCount = videos.length;
  const storageUsed = totalStorageBytes / (1024 * 1024 * 1024); // Convert bytes to GB
  const storagePercentage = Math.min((storageUsed / storageLimitGB) * 100, 100);
  const isAtStorageLimit = videoCount >= storageLimit;

  // Load videos from database
  const loadVideos = async () => {
    if (!user) {
      setVideos([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate total storage usage
      const totalBytes = (data || []).reduce((sum, video) => {
        return sum + (video.file_size || 0);
      }, 0);
      setTotalStorageBytes(totalBytes);

      const videosWithUrls = await Promise.all(
        (data || []).map(async (video) => {
          // Get signed URL for video file
          const { data: videoUrl } = await supabase.storage
            .from('videos')
            .createSignedUrl(video.file_path, 3600); // 1 hour expiry

          // Thumbnail URL would be generated here if thumbnail_path existed
          let thumbnailUrl;

          return {
            id: video.id,
            title: video.title,
            description: video.description || '',
            prompt: video.prompt,
            duration: video.duration,
            videoUrl: videoUrl?.signedUrl || '',
            thumbnailUrl,
            isPublic: video.is_public,
            category: video.category as "wisdom" | "story" | "love" | "advice",
            createdAt: video.created_at,
            scheduledDeliveryDate: video.scheduled_delivery_date,
            sharedWithContacts: video.shared_with_contacts || []
          };
        })
      );

      setVideos(videosWithUrls);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [user]);

  const saveVideo = async (videoData: {
    title: string;
    description: string;
    prompt?: string;
    videoBlob: Blob;
    duration: string;
    isPublic: boolean;
    category: "wisdom" | "story" | "love" | "advice";
    scheduledDeliveryDate?: Date;
    sharedWithContacts?: string[];
    isPromptOfTheDay?: boolean;
    shareMode?: 'regular' | 'trusted';
  }) => {
    if (!user) throw new Error('User not authenticated');

    // Check storage limit before saving
    if (isAtStorageLimit) {
      throw new Error('Storage limit reached. Please upgrade to save more videos.');
    }

    try {
      console.log('Saving video to Supabase...');
      
      // Generate file path
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
      const filePath = `${user.id}/${fileName}`;

      // Upload video to storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, videoData.videoBlob, {
          contentType: 'video/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Video uploaded successfully to:', filePath);

      // Save video metadata to database
      const { data, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: videoData.title,
          description: videoData.description,
          prompt: videoData.prompt,
          duration: videoData.duration,
          file_path: filePath,
          file_size: videoData.videoBlob.size,
          mime_type: 'video/webm',
          is_public: videoData.isPublic,
          category: videoData.category,
          scheduled_delivery_date: videoData.scheduledDeliveryDate?.toISOString(),
          shared_with_contacts: videoData.sharedWithContacts || [],
          share_mode: videoData.shareMode || 'regular'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        
        // If database save fails, clean up the uploaded file
        await supabase.storage.from('videos').remove([filePath]);
        throw dbError;
      }

      console.log('Video metadata saved to database:', data);

      // Award XP for creating a video
      try {
        await supabase.functions.invoke('award-xp', {
          body: {
            userId: user.id,
            actionType: 'video_create',
            referenceId: data.id
          }
        });
        console.log('XP awarded for video creation');
        // Trigger XP animation for video creation (10 XP)
        triggerXPAnimation(10);
      } catch (xpError) {
        console.error('Error awarding XP for video creation:', xpError);
      }

      // Check if this is a daily prompt completion and award bonus XP
      if (videoData.prompt && (videoData.isPromptOfTheDay || await isDailyPromptCompletion(videoData.prompt))) {
        try {
          await supabase.functions.invoke('award-xp', {
            body: {
              userId: user.id,
              actionType: 'daily_prompt',
              referenceId: data.id
            }
          });
          console.log('✨ Bonus XP awarded for daily prompt completion');
          // Trigger XP animation for daily prompt (15 XP)
          triggerXPAnimation(15);
        } catch (xpError) {
          console.error('Error awarding daily prompt bonus XP:', xpError);
        }
      } else if (videoData.prompt) {
        // This is an additional prompt beyond the daily prompt - award 5 XP
        try {
          await supabase.functions.invoke('award-xp', {
            body: {
              userId: user.id,
              actionType: 'additional_prompt',
              referenceId: data.id
            }
          });
          console.log('🎯 XP awarded for additional prompt recording');
          // Trigger XP animation for additional prompt (5 XP)
          triggerXPAnimation(5);
        } catch (xpError) {
          console.error('Error awarding additional prompt XP:', xpError);
        }
      }

      // Award XP for making video public (if applicable)
      if (videoData.isPublic) {
        try {
          await supabase.functions.invoke('award-xp', {
            body: {
              userId: user.id,
              actionType: 'video_public',
              referenceId: data.id
            }
          });
          console.log('XP awarded for making video public');
          // Trigger XP animation for public video (20 XP)
          triggerXPAnimation(20);
        } catch (xpError) {
          console.error('Error awarding XP for public video:', xpError);
        }
      }

      // Reload videos to update the list and count
      await loadVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }
  };

  const updateVideo = async (id: string, updates: Partial<SavedVideo>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('videos')
        .update({
          title: updates.title,
          description: updates.description,
          is_public: updates.isPublic,
          category: updates.category,
          scheduled_delivery_date: updates.scheduledDeliveryDate,
          shared_with_contacts: updates.sharedWithContacts
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Award XP if video was made public for the first time
      const originalVideo = videos.find(v => v.id === id);
      if (updates.isPublic && !originalVideo?.isPublic) {
        try {
          await supabase.functions.invoke('award-xp', {
            body: {
              userId: user.id,
              actionType: 'video_public',
              referenceId: id
            }
          });
          console.log('XP awarded for making video public');
        } catch (xpError) {
          console.error('Error awarding XP for making video public:', xpError);
        }
      }

      // Update local state
      setVideos(videos.map(video => 
        video.id === id ? { ...video, ...updates } : video
      ));
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  };

  const deleteVideo = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Get video record to find file path
      const { data: videoRecord, error: fetchError } = await supabase
        .from('videos')
        .select('file_path')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Delete video file from storage
      if (videoRecord.file_path) {
        const { error: deleteFileError } = await supabase.storage
          .from('videos')
          .remove([videoRecord.file_path]);
        
        if (deleteFileError) console.error('Error deleting video file:', deleteFileError);
      }

      // Delete video record from database
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // Update local state
      setVideos(videos.filter(video => video.id !== id));
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  };

  return (
    <VideoLibraryContext.Provider value={{
      videos,
      videoCount,
      storageLimit,
      storageUsed,
      storagePercentage,
      isAtStorageLimit,
      saveVideo,
      updateVideo,
      deleteVideo,
      loading
    }}>
      {children}
    </VideoLibraryContext.Provider>
  );
}

export function useVideoLibrary() {
  const context = useContext(VideoLibraryContext);
  if (!context) {
    throw new Error('useVideoLibrary must be used within a VideoLibraryProvider');
  }
  return context;
}