import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Mail, Plus, Check, X, Clock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  full_name: string;
  email: string;
  status: 'registered' | 'pending' | 'invited';
}

interface ContactSelectorProps {
  selectedContacts: string[];
  onSelectionChange: (contactIds: string[]) => void;
  onContactsDataChange?: (contacts: Array<{id: string, full_name: string, email: string}>) => void;
  isPublic: boolean;
}

export function ContactSelector({ selectedContacts, onSelectionChange, onContactsDataChange, isPublic }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .order('full_name');

      if (error) throw error;

      // Transform data and add status (for now all are 'registered')
      const transformedContacts = data.map(contact => ({
        id: contact.id,
        full_name: contact.full_name,
        email: contact.email || '',
        status: 'registered' as const
      }));
      
      setContacts(transformedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactToggle = (contactId: string) => {
    const newSelection = selectedContacts.includes(contactId)
      ? selectedContacts.filter(id => id !== contactId)
      : [...selectedContacts, contactId];
    
    onSelectionChange(newSelection);
    
    // Pass back the full contact data for selected contacts
    if (onContactsDataChange) {
      const selectedContactsData = contacts
        .filter(contact => newSelection.includes(contact.id))
        .map(contact => ({
          id: contact.id,
          full_name: contact.full_name,
          email: contact.email
        }));
      onContactsDataChange(selectedContactsData);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInviteContact = async () => {
    const email = newContactEmail.trim().toLowerCase();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    if (contacts.some(contact => contact.email.toLowerCase() === email)) {
      toast({
        title: "Contact Exists",
        description: "This contact is already in your list.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      // Extract name from email (simple approach)
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user!.id,
          full_name: name,
          email: email,
          contact_type: 'regular'
        })
        .select()
        .single();

      if (error) throw error;

      const newContact: Contact = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        status: 'invited'
      };

      setContacts(prev => [...prev, newContact]);
      setNewContactEmail("");
      
      toast({
        title: "Contact Invited",
        description: `Invitation will be sent to ${email} when you share the video.`,
      });
    } catch (error) {
      console.error('Error inviting contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setContacts(prev => prev.filter(c => c.id !== contactId));
      onSelectionChange(selectedContacts.filter(id => id !== contactId));
      
      toast({
        title: "Contact Removed",
        description: "Contact has been removed from your list.",
      });
    } catch (error) {
      console.error('Error removing contact:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isPublic) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-primary" />
            <span>Public Video</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-sm text-muted-foreground">
              This video will be visible to everyone in the public feed.
              No need to select specific contacts.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary" />
          <span>Share With (Optional)</span>
        </CardTitle>
        <CardDescription>
          Choose trusted contacts to receive this private message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Contacts */}
        <div className="space-y-3">
          <Label>Your Contacts</Label>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-sm text-muted-foreground">Loading your contacts...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-sm text-muted-foreground">No contacts yet.</div>
              <div className="text-xs text-muted-foreground">Add a contact below to share your message.</div>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200",
                  selectedContacts.includes(contact.id)
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border hover:bg-muted"
                )}
                onClick={() => handleContactToggle(contact.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-foreground">{contact.full_name}</p>
                      {contact.status === 'invited' && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Invited
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {selectedContacts.includes(contact.id) && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveContact(contact.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Add New Contact */}
        <div className="space-y-3">
          <Label>Invite New Contact</Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter email address"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleInviteContact()}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleInviteContact}
              disabled={!newContactEmail.trim() || isInviting}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            They'll receive an invitation when you share the video
          </p>
        </div>

        {/* Selected Contacts Summary */}
        {selectedContacts.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Recipients ({selectedContacts.length})</Label>
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map((contactId) => {
                const contact = contacts.find(c => c.id === contactId);
                return contact ? (
                  <Badge key={contactId} variant="secondary" className="flex items-center space-x-1">
                    <span>{contact.full_name}</span>
                    <button
                      onClick={() => handleContactToggle(contactId)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
