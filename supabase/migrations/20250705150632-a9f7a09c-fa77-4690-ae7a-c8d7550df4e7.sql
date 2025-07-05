-- Add likes functionality to videos table
ALTER TABLE public.videos 
ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;

-- Create a table to track individual user likes
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on video_likes table
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for video_likes
CREATE POLICY "Users can view all video likes" 
ON public.video_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like videos" 
ON public.video_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" 
ON public.video_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update likes count
CREATE OR REPLACE FUNCTION public.update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update likes count
CREATE TRIGGER update_video_likes_count_trigger
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_likes_count();