-- Enable real-time for all relevant tables
-- This allows real-time subscriptions to work properly

-- Enable replica identity for complete row data during updates
ALTER TABLE public.videos REPLICA IDENTITY FULL;
ALTER TABLE public.video_likes REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add tables to the realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;