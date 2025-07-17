import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VideoPrompt {
  id: string;
  prompt_text: string;
  category: string;
  tags: string[];
  usage_context: 'general' | 'daily' | 'alternative' | 'followup' | 'first_video';
  is_active: boolean;
  is_featured: boolean;
  priority: number;
  min_user_level: number;
  created_by?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromptsContextType {
  prompts: VideoPrompt[];
  loading: boolean;
  error: string | null;
  
  // Fetch prompts by context
  getPromptsByContext: (context: string, limit?: number) => VideoPrompt[];
  getPromptsByCategory: (category: string, limit?: number) => VideoPrompt[];
  getFeaturedPrompts: (limit?: number) => VideoPrompt[];
  getRandomPrompt: (context?: string, excludeIds?: string[]) => VideoPrompt | null;
  
  // Admin functions
  createPrompt: (promptData: Partial<VideoPrompt>) => Promise<void>;
  updatePrompt: (id: string, updates: Partial<VideoPrompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  togglePromptStatus: (id: string, isActive: boolean) => Promise<void>;
  bulkUpdatePrompts: (promptIds: string[], updates: Partial<VideoPrompt>) => Promise<void>;
  
  // Utility functions
  refreshPrompts: () => Promise<void>;
  incrementUsageCount: (id: string) => Promise<void>;
}

const PromptsContext = createContext<PromptsContextType | undefined>(undefined);

export function usePrompts() {
  const context = useContext(PromptsContext);
  if (context === undefined) {
    throw new Error('usePrompts must be used within a PromptsProvider');
  }
  return context;
}

// Helper hooks for specific use cases
export function useGeneralPrompts(limit = 10) {
  const { getPromptsByContext } = usePrompts();
  return getPromptsByContext('general', limit);
}

export function useAlternativePrompts(limit = 10) {
  const { getPromptsByContext } = usePrompts();
  return getPromptsByContext('alternative', limit);
}

export function useFollowUpPrompts(limit = 8) {
  const { getPromptsByContext } = usePrompts();
  return getPromptsByContext('followup', limit);
}

export function useDailyPrompts(limit = 20) {
  const { getPromptsByContext } = usePrompts();
  return getPromptsByContext('daily', limit);
}

export function useRandomPrompt(context?: string, excludeIds?: string[]) {
  const { getRandomPrompt } = usePrompts();
  return getRandomPrompt(context, excludeIds);
}

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<VideoPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch prompts from database
  const fetchPrompts = async () => {
    try {
      console.log('🎯 Loading video prompts...');
      
      const { data, error } = await supabase
        .from('video_prompts' as any)
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts((data as unknown as VideoPrompt[]) || []);
      console.log(`✅ Loaded ${data?.length || 0} active prompts`);
      setError(null);
      
    } catch (error) {
      console.error('❌ Error loading prompts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load prompts');
      
      // Fallback to default prompts if database fails
      const fallbackPrompts: VideoPrompt[] = [
        {
          id: 'fallback-1',
          prompt_text: 'What are you most proud of in your life?',
          category: 'wisdom',
          tags: ['pride', 'accomplishment'],
          usage_context: 'general',
          is_active: true,
          is_featured: false,
          priority: 10,
          min_user_level: 1,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'fallback-2',
          prompt_text: 'What advice would you give to your younger self?',
          category: 'wisdom',
          tags: ['advice', 'reflection'],
          usage_context: 'general',
          is_active: true,
          is_featured: false,
          priority: 10,
          min_user_level: 1,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'fallback-3',
          prompt_text: 'Share a moment that changed your perspective on life.',
          category: 'story',
          tags: ['perspective', 'change'],
          usage_context: 'alternative',
          is_active: true,
          is_featured: false,
          priority: 9,
          min_user_level: 1,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      
      setPrompts(fallbackPrompts);
      
      toast({
        title: "Prompt Loading Error",
        description: "Using default prompts. Some features may be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    let mounted = true;

    const setupRealtimeSubscription = () => {
      const channel = supabase.channel('video_prompts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'video_prompts'
          },
          async (payload) => {
            if (!mounted) return;
            
            console.log('🔄 Real-time prompt update:', payload.eventType);
            
            if (payload.eventType === 'DELETE') {
              setPrompts(prev => prev.filter(p => p.id !== payload.old?.id));
            } else if (payload.eventType === 'INSERT') {
              const newPrompt = payload.new as VideoPrompt;
              if (newPrompt.is_active) {
                setPrompts(prev => {
                  const updated = [newPrompt, ...prev];
                  return updated.sort((a, b) => b.priority - a.priority);
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedPrompt = payload.new as VideoPrompt;
              setPrompts(prev => prev.map(p => 
                p.id === updatedPrompt.id 
                  ? updatedPrompt 
                  : p
              ).filter(p => p.is_active));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    // Initial fetch
    fetchPrompts().then(() => {
      if (mounted) {
        setupRealtimeSubscription();
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Helper functions
  const getPromptsByContext = (context: string, limit = 50): VideoPrompt[] => {
    return prompts
      .filter(p => p.usage_context === context && p.is_active)
      .slice(0, limit);
  };

  const getPromptsByCategory = (category: string, limit = 50): VideoPrompt[] => {
    return prompts
      .filter(p => p.category === category && p.is_active)
      .slice(0, limit);
  };

  const getFeaturedPrompts = (limit = 10): VideoPrompt[] => {
    return prompts
      .filter(p => p.is_featured && p.is_active)
      .slice(0, limit);
  };

  const getRandomPrompt = (context?: string, excludeIds: string[] = []): VideoPrompt | null => {
    let availablePrompts = prompts.filter(p => 
      p.is_active && 
      !excludeIds.includes(p.id) &&
      (!context || p.usage_context === context)
    );

    if (availablePrompts.length === 0) return null;

    // Weight by priority
    const weightedPrompts = availablePrompts.flatMap(prompt => 
      Array(Math.max(1, prompt.priority)).fill(prompt)
    );

    const randomIndex = Math.floor(Math.random() * weightedPrompts.length);
    return weightedPrompts[randomIndex];
  };

  // Admin functions (call API endpoints)
  const callPromptsAPI = async (endpoint: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`/functions/v1/manage-prompts${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  };

  const createPrompt = async (promptData: Partial<VideoPrompt>) => {
    try {
      await callPromptsAPI('', {
        method: 'POST',
        body: JSON.stringify(promptData),
      });

      toast({
        title: "Prompt Created",
        description: "New prompt has been added successfully.",
      });
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create prompt",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePrompt = async (id: string, updates: Partial<VideoPrompt>) => {
    try {
      await callPromptsAPI(`?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      toast({
        title: "Prompt Updated",
        description: "Prompt has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update prompt",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      await callPromptsAPI(`?id=${id}`, {
        method: 'DELETE',
      });

      toast({
        title: "Prompt Deleted",
        description: "Prompt has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete prompt",
        variant: "destructive"
      });
      throw error;
    }
  };

  const togglePromptStatus = async (id: string, isActive: boolean) => {
    try {
      await updatePrompt(id, { is_active: isActive });
    } catch (error) {
      throw error;
    }
  };

  const bulkUpdatePrompts = async (promptIds: string[], updates: Partial<VideoPrompt>) => {
    try {
      await callPromptsAPI('', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'bulk_update',
          prompt_ids: promptIds,
          update_data: updates,
        }),
      });

      toast({
        title: "Bulk Update Complete",
        description: `Updated ${promptIds.length} prompts successfully.`,
      });
    } catch (error) {
      console.error('Error bulk updating prompts:', error);
      toast({
        title: "Bulk Update Failed",
        description: error instanceof Error ? error.message : "Failed to update prompts",
        variant: "destructive"
      });
      throw error;
    }
  };

  const refreshPrompts = async () => {
    setLoading(true);
    await fetchPrompts();
  };

  const incrementUsageCount = async (id: string) => {
    try {
      // Optimistic update
      setPrompts(prev => prev.map(p => 
        p.id === id ? { ...p, usage_count: p.usage_count + 1 } : p
      ));

      // Update in database
      const prompt = prompts.find(p => p.id === id);
      if (prompt) {
        await updatePrompt(id, { usage_count: prompt.usage_count + 1 });
      }
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      // Revert optimistic update on error
      await refreshPrompts();
    }
  };

  const contextValue: PromptsContextType = {
    prompts,
    loading,
    error,
    getPromptsByContext,
    getPromptsByCategory,
    getFeaturedPrompts,
    getRandomPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    togglePromptStatus,
    bulkUpdatePrompts,
    refreshPrompts,
    incrementUsageCount,
  };

  return (
    <PromptsContext.Provider value={contextValue}>
      {children}
    </PromptsContext.Provider>
  );
} 