-- Create video categories table for dynamic category management
CREATE TABLE public.video_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE, -- URL-friendly identifier (e.g., 'wisdom', 'story')
  label TEXT NOT NULL, -- Display name (e.g., 'Wisdom', 'Stories')
  description TEXT, -- Optional description for admin reference
  icon_name TEXT NOT NULL DEFAULT 'Circle', -- Lucide icon name
  emoji TEXT NOT NULL DEFAULT '📝', -- Emoji for category
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Hex color for category theming
  sort_order INTEGER NOT NULL DEFAULT 0, -- For ordering categories
  is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable categories
  is_default BOOLEAN NOT NULL DEFAULT false, -- Default category for new videos
  video_count INTEGER NOT NULL DEFAULT 0, -- Cached count of videos in category
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;

-- Public read access for active categories
CREATE POLICY "Active video categories are publicly readable"
ON public.video_categories
FOR SELECT
USING (is_active = true);

-- Admin-only write access
CREATE POLICY "Admins can manage video categories"
ON public.video_categories
FOR ALL
USING (public.is_user_admin());

-- Add updated_at trigger
CREATE TRIGGER update_video_categories_updated_at
  BEFORE UPDATE ON public.video_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories (matching current hardcoded values)
INSERT INTO public.video_categories (value, label, description, icon_name, emoji, color, sort_order, is_default) VALUES
('wisdom', 'Wisdom', 'Share life lessons, insights, and valuable knowledge', 'Lightbulb', '💡', '#F59E0B', 1, true),
('story', 'Stories', 'Tell personal stories, memories, and experiences', 'MessageCircle', '📖', '#8B5CF6', 2, false),
('love', 'Love', 'Express love, affection, and heartfelt messages', 'Heart', '❤️', '#EF4444', 3, false),
('advice', 'Advice', 'Provide guidance, tips, and recommendations', 'Clock', '⏰', '#10B981', 4, false);

-- Function to update video counts for categories
CREATE OR REPLACE FUNCTION public.update_category_video_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update count for the old category (if exists)
  IF TG_OP = 'UPDATE' AND OLD.category IS DISTINCT FROM NEW.category THEN
    UPDATE public.video_categories 
    SET video_count = (
      SELECT COUNT(*) FROM public.videos 
      WHERE category = OLD.category AND is_public = true
    )
    WHERE value = OLD.category;
  END IF;
  
  -- Update count for the new/current category
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.video_categories 
    SET video_count = (
      SELECT COUNT(*) FROM public.videos 
      WHERE category = NEW.category AND is_public = true
    )
    WHERE value = NEW.category;
  END IF;
  
  -- Update count for deleted video's category
  IF TG_OP = 'DELETE' THEN
    UPDATE public.video_categories 
    SET video_count = (
      SELECT COUNT(*) FROM public.videos 
      WHERE category = OLD.category AND is_public = true
    )
    WHERE value = OLD.category;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain video counts
CREATE TRIGGER update_category_counts_on_video_change
  AFTER INSERT OR UPDATE OR DELETE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_category_video_counts();

-- Function to get default category
CREATE OR REPLACE FUNCTION public.get_default_category()
RETURNS TEXT AS $$
DECLARE
  default_cat TEXT;
BEGIN
  SELECT value INTO default_cat 
  FROM public.video_categories 
  WHERE is_default = true AND is_active = true 
  ORDER BY sort_order 
  LIMIT 1;
  
  -- Fallback to first active category if no default set
  IF default_cat IS NULL THEN
    SELECT value INTO default_cat 
    FROM public.video_categories 
    WHERE is_active = true 
    ORDER BY sort_order 
    LIMIT 1;
  END IF;
  
  -- Ultimate fallback
  RETURN COALESCE(default_cat, 'wisdom');
END;
$$ LANGUAGE plpgsql STABLE;

-- Add constraint to ensure only one default category
CREATE UNIQUE INDEX idx_video_categories_single_default 
ON public.video_categories (is_default) 
WHERE is_default = true AND is_active = true;

-- Add real-time replication for instant updates
ALTER TABLE public.video_categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_categories;

-- Create indexes for performance
CREATE INDEX idx_video_categories_active ON public.video_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_video_categories_sort_order ON public.video_categories(sort_order);
CREATE INDEX idx_video_categories_value ON public.video_categories(value);

-- Update videos table to reference categories table (soft reference for flexibility)
-- Note: We're not adding a foreign key constraint to allow for easier category management
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);

-- Grant permissions
GRANT SELECT ON public.video_categories TO authenticated;
GRANT ALL ON public.video_categories TO service_role; 