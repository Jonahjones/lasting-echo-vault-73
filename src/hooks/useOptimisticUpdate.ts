import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OptimisticState<T> {
  data: T;
  pending: boolean;
  error: string | null;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  updateFunction: (data: T) => Promise<T>
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pending: false,
    error: null
  });
  const { toast } = useToast();

  const update = useCallback(async (optimisticUpdate: Partial<T>) => {
    // Apply optimistic update immediately
    const previousData = state.data;
    const optimisticData = { ...state.data, ...optimisticUpdate };
    
    setState({
      data: optimisticData,
      pending: true,
      error: null
    });

    try {
      // Perform actual update
      const updatedData = await updateFunction(optimisticData);
      
      setState({
        data: updatedData,
        pending: false,
        error: null
      });
      
      return updatedData;
    } catch (error) {
      // Rollback on error
      setState({
        data: previousData,
        pending: false,
        error: error instanceof Error ? error.message : 'Update failed'
      });

      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });

      throw error;
    }
  }, [state.data, updateFunction, toast]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      pending: false,
      error: null
    });
  }, [initialData]);

  return {
    data: state.data,
    pending: state.pending,
    error: state.error,
    update,
    reset
  };
}