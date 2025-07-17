-- Create video_prompts table for dynamic prompt management
CREATE TABLE public.video_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  usage_context TEXT NOT NULL DEFAULT 'general', -- 'general', 'daily', 'alternative', 'followup', 'first_video'
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Higher priority prompts shown more often
  min_user_level INTEGER DEFAULT 1, -- Minimum user level to see this prompt
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0, -- Track how often this prompt is used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_video_prompts_active ON public.video_prompts(is_active);
CREATE INDEX idx_video_prompts_context ON public.video_prompts(usage_context);
CREATE INDEX idx_video_prompts_category ON public.video_prompts(category);
CREATE INDEX idx_video_prompts_priority ON public.video_prompts(priority DESC);
CREATE INDEX idx_video_prompts_featured ON public.video_prompts(is_featured);

-- Enable RLS
ALTER TABLE public.video_prompts ENABLE ROW LEVEL SECURITY;

-- Public read access for active prompts
CREATE POLICY "Anyone can view active prompts"
ON public.video_prompts
FOR SELECT
USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage prompts"
ON public.video_prompts
FOR ALL
USING (public.is_user_admin());

-- Add updated_at trigger
CREATE TRIGGER update_video_prompts_updated_at
  BEFORE UPDATE ON public.video_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts from current hardcoded arrays

-- General prompts (from Record.tsx additionalPrompts)
INSERT INTO public.video_prompts (prompt_text, category, usage_context, priority, tags) VALUES
('What are you most proud of in your life?', 'wisdom', 'general', 10, '{"pride", "accomplishment", "reflection"}'),
('What advice would you give to your younger self?', 'wisdom', 'general', 10, '{"advice", "reflection", "youth"}'),
('What do you hope people remember about you?', 'legacy', 'general', 9, '{"legacy", "memory", "impact"}'),
('What''s the most important lesson life has taught you?', 'wisdom', 'general', 10, '{"lesson", "wisdom", "experience"}'),
('What brings you the most joy?', 'happiness', 'general', 8, '{"joy", "happiness", "positive"}'),
('What would you want your loved ones to know about facing challenges?', 'advice', 'general', 9, '{"challenges", "advice", "strength"}'),
('What traditions do you hope will continue in your family?', 'family', 'general', 8, '{"tradition", "family", "heritage"}'),
('What story from your childhood shaped who you became?', 'story', 'general', 9, '{"childhood", "story", "development"}'),
('What are you grateful for today?', 'gratitude', 'general', 7, '{"gratitude", "appreciation", "present"}'),
('What would you want to say to someone having a difficult time?', 'support', 'general', 8, '{"support", "encouragement", "help"}');

-- Alternative prompts (from PromptOfTheDay.tsx alternativePrompts)
INSERT INTO public.video_prompts (prompt_text, category, usage_context, priority, tags) VALUES
('What''s a lesson you learned the hard way?', 'wisdom', 'alternative', 8, '{"lesson", "hardship", "learning"}'),
('Share a moment that changed your perspective on life.', 'story', 'alternative', 9, '{"perspective", "change", "growth"}'),
('What would you tell your younger self?', 'wisdom', 'alternative', 9, '{"advice", "youth", "reflection"}'),
('Describe a time when you felt truly proud.', 'pride', 'alternative', 8, '{"pride", "accomplishment", "emotion"}'),
('What''s a family tradition you cherish?', 'family', 'alternative', 7, '{"tradition", "family", "cherish"}'),
('Tell about a friendship that shaped who you are.', 'relationships', 'alternative', 8, '{"friendship", "influence", "growth"}'),
('What brings you peace in difficult times?', 'peace', 'alternative', 8, '{"peace", "coping", "strength"}'),
('Share your favorite memory from childhood.', 'story', 'alternative', 7, '{"childhood", "memory", "favorite"}'),
('What skill are you most proud of developing?', 'achievement', 'alternative', 7, '{"skill", "development", "pride"}'),
('Describe a moment of unexpected kindness you experienced.', 'kindness', 'alternative', 8, '{"kindness", "unexpected", "gratitude"}');

-- Follow-up prompts (from NotificationsContext.tsx followUpPrompts)
INSERT INTO public.video_prompts (prompt_text, category, usage_context, priority, tags) VALUES
('Share a favorite story from your childhood that still makes you smile.', 'story', 'followup', 9, '{"childhood", "smile", "joy"}'),
('What is the best lesson you learned from your parents or grandparents?', 'wisdom', 'followup', 10, '{"lesson", "parents", "grandparents"}'),
('Tell the story of how you met your closest friend.', 'relationships', 'followup', 8, '{"friendship", "meeting", "story"}'),
('What advice would you give your younger self?', 'wisdom', 'followup', 9, '{"advice", "youth", "reflection"}'),
('Share a moment when you felt most proud.', 'pride', 'followup', 8, '{"pride", "accomplishment", "emotion"}'),
('What''s a family tradition you hope will continue?', 'family', 'followup', 8, '{"tradition", "family", "continuity"}'),
('Describe a challenge that made you stronger.', 'strength', 'followup', 9, '{"challenge", "strength", "growth"}'),
('What does happiness look like to you?', 'happiness', 'followup', 8, '{"happiness", "definition", "meaning"}');

-- Daily prompts (sample from generate-daily-prompts function)
INSERT INTO public.video_prompts (prompt_text, category, usage_context, priority, tags, is_featured) VALUES
('Share a favorite story from your childhood that still makes you smile.', 'story', 'daily', 10, '{"childhood", "smile", "daily"}', true),
('Describe a family tradition you hope will be passed down forever.', 'family', 'daily', 10, '{"tradition", "family", "legacy"}', true),
('What is the best lesson you learned from your parents or grandparents?', 'wisdom', 'daily', 10, '{"lesson", "parents", "grandparents"}', true),
('What advice would you give your younger self if you could?', 'wisdom', 'daily', 10, '{"advice", "youth", "reflection"}', true),
('Tell the story of how you met your closest friend.', 'relationships', 'daily', 9, '{"friendship", "meeting", "story"}', true),
('What was the proudest moment of your life?', 'pride', 'daily', 9, '{"pride", "accomplishment", "moment"}', true),
('Share a funny or embarrassing moment from your school years.', 'humor', 'daily', 8, '{"humor", "school", "embarrassing"}', true),
('What challenge in life taught you the most?', 'wisdom', 'daily', 9, '{"challenge", "learning", "growth"}', true),
('Describe the day you became a parent.', 'family', 'daily', 9, '{"parenting", "birth", "family"}', false),
('What dream do you still hope to achieve or wish you had pursued?', 'dreams', 'daily', 8, '{"dreams", "aspirations", "goals"}', true),
('Tell us about a family holiday or vacation you''ll always remember.', 'memory', 'daily', 8, '{"holiday", "vacation", "family"}', true),
('What''s your favorite family recipe, and what memories are connected to it?', 'food', 'daily', 7, '{"recipe", "food", "memory"}', false),
('Share a story about your favorite pet or animal companion.', 'pets', 'daily', 7, '{"pets", "animals", "companionship"}', false),
('Describe the bravest thing you''ve ever done.', 'courage', 'daily', 8, '{"bravery", "courage", "action"}', true),
('What does happiness look like to you?', 'happiness', 'daily', 8, '{"happiness", "definition", "meaning"}', true),
('Tell about a time you felt scared and what helped you through it.', 'courage', 'daily', 8, '{"fear", "overcoming", "support"}', true),
('Who has had the biggest impact on your life, and why?', 'influence', 'daily', 9, '{"influence", "impact", "people"}', true),
('Share a lesson you learned from making a mistake.', 'wisdom', 'daily', 8, '{"mistake", "lesson", "learning"}', true),
('What''s the kindest thing someone ever did for you?', 'kindness', 'daily', 8, '{"kindness", "generosity", "gratitude"}', true),
('What is a habit or routine that made your life better?', 'habits', 'daily', 7, '{"habits", "routine", "improvement"}', false);

-- Enable real-time replication for instant updates
ALTER TABLE public.video_prompts REPLICA IDENTITY FULL; 