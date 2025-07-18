import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, RefreshCw, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContactRecord {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  contact_type: string;
  invitation_status?: string;
  role?: string;
  is_primary?: boolean;
  created_at: string;
  confirmed_at?: string;
}

export function InvitationChecker() {
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchContacts = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to search for contacts.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', searchEmail.toLowerCase().trim())
        .order('created_at', { ascending: false });

      if (contactError) {
        throw contactError;
      }

      setContacts(contactData || []);
      
      toast({
        title: "Search Complete",
        description: `Found ${contactData?.length || 0} contact records for ${searchEmail}`,
      });

    } catch (error) {
      console.error('Error searching contacts:', error);
      setError(error.message);
      toast({
        title: "Search Failed",
        description: `Failed to search contacts: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateContactStatus = async (contactId: string, newStatus: string) => {
    setLoading(true);

    try {
      const updateData: any = {
        invitation_status: newStatus
      };

      if (newStatus === 'accepted') {
        updateData.confirmed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);

      if (error) throw error;

      // Refresh the search
      await searchContacts();
      
      toast({
        title: "Status Updated",
        description: `Contact status updated to: ${newStatus}`,
      });

    } catch (error) {
      console.error('Error updating contact status:', error);
      toast({
        title: "Update Failed",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'pending_confirmation':
      case 'pending':
        return 'secondary';
      case 'accepted':
      case 'registered':
        return 'default';
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Invitation Status Checker</span>
        </CardTitle>
        <CardDescription>
          Search for contact records by email and manage invitation status manually for debugging
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="search-email">Email Address</Label>
              <Input
                id="search-email"
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter email address to search..."
                onKeyPress={(e) => e.key === 'Enter' && searchContacts()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchContacts}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Search className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Search</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Results Section */}
        {contacts.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Records Found: {contacts.length}</h3>
            
            <div className="grid gap-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{contact.full_name}</h4>
                        <Badge variant={getStatusBadgeVariant(contact.invitation_status)}>
                          {contact.invitation_status || 'no status'}
                        </Badge>
                        {contact.contact_type === 'trusted' && (
                          <Badge variant="outline">{contact.role}</Badge>
                        )}
                        {contact.is_primary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Email:</strong> {contact.email}</p>
                        <p><strong>Type:</strong> {contact.contact_type}</p>
                        <p><strong>Created:</strong> {new Date(contact.created_at).toLocaleString()}</p>
                        {contact.confirmed_at && (
                          <p><strong>Confirmed:</strong> {new Date(contact.confirmed_at).toLocaleString()}</p>
                        )}
                        <p><strong>ID:</strong> <code className="bg-muted px-1 py-0.5 rounded text-xs">{contact.id}</code></p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {contact.invitation_status === 'pending_confirmation' || contact.invitation_status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateContactStatus(contact.id, 'accepted')}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateContactStatus(contact.id, 'declined')}
                            disabled={loading}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </>
                      ) : contact.invitation_status === 'declined' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateContactStatus(contact.id, 'pending_confirmation')}
                          disabled={loading}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reset to Pending
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateContactStatus(contact.id, 'pending_confirmation')}
                          disabled={loading}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reset to Pending
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : searchEmail && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No contact records found for "{searchEmail}"</p>
            <p className="text-sm mt-1">Try searching for a different email address</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 