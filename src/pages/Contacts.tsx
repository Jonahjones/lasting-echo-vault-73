import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, User, Mail, Phone, Edit, Trash2, Users, Shield, Info, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  is_primary: boolean;
}

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    relationship: "",
    is_primary: false
  });

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestDeviceContacts = async () => {
    try {
      // Check if the Contacts API is supported
      if ('contacts' in navigator && 'ContactsManager' in window) {
        // @ts-ignore - Contacts API is experimental
        const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
        
        // Process device contacts
        for (const contact of contacts) {
          const name = contact.name?.[0] || 'Unknown Contact';
          const email = contact.email?.[0] || '';
          const phone = contact.tel?.[0] || '';
          
          setContactForm(prev => ({
            ...prev,
            full_name: name,
            email: email,
            phone: phone
          }));
          setIsAddModalOpen(true);
          break; // For demo, just use the first contact
        }
      } else {
        toast({
          title: "Not Supported",
          description: "Device contacts access is not supported on this device. Please add contacts manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accessing device contacts:', error);
      toast({
        title: "Access Denied",
        description: "Unable to access device contacts. Please add contacts manually.",
        variant: "destructive",
      });
    }
  };

  const handleSaveContact = async () => {
    if (!contactForm.full_name) {
      toast({
        title: "Name Required",
        description: "Please enter a full name for the contact.",
        variant: "destructive",
      });
      return;
    }

    if (!contactForm.email && !contactForm.phone) {
      toast({
        title: "Contact Method Required",
        description: "Please provide either an email address or phone number.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactForm)
          .eq('id', editingContact.id);

        if (error) throw error;

        toast({
          title: "Contact Updated",
          description: "Trusted contact has been updated successfully.",
        });
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            ...contactForm,
            user_id: user?.id
          });

        if (error) throw error;

        toast({
          title: "Contact Added",
          description: "New trusted contact has been added successfully.",
        });
      }

      // Reset form and reload
      setContactForm({
        full_name: "",
        email: "",
        phone: "",
        relationship: "",
        is_primary: false
      });
      setEditingContact(null);
      setIsAddModalOpen(false);
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Contact Deleted",
        description: "Trusted contact has been removed.",
      });
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      full_name: contact.full_name,
      email: contact.email || "",
      phone: contact.phone || "",
      relationship: contact.relationship || "",
      is_primary: contact.is_primary
    });
    setIsAddModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-comfort flex items-center justify-center pb-20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your trusted contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-comfort pb-20">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-gentle">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-serif font-light text-foreground mb-2">
          Trusted Contacts
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Designate loved ones who will ensure your messages reach their intended recipients
        </p>
      </div>

      <div className="px-6 max-w-lg mx-auto space-y-6">
        {/* Add Contact Buttons */}
        <div className="flex flex-col gap-3">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-gradient-primary hover:shadow-warm transition-all duration-300 h-12"
                onClick={() => {
                  setEditingContact(null);
                  setContactForm({
                    full_name: "",
                    email: "",
                    phone: "",
                    relationship: "",
                    is_primary: false
                  });
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Trusted Contact
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={requestDeviceContacts}
          >
            <Download className="w-4 h-4 mr-2" />
            Import from Device Contacts
          </Button>
        </div>

        {/* Contacts List */}
        {contacts.length > 0 ? (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="shadow-gentle hover:shadow-comfort transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {contact.full_name}
                        </h3>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary Contact
                          </Badge>
                        )}
                      </div>
                      
                      {contact.relationship && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {contact.relationship}
                        </p>
                      )}
                      
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(contact)}
                        className="w-8 h-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="shadow-gentle bg-muted/20 border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">
                No trusted contacts yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add trusted contacts to ensure your legacy messages are delivered when needed
              </p>
            </CardContent>
          </Card>
        )}

        {/* About Section */}
        <Card className="shadow-gentle bg-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Info className="w-5 h-5 text-primary" />
              <span>About Trusted Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Primary Contact:</p>
              <p>Your main executor who will manage the delivery of all your messages.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">Backup Contacts:</p>
              <p>Additional family members or friends who can step in if needed.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">Security:</p>
              <p>Contacts are notified through secure, encrypted communications.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Contact Modal */}
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto m-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {editingContact ? "Edit Contact" : "Add New Trusted Contact"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            This person will help manage and deliver your legacy messages
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={contactForm.full_name}
                onChange={(e) => setContactForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g. Jonah S Rehbein-Jones"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={contactForm.relationship}
                onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g. Daughter, Son, Spouse"
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="jonahrehbeinjones@gmail.com"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={contactForm.phone}
              onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="4142074312"
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={contactForm.is_primary}
              onChange={(e) => setContactForm(prev => ({ ...prev, is_primary: e.target.checked }))}
              className="rounded border-border"
            />
            <Label htmlFor="is_primary" className="text-sm">
              Set as Primary Contact
            </Label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleSaveContact}
            className="flex-1 bg-gradient-primary hover:shadow-warm"
          >
            {editingContact ? "Update Contact" : "Add Contact"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsAddModalOpen(false);
              setEditingContact(null);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </div>
  );
}
