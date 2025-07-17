-- Add daily prompt bonus XP configuration
INSERT INTO public.xp_config (action_type, xp_amount, daily_cap, description, is_active) VALUES
('daily_prompt', 15, 1, 'Daily prompt completion bonus XP', true)
ON CONFLICT (action_type) DO UPDATE SET
  xp_amount = EXCLUDED.xp_amount,
  daily_cap = EXCLUDED.daily_cap,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Add admin policies to allow updates to xp_config
CREATE POLICY "Admins can manage XP config" ON public.xp_config
FOR ALL USING (public.is_user_admin()); 