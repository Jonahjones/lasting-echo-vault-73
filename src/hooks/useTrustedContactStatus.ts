import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface TrustedContactRelationship {
  mainUserId: string;
  mainUserName: string;
  mainUserEmail: string;
  role: 'executor' | 'legacy_messenger' | 'guardian';
  isPrimary: boolean;
  relationship: string;
  status: 'active';
  addedDate: string;
}

export function useTrustedContactStatus() {
  const { user, profile } = useAuth();
  const [isTrustedContact, setIsTrustedContact] = useState(false);
  const [trustedRelationships, setTrustedRelationships] = useState<TrustedContactRelationship[]>([]);
  const [activeRelationships, setActiveRelationships] = useState<TrustedContactRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check trusted contact status using the new function
  const checkTrustedContactStatus = async () => {
    if (!user?.email || !profile?.user_id) {
      console.log('👤 No user email or profile ID available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Checking trusted contact status for:', user.email);

      // Use the new get_trusted_contact_relationships function
      const { data: relationships, error: relationshipError } = await (supabase as any).rpc(
        'get_trusted_contact_relationships',
        { p_user_email: user.email.toLowerCase() }
      );

      if (relationshipError) {
        console.error('❌ Error calling get_trusted_contact_relationships:', relationshipError);
        throw relationshipError;
      }

      console.log('📊 Raw relationships data from function:', relationships);

      // Ensure relationships is an array before mapping
      const relationshipsArray = Array.isArray(relationships) ? relationships : [];

      // Transform the data to match the expected interface
      const transformedRelationships: TrustedContactRelationship[] = relationshipsArray.map((rel: any) => ({
        mainUserId: rel.main_user_id,
        mainUserName: rel.main_user_name || 'Unknown User',
        mainUserEmail: rel.main_user_email || user.email,
        role: rel.role || 'legacy_messenger',
        isPrimary: rel.is_primary || false,
        relationship: rel.relationship || '',
        status: 'active' as const,
        addedDate: rel.created_at
      }));

      console.log('✅ Transformed relationships:', transformedRelationships);

      setTrustedRelationships(transformedRelationships);
      setActiveRelationships(transformedRelationships); // All relationships are active in simplified system
      setIsTrustedContact(transformedRelationships.length > 0);

    } catch (error) {
      console.error('❌ Error in checkTrustedContactStatus:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to check trusted contact status';
      if (error instanceof Error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          errorMessage = 'Database function not found. Please contact support.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please try logging in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setTrustedRelationships([]);
      setActiveRelationships([]);
      setIsTrustedContact(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh status (simplified)
  const refreshStatus = async () => {
    await checkTrustedContactStatus();
  };

  // Initialize status check
  useEffect(() => {
    checkTrustedContactStatus();
  }, [user?.email, profile?.user_id]);

  return {
    isTrustedContact,
    trustedRelationships,
    activeRelationships,
    isLoading,
    error,
    refreshStatus
  };
} 