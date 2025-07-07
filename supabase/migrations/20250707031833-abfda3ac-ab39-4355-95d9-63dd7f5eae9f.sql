-- Allow users to view other users' basic gamification data for public display
CREATE POLICY "Users can view other users' basic gamification data"
ON public.user_gamification
FOR SELECT
USING (true);

-- Update existing policy to be more specific
DROP POLICY IF EXISTS "Users can view their own gamification data" ON public.user_gamification;