import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, User, Mail, Phone, Edit, Trash2, Users, Shield, Info, Download, Crown, Star, Heart, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  is_primary: boolean;
  contact_type: 'trusted' | 'regular';
  role?: 'executor' | 'legacy_messenger' | 'guardian';
}

export default function Contacts() {
  console.log('Contacts component rendering...');
  
  const { user } = useAuth();
  console.log('User from auth:', user);
  
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
    contact_type: 'regular' as 'trusted' | 'regular',
    role: undefined as 'executor' | 'legacy_messenger' | 'guardian' | undefined,
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
        .order('contact_type', { ascending: false }) // trusted first
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

  const handleSaveContact = async () => {
    if (!contactForm.full_name) {
      toast({
        title: "Name Required",
        description: "Please enter a full name for the contact.",
        variant: "destructive",
      });
      return;
    }

    // Validation for trusted contacts
    if (contactForm.contact_type === 'trusted') {
      if (!contactForm.email || !contactForm.phone) {
        toast({
          title: "Complete Information Required",
          description: "Trusted contacts require both email and phone number for security.",
          variant: "destructive",
        });
        return;
      }
      if (!contactForm.role) {
        toast({
          title: "Role Required",
          description: "Please select a role for the trusted contact.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Regular contacts need at least one contact method
      if (!contactForm.email && !contactForm.phone) {
        toast({
          title: "Contact Method Required",
          description: "Please provide either an email address or phone number.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const contactData = {
        full_name: contactForm.full_name,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        relationship: contactForm.relationship || null,
        contact_type: contactForm.contact_type,
        role: contactForm.contact_type === 'trusted' ? contactForm.role : null,
        is_primary: contactForm.is_primary && contactForm.contact_type === 'trusted'
      };

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;

        toast({
          title: "Contact Updated",
          description: `${contactForm.contact_type === 'trusted' ? 'Trusted' : 'Regular'} contact has been updated successfully.`,
        });
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            ...contactData,
            user_id: user?.id
          });

        if (error) throw error;

        toast({
          title: "Contact Added",
          description: `New ${contactForm.contact_type} contact has been added successfully.`,
        });
      }

      // Reset form and reload
      resetForm();
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

  const resetForm = () => {
    setContactForm({
      full_name: "",
      email: "",
      phone: "",
      relationship: "",
      contact_type: 'regular',
      role: undefined,
      is_primary: false
    });
    setEditingContact(null);
    setIsAddModalOpen(false);
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
        description: "Contact has been removed.",
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

  const handlePromoteContact = async (contact: Contact) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          contact_type: 'trusted',
          role: 'legacy_messenger' // Default role for promoted contacts
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast({
        title: "Contact Promoted",
        description: `${contact.full_name} has been promoted to trusted contact.`,
      });
      loadContacts();
    } catch (error) {
      console.error('Error promoting contact:', error);
      toast({
        title: "Error",
        description: "Failed to promote contact. Ensure they have both email and phone number.",
        variant: "destructive",
      });
    }
  };

  const handleDemoteContact = async (contact: Contact) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          contact_type: 'regular',
          role: null,
          is_primary: false
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast({
        title: "Contact Demoted",
        description: `${contact.full_name} has been moved to regular contacts.`,
      });
      loadContacts();
    } catch (error) {
      console.error('Error demoting contact:', error);
      toast({
        title: "Error",
        description: "Failed to demote contact. Please try again.",
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
      contact_type: contact.contact_type,
      role: contact.role,
      is_primary: contact.is_primary
    });
    setIsAddModalOpen(true);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'executor': return 'Executor';
      case 'legacy_messenger': return 'Legacy Messenger';
      case 'guardian': return 'Guardian';
      default: return 'Regular Contact';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'executor': return Crown;
      case 'legacy_messenger': return Star;
      case 'guardian': return Shield;
      default: return Heart;
    }
  };

  const trustedContacts = contacts.filter(c => c.contact_type === 'trusted');
  const regularContacts = contacts.filter(c => c.contact_type === 'regular');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center pb-20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-gentle">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          My Contacts & Permissions
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Manage who can receive your memories and help deliver your messages
        </p>
      </div>

      <div className="px-6 max-w-2xl mx-auto space-y-8">
        {/* Add Contact Button */}
        <div className="flex justify-center">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-primary hover:shadow-gentle transition-all duration-300"
                onClick={() => {
                  resetForm();
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Contact
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* Trusted Contacts Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Trusted Contacts</h2>
            <Badge variant="secondary" className="text-xs">
              {trustedContacts.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Trusted contacts can help deliver your messages and manage your wishes. Add someone you trust deeply.
          </p>

          {trustedContacts.length > 0 ? (
            <div className="grid gap-4">
              {trustedContacts.map((contact) => {
                const RoleIcon = getRoleIcon(contact.role);
                return (
                  <Card key={contact.id} className="shadow-card hover:shadow-gentle transition-all duration-300 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <RoleIcon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {contact.full_name}
                            </h3>
                            <Badge variant="default" className="text-xs bg-primary">
                              <Crown className="w-3 h-3 mr-1" />
                              {getRoleLabel(contact.role)}
                            </Badge>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
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
                        
                        <div className="flex flex-col gap-1">
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
                            onClick={() => handleDemoteContact(contact)}
                            className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Demote to Regular"
                          >
                            <ArrowDown className="w-4 h-4" />
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
                );
              })}
            </div>
          ) : (
            <Card className="shadow-card bg-muted/20 border-dashed border-2 border-muted-foreground/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  No trusted contacts yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add trusted contacts to help manage your message delivery
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Regular Contacts Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Other Contacts</h2>
            <Badge variant="outline" className="text-xs">
              {regularContacts.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Regular contacts can receive your memories, but cannot manage or confirm deliveries.
          </p>

          {regularContacts.length > 0 ? (
            <div className="grid gap-4">
              {regularContacts.map((contact) => (
                <Card key={contact.id} className="shadow-card hover:shadow-gentle transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {contact.full_name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            Regular
                          </Badge>
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
                      
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(contact)}
                          className="w-8 h-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {contact.email && contact.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromoteContact(contact)}
                            className="w-8 h-8 p-0 text-primary hover:text-primary"
                            title="Promote to Trusted"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                        )}
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
            <Card className="shadow-card bg-muted/20 border-dashed border-2 border-muted-foreground/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  No regular contacts yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add friends and family to share your memories with
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Section */}
        <Card className="shadow-card bg-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Info className="w-5 h-5 text-primary" />
              <span>Contact Types</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1 flex items-center">
                <Crown className="w-4 h-4 mr-2 text-primary" />
                Trusted Contacts
              </p>
              <p>Can manage message delivery, confirm deliveries, and step in during emergencies. Require both email and phone for security.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1 flex items-center">
                <Heart className="w-4 h-4 mr-2 text-primary" />
                Regular Contacts
              </p>
              <p>Can receive your memories and messages but cannot manage deliveries or access administrative functions.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Contact Modal */}
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto m-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingContact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose contact type and provide their information
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Contact Type</Label>
            <RadioGroup
              value={contactForm.contact_type}
              onValueChange={(value) => setContactForm(prev => ({ 
                ...prev, 
                contact_type: value as 'trusted' | 'regular',
                role: value === 'regular' ? undefined : prev.role,
                is_primary: value === 'regular' ? false : prev.is_primary
              }))}
              className="grid grid-cols-1 gap-3"
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="trusted" id="trusted" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="trusted" className="text-sm font-medium flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-primary" />
                    Trusted Contact
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Can help deliver messages and manage your wishes. Requires email and phone.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="regular" id="regular" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="regular" className="text-sm font-medium flex items-center">
                    <Heart className="w-4 h-4 mr-2 text-primary" />
                    Regular Contact
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Can receive your memories but cannot manage deliveries.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Role Selection for Trusted Contacts */}
          {contactForm.contact_type === 'trusted' && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={contactForm.role} onValueChange={(value) => setContactForm(prev => ({ ...prev, role: value as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executor">
                    <div className="flex items-center">
                      <Crown className="w-4 h-4 mr-2" />
                      Executor
                    </div>
                  </SelectItem>
                  <SelectItem value="legacy_messenger">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-2" />
                      Legacy Messenger
                    </div>
                  </SelectItem>
                  <SelectItem value="guardian">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Guardian
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={contactForm.full_name}
                onChange={(e) => setContactForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={contactForm.relationship}
                onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g. Daughter, Son, Spouse"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address
                {contactForm.contact_type === 'trusted' && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id="email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number
                {contactForm.contact_type === 'trusted' && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            {contactForm.contact_type === 'trusted' && (
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
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleSaveContact}
            className="flex-1"
          >
            {editingContact ? "Update Contact" : "Add Contact"}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetForm}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </div>
  );
}