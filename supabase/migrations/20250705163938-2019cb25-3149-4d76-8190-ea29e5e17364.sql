-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shared_video', 'daily_prompt', 'draft_reminder', 'delivery_confirmation')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create daily prompts table
CREATE TABLE public.daily_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for daily prompts
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

-- Create policy for daily prompts (readable by all authenticated users)
CREATE POLICY "Authenticated users can view daily prompts" 
ON public.daily_prompts 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert some sample daily prompts
INSERT INTO public.daily_prompts (prompt_text, date) VALUES
('Share a lesson you learned recently', CURRENT_DATE),
('What made you smile today?', CURRENT_DATE + INTERVAL '1 day'),
('Who is someone you''re grateful for?', CURRENT_DATE + INTERVAL '2 days'),
('Describe a favorite memory from this year', CURRENT_DATE + INTERVAL '3 days'),
('What advice would you give your younger self?', CURRENT_DATE + INTERVAL '4 days'),
('Share something that brings you peace', CURRENT_DATE + INTERVAL '5 days'),
('What''s a tradition that''s important to you?', CURRENT_DATE + INTERVAL '6 days');