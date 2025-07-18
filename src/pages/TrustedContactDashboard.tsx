import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Crown, Star, Shield, User, Mail, Phone, Clock, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrustedRelationship {
  id: string;
  user_id: string;
  role: 'executor' | 'legacy_messenger' | 'guardian';
  is_primary: boolean;
  invitation_status: string;
  confirmed_at: string | null;
  created_at: string;
  user_profile: {
    first_name: string;
    last_name: string;
    display_name: string;
    email: string;
    user_status?: string;
  };
}

export default function TrustedContactDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [relationships, setRelationships] = useState<TrustedRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTrustedRelationships();
    }
  }, [user]);

  const loadTrustedRelationships = async () => {
    try {
      console.log('🔍 Loading relationships where current user is trusted contact...');
      
      if (!user?.email) {
        console.warn('No user email available');
        setLoading(false);
        return;
      }

      // Use consolidated structure to find where current user is the trusted contact
      const { data: relationshipData, error } = await (supabase as any)
        .from('user_contacts')
        .select(`
          id,
          user_id,
          role,
          is_primary,
          status,
          confirmed_at,
          created_at,
          contacts!inner (
            email,
            full_name,
            linked_user_id
          ),
          profiles:user_id (
            first_name,
            last_name,
            display_name,
            user_status
          )
        `)
        .eq('relationship_type', 'trusted')
        .eq('contacts.email', user.email.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Query failed:', error);
        throw error;
      }

      console.log('✅ Found relationships in consolidated structure:', relationshipData);
      
      if (!relationshipData || relationshipData.length === 0) {
        console.log('📭 No trusted contact relationships found');
        setRelationships([]);
        setLoading(false);
        return;
      }
      
      const transformedRelationships = relationshipData.map((rel: any) => ({
        id: rel.id,
        user_id: rel.user_id,
        role: rel.role,
        is_primary: rel.is_primary,
        invitation_status: rel.status,
        confirmed_at: rel.confirmed_at,
        created_at: rel.created_at,
        user_profile: {
          first_name: rel.profiles?.first_name || 'Unknown',
          last_name: rel.profiles?.last_name || 'User',
          display_name: rel.profiles?.display_name || 'Unknown User',
          email: user.email, // Current user's email since they're the trusted contact
          user_status: rel.profiles?.user_status || 'active'
        }
      }));

      setRelationships(transformedRelationships);
      
    } catch (error) {
      console.error('Error loading trusted relationships:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load your trusted contact relationships. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'executor': return Crown;
      case 'legacy_messenger': return Star;
      case 'guardian': return Shield;
      default: return User;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'executor': return 'Executor';
      case 'legacy_messenger': return 'Legacy Messenger';
      case 'guardian': return 'Guardian';
      default: return 'Trusted Contact';
    }
  };

  const getStatusBadge = (relationship: TrustedRelationship) => {
    const status = relationship.user_profile.user_status;
    
    if (status === 'deceased') {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Deceased</Badge>;
    }
    
    if (relationship.invitation_status === 'registered' && relationship.confirmed_at) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
    }
    
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Trusted Contact Dashboard</h1>
        <p className="text-muted-foreground">
          People who have designated you as their trusted contact
        </p>
      </div>

      {relationships.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Trusted Relationships</h3>
            <p className="text-muted-foreground">
              You haven't been designated as a trusted contact for anyone yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {relationships.map((relationship) => {
            const RoleIcon = getRoleIcon(relationship.role);
            
            return (
              <Card key={relationship.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <RoleIcon className="w-5 h-5" />
                        {relationship.user_profile.display_name}
                      </CardTitle>
                      <CardDescription>
                        You are their {getRoleLabel(relationship.role)}
                        {relationship.is_primary && (
                          <Badge variant="outline" className="ml-2">Primary</Badge>
                        )}
                      </CardDescription>
                    </div>
                    {getStatusBadge(relationship)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{relationship.user_profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Added {new Date(relationship.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {relationship.user_profile.user_status === 'deceased' && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">This user has been marked as deceased</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Their videos have been released according to their wishes.
                      </p>
                    </div>
                  )}

                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      <strong>Your Role:</strong> {getRoleLabel(relationship.role)}
                      {relationship.is_primary && " (Primary Contact)"}
                    </div>
                    
                    <div className="flex gap-2">
                      {relationship.user_profile.user_status !== 'deceased' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // TODO: Navigate to mark deceased flow
                            toast({
                              title: "Feature Coming Soon",
                              description: "Deceased marking flow will be available soon.",
                            });
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Manage Relationship
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Executor:</strong> Manage video releases and final account closure when the time comes.</p>
            <p><strong>Legacy Messenger:</strong> Deliver specific videos to designated recipients as requested.</p>
            <p><strong>Guardian:</strong> Monitor account activity and assist with security or access issues.</p>
          </div>
          
          <Separator />
          
          <p className="text-xs text-muted-foreground">
            Being someone's trusted contact is a significant responsibility. Please honor their trust and follow their wishes carefully.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 