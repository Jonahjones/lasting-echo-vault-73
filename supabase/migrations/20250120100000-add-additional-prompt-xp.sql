-- Add additional prompt XP configuration for prompts beyond the daily prompt
INSERT INTO public.xp_config (action_type, xp_amount, daily_cap, description, is_active) VALUES
('additional_prompt', 5, 0, 'Recording additional prompts beyond the daily prompt', true)
ON CONFLICT (action_type) DO UPDATE SET
  xp_amount = EXCLUDED.xp_amount,
  daily_cap = EXCLUDED.daily_cap,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active; 