import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PricingPlan {
  id: string;
  plan_id: string;
  name: string;
  price: number;
  is_one_time: boolean;
  storage_gb: number | null;
  max_videos: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
  icon_name: string;
  description?: string;
  promotional_price?: number;
  promo_valid_until?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemLimits {
  id: string;
  tier: 'free' | 'premium';
  max_videos: number;
  max_storage_gb: number;
  created_at: string;
  updated_at: string;
}

interface PricingContextValue {
  plans: PricingPlan[];
  systemLimits: SystemLimits[];
  loading: boolean;
  error: string | null;
  refreshPricing: () => Promise<void>;
  getFreeUserLimits: () => SystemLimits | null;
  getPremiumUserLimits: () => SystemLimits | null;
  getPlanByKey: (planKey: string) => PricingPlan | null;
  getActivePlans: () => PricingPlan[];
}

const PricingContext = createContext<PricingContextValue | undefined>(undefined);

export function PricingProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [systemLimits, setSystemLimits] = useState<SystemLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPricing = async () => {
    try {
      setError(null);
      
      // Fetch pricing plans (using type assertion for new tables)
      const { data: plansData, error: plansError } = await (supabase as any)
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (plansError) throw plansError;

      // Fetch system limits (using type assertion for new tables)
      const { data: limitsData, error: limitsError } = await (supabase as any)
        .from('system_limits')
        .select('*');

      if (limitsError) throw limitsError;

      setPlans((plansData as PricingPlan[]) || []);
      setSystemLimits((limitsData as SystemLimits[]) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pricing';
      setError(errorMessage);
      console.error('Pricing fetch error:', err);
      
      // Fallback to hardcoded values if database fetch fails
      setPlans([
        {
          id: 'fallback-basic',
          plan_id: 'basic',
          name: 'Legacy Starter',
          price: 49,
          is_one_time: true,
          storage_gb: 5,
          max_videos: 10,
          features: [
            'Up to 10 video messages',
            '5 GB secure storage',
            'Basic delivery scheduling',
            '2 trusted contacts',
            'Email notifications'
          ],
          is_popular: false,
          is_active: true,
          display_order: 1,
          icon_name: 'Archive',
          description: 'Perfect for getting started with your legacy collection',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'fallback-premium',
          plan_id: 'premium',
          name: 'Family Legacy',
          price: 149,
          is_one_time: true,
          storage_gb: 25,
          max_videos: 50,
          features: [
            'Up to 50 video messages',
            '25 GB secure storage',
            'Advanced scheduling options',
            'Unlimited trusted contacts',
            'Priority support',
            'Legacy website generation'
          ],
          is_popular: true,
          is_active: true,
          display_order: 2,
          icon_name: 'Crown',
          description: 'Ideal for families wanting comprehensive legacy preservation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'fallback-unlimited',
          plan_id: 'unlimited',
          name: 'Eternal Legacy',
          price: 299,
          is_one_time: true,
          storage_gb: null,
          max_videos: 999,
          features: [
            'Unlimited video messages',
            'Unlimited secure storage',
            'AI-assisted storytelling',
            'Custom legacy themes',
            'Family collaboration',
            'Generational access',
            'White-glove support'
          ],
          is_popular: false,
          is_active: true,
          display_order: 3,
          icon_name: 'Star',
          description: 'Complete legacy solution for multi-generational families',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
      
      setSystemLimits([
        {
          id: 'fallback-free',
          tier: 'free',
          max_videos: 3,
          max_storage_gb: 2.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'fallback-premium',
          tier: 'premium',
          max_videos: 100,
          max_storage_gb: 50.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const refreshPricing = async () => {
    setLoading(true);
    await fetchPricing();
  };

  // Helper functions
  const getFreeUserLimits = () => {
    return systemLimits.find(limit => limit.tier === 'free') || null;
  };

  const getPremiumUserLimits = () => {
    return systemLimits.find(limit => limit.tier === 'premium') || null;
  };

  const getPlanByKey = (planKey: string) => {
    return plans.find(plan => plan.plan_id === planKey) || null;
  };

  const getActivePlans = () => {
    return plans.filter(plan => plan.is_active).sort((a, b) => a.display_order - b.display_order);
  };

  // Initial load
  useEffect(() => {
    fetchPricing();
  }, []);

  // Real-time subscriptions for instant updates
  useEffect(() => {
    const plansSubscription = supabase
      .channel('pricing_plans_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pricing_plans' },
        (payload) => {
          console.log('Pricing plans updated:', payload);
          fetchPricing(); // Refetch all data to ensure consistency
          
          // Show toast notification for admin changes
          if (payload.eventType === 'UPDATE') {
            toast({
              title: 'Pricing Updated',
              description: 'Pricing plans have been updated by an administrator.',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    const limitsSubscription = supabase
      .channel('system_limits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_limits' },
        (payload) => {
          console.log('System limits updated:', payload);
          fetchPricing(); // Refetch all data to ensure consistency
          
          // Show toast notification for admin changes
          if (payload.eventType === 'UPDATE') {
            toast({
              title: 'System Limits Updated',
              description: 'Storage and video limits have been updated.',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      plansSubscription.unsubscribe();
      limitsSubscription.unsubscribe();
    };
  }, [toast]);

  const value: PricingContextValue = {
    plans,
    systemLimits,
    loading,
    error,
    refreshPricing,
    getFreeUserLimits,
    getPremiumUserLimits,
    getPlanByKey,
    getActivePlans,
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
} 