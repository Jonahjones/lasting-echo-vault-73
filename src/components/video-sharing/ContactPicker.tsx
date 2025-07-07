import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Mail, Phone, Search, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  contact_type: 'trusted' | 'regular';
  invitation_status?: string;
}

interface ContactPickerProps {
  selectedContacts: string[];
  onContactsChange: (contacts: string[]) => void;
  onShare?: () => void;
  disabled?: boolean;
}

export function ContactPicker({ 
  selectedContacts, 
  onContactsChange, 
  onShare,
  disabled = false 
}: ContactPickerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('contact_type', { ascending: false }) // trusted first
        .order('full_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addContactByEmail = async () => {
    if (!newContactEmail.trim() || !user) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContactEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    // Check if contact already exists
    const existingContact = contacts.find(c => c.email === newContactEmail);
    if (existingContact) {
      toast({
        title: 'Contact Exists',
        description: 'This contact is already in your list',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          full_name: newContactEmail.split('@')[0], // Use email prefix as name temporarily
          email: newContactEmail,
          contact_type: 'regular',
          invitation_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Contact Added',
        description: 'Contact added successfully. They will receive an invitation to join.',
      });

      setNewContactEmail('');
      setShowAddContact(false);
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contact',
        variant: 'destructive'
      });
    }
  };

  const toggleContact = (contactEmail: string) => {
    if (disabled) return;
    
    if (selectedContacts.includes(contactEmail)) {
      onContactsChange(selectedContacts.filter(email => email !== contactEmail));
    } else {
      onContactsChange([...selectedContacts, contactEmail]);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.relationship?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactStatus = (contact: Contact) => {
    if (contact.invitation_status === 'pending') {
      return { label: 'Pending', variant: 'secondary' as const };
    }
    if (contact.contact_type === 'trusted') {
      return { label: 'Trusted', variant: 'default' as const };
    }
    return { label: 'Active', variant: 'outline' as const };
  };

  return (
    <Card className="shadow-gentle">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Share With Contacts</span>
          </CardTitle>
          
          <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact by Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="friend@example.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddContact(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={addContactByEmail}>
                    Add Contact
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedContacts.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
            </p>
            {onShare && (
              <Button 
                size="sm" 
                onClick={onShare}
                disabled={disabled}
                className="bg-gradient-primary"
              >
                Share Video
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contact List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 bg-primary/20 rounded-full animate-pulse mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-6">
              <UserCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No contacts match your search' : 'No contacts yet'}
              </p>
              {!searchTerm && (
                <p className="text-xs text-muted-foreground mt-1">
                  Add contacts to share your memories
                </p>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const status = getContactStatus(contact);
              const isSelected = selectedContacts.includes(contact.email || '');
              
              return (
                <div
                  key={contact.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/5 border-primary/30' : ''
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => contact.email && toggleContact(contact.email)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled || !contact.email}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {contact.full_name}
                      </p>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      {contact.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {contact.relationship && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.relationship}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}