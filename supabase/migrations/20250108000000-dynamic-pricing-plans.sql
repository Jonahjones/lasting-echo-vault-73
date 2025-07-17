-- Create pricing plans table for dynamic pricing management
CREATE TABLE public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE, -- e.g., 'basic', 'premium', 'unlimited'
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_one_time BOOLEAN NOT NULL DEFAULT true,
  storage_gb INTEGER, -- NULL for unlimited
  max_videos INTEGER, -- Large number for unlimited
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature strings
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT NOT NULL DEFAULT 'Archive', -- Lucide icon name
  description TEXT,
  promotional_price DECIMAL(10,2), -- Optional promotional pricing
  promo_valid_until TIMESTAMP WITH TIME ZONE, -- When promo expires
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system limits table for free/premium tier limits
CREATE TABLE public.system_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'premium')),
  max_videos INTEGER NOT NULL,
  max_storage_gb DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_limits ENABLE ROW LEVEL SECURITY;

-- Public read access for pricing plans
CREATE POLICY "Pricing plans are publicly readable"
ON public.pricing_plans
FOR SELECT
USING (is_active = true);

-- Admin-only write access for pricing plans
CREATE POLICY "Admins can manage pricing plans"
ON public.pricing_plans
FOR ALL
USING (public.is_user_admin());

-- Public read access for system limits
CREATE POLICY "System limits are publicly readable"
ON public.system_limits
FOR SELECT
USING (true);

-- Admin-only write access for system limits
CREATE POLICY "Admins can manage system limits"
ON public.system_limits
FOR ALL
USING (public.is_user_admin());

-- Add updated_at triggers
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_limits_updated_at
  BEFORE UPDATE ON public.system_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pricing plans (matching current hardcoded values)
INSERT INTO public.pricing_plans (plan_id, name, price, is_one_time, storage_gb, max_videos, features, is_popular, display_order, icon_name, description) VALUES
('basic', 'Legacy Starter', 49.00, true, 5, 10, 
  '["Up to 10 video messages", "5 GB secure storage", "Basic delivery scheduling", "2 trusted contacts", "Email notifications"]'::jsonb, 
  false, 1, 'Archive', 'Perfect for getting started with your legacy collection'),
  
('premium', 'Family Legacy', 149.00, true, 25, 50, 
  '["Up to 50 video messages", "25 GB secure storage", "Advanced scheduling options", "Unlimited trusted contacts", "Priority support", "Legacy website generation"]'::jsonb, 
  true, 2, 'Crown', 'Ideal for families wanting comprehensive legacy preservation'),
  
('unlimited', 'Eternal Legacy', 299.00, true, NULL, 999, 
  '["Unlimited video messages", "Unlimited secure storage", "AI-assisted storytelling", "Custom legacy themes", "Family collaboration", "Generational access", "White-glove support"]'::jsonb, 
  false, 3, 'Star', 'Complete legacy solution for multi-generational families');

-- Insert default system limits (matching current hardcoded values in VideoLibraryContext)
INSERT INTO public.system_limits (tier, max_videos, max_storage_gb) VALUES
('free', 3, 2.0),
('premium', 100, 50.0);

-- Add real-time replication for instant updates
ALTER TABLE public.pricing_plans REPLICA IDENTITY FULL;
ALTER TABLE public.system_limits REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_limits;

-- Create indexes for performance
CREATE INDEX idx_pricing_plans_active ON public.pricing_plans(is_active, display_order);
CREATE INDEX idx_pricing_plans_plan_id ON public.pricing_plans(plan_id);
CREATE INDEX idx_system_limits_tier ON public.system_limits(tier);

-- Add comments for documentation
COMMENT ON TABLE public.pricing_plans IS 'Dynamic pricing plans manageable by admins';
COMMENT ON TABLE public.system_limits IS 'System-wide limits for free and premium tiers';
COMMENT ON COLUMN public.pricing_plans.storage_gb IS 'Storage limit in GB, NULL for unlimited';
COMMENT ON COLUMN public.pricing_plans.max_videos IS 'Maximum videos allowed, use large number for unlimited';
COMMENT ON COLUMN public.pricing_plans.features IS 'JSON array of feature descriptions';
COMMENT ON COLUMN public.pricing_plans.promotional_price IS 'Temporary promotional pricing';
COMMENT ON COLUMN public.pricing_plans.promo_valid_until IS 'When promotional pricing expires';
COMMENT ON COLUMN public.pricing_plans.icon_name IS 'Lucide icon component name'; 