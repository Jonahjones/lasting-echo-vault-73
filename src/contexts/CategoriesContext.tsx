import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LucideIcon } from 'lucide-react';
import { 
  Lightbulb, 
  MessageCircle, 
  Heart, 
  Clock, 
  Globe,
  Circle,
  Star,
  Bookmark,
  Calendar,
  Music,
  Camera,
  Gift
} from 'lucide-react';

export interface VideoCategory {
  id: string;
  value: string;
  label: string;
  description: string | null;
  icon_name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithIcon extends VideoCategory {
  icon: LucideIcon;
}

interface CategoriesContextType {
  categories: CategoryWithIcon[];
  loading: boolean;
  isConnected: boolean;
  refreshCategories: () => Promise<void>;
  createCategory: (category: Omit<VideoCategory, 'id' | 'video_count' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<VideoCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;
  getDefaultCategory: () => CategoryWithIcon | null;
  getCategoryByValue: (value: string) => CategoryWithIcon | null;
}

// Icon mapping for category icons
const ICON_MAP: Record<string, LucideIcon> = {
  Lightbulb,
  MessageCircle,
  Heart,
  Clock,
  Globe,
  Circle,
  Star,
  Bookmark,
  Calendar,
  Music,
  Camera,
  Gift,
};

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryWithIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Convert database categories to categories with icons
  const addIconsToCategories = (dbCategories: VideoCategory[]): CategoryWithIcon[] => {
    return dbCategories.map(category => ({
      ...category,
      icon: ICON_MAP[category.icon_name] || Circle
    }));
  };

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      console.log('🏷️ Loading video categories...');
      
      const { data, error } = await supabase
        .from('video_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const categoriesWithIcons = addIconsToCategories((data as unknown as VideoCategory[]) || []);
      setCategories(categoriesWithIcons);
      console.log(`✅ Loaded ${categoriesWithIcons.length} categories`);
      
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      
      // Fallback to default categories if database fails
      const fallbackCategories: CategoryWithIcon[] = [
        {
          id: 'wisdom',
          value: 'wisdom',
          label: 'Wisdom',
          description: 'Share life lessons, insights, and valuable knowledge',
          icon_name: 'Lightbulb',
          icon: Lightbulb,
          emoji: '💡',
          color: '#F59E0B',
          sort_order: 1,
          is_active: true,
          is_default: true,
          video_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'story',
          value: 'story',
          label: 'Stories',
          description: 'Tell personal stories, memories, and experiences',
          icon_name: 'MessageCircle',
          icon: MessageCircle,
          emoji: '📖',
          color: '#8B5CF6',
          sort_order: 2,
          is_active: true,
          is_default: false,
          video_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'love',
          value: 'love',
          label: 'Love',
          description: 'Express love, affection, and heartfelt messages',
          icon_name: 'Heart',
          icon: Heart,
          emoji: '❤️',
          color: '#EF4444',
          sort_order: 3,
          is_active: true,
          is_default: false,
          video_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'advice',
          value: 'advice',
          label: 'Advice',
          description: 'Provide guidance, tips, and recommendations',
          icon_name: 'Clock',
          icon: Clock,
          emoji: '⏰',
          color: '#10B981',
          sort_order: 4,
          is_active: true,
          is_default: false,
          video_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      
      setCategories(fallbackCategories);
      
      // Silent fallback - no toast notification needed
      // toast({
      //   title: "Category Loading Error",
      //   description: "Using default categories. Some features may be limited.",
      //   variant: "destructive"
      // });
    } finally {
      setLoading(false);
    }
  };

  // Create new category
  const createCategory = async (category: Omit<VideoCategory, 'id' | 'video_count' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch(`https://fradbhfppmwjcouodahf.supabase.co/functions/v1/manage-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(category)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }

      toast({
        title: "Category Created",
        description: `"${category.label}" has been created successfully.`,
      });

    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Create Failed",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update category
  const updateCategory = async (id: string, updates: Partial<VideoCategory>) => {
    try {
      const response = await fetch(`https://fradbhfppmwjcouodahf.supabase.co/functions/v1/manage-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }

      toast({
        title: "Category Updated",
        description: "Category has been updated successfully.",
      });

    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`https://fradbhfppmwjcouodahf.supabase.co/functions/v1/manage-categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      toast({
        title: "Category Deleted",
        description: "Category has been deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Reorder categories
  const reorderCategories = async (categoryIds: string[]) => {
    try {
      const response = await fetch(`https://fradbhfppmwjcouodahf.supabase.co/functions/v1/manage-categories/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ categoryIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder categories');
      }

    } catch (error) {
      console.error('Error reordering categories:', error);
      toast({
        title: "Reorder Failed",
        description: error instanceof Error ? error.message : "Failed to reorder categories",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Get default category
  const getDefaultCategory = (): CategoryWithIcon | null => {
    return categories.find(cat => cat.is_default) || categories[0] || null;
  };

  // Get category by value
  const getCategoryByValue = (value: string): CategoryWithIcon | null => {
    return categories.find(cat => cat.value === value) || null;
  };

  // Set up real-time subscription for instant category updates
  useEffect(() => {
    console.log('🔗 Setting up categories real-time subscription...');
    
    // Load initial categories
    fetchCategories();

    // Subscribe to category changes
    const categoriesChannel = supabase
      .channel('video-categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_categories'
        },
        (payload) => {
          console.log('🏷️ Real-time category change:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // Show toast notification for category changes
            toast({
              title: "Categories Updated",
              description: "Video categories have been updated by an administrator.",
              duration: 5000,
            });
            
            // Refresh categories to ensure consistency
            fetchCategories();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Categories subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('✅ Categories real-time updates active');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log('❌ Categories real-time connection closed');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.log('❌ Categories real-time connection error');
        }
      });

    // Cleanup subscription
    return () => {
      console.log('🧹 Cleaning up categories subscription');
      supabase.removeChannel(categoriesChannel);
    };
  }, [toast]);

  const value: CategoriesContextType = {
    categories,
    loading,
    isConnected,
    refreshCategories: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getDefaultCategory,
    getCategoryByValue
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}

// Helper hooks for common category operations
export function useCategoryOptions() {
  const { categories } = useCategories();
  return categories.map(cat => ({
    value: cat.value,
    label: cat.label,
    icon: cat.icon,
    emoji: cat.emoji
  }));
}

export function useActiveCategories() {
  const { categories } = useCategories();
  return categories.filter(cat => cat.is_active);
} 