import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
  }) => Promise<void>;
  updateVideo: (id: string, updates: Partial<SavedVideo>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  loading: boolean;
}

const VideoLibraryContext = createContext<VideoLibraryContextType | null>(null);

export function VideoLibraryProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

      const videosWithUrls = await Promise.all(
        (data || []).map(async (video) => {
          // Get signed URL for video file
          const { data: videoUrl } = await supabase.storage
            .from('videos')
            .createSignedUrl(video.file_path, 3600); // 1 hour expiry

          // Get signed URL for thumbnail if it exists
          let thumbnailUrl;
          if (video.thumbnail_path) {
            const { data: thumbUrl } = await supabase.storage
              .from('videos')
              .createSignedUrl(video.thumbnail_path, 3600);
            thumbnailUrl = thumbUrl?.signedUrl;
          }

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
  }) => {
    if (!user) throw new Error('User not authenticated');

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
          shared_with_contacts: videoData.sharedWithContacts || []
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Video metadata saved to database:', data);

      // Reload videos to update the list
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
        .select('file_path, thumbnail_path')
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

      // Delete thumbnail file if exists
      if (videoRecord.thumbnail_path) {
        const { error: deleteThumbError } = await supabase.storage
          .from('videos')
          .remove([videoRecord.thumbnail_path]);
        
        if (deleteThumbError) console.error('Error deleting thumbnail:', deleteThumbError);
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