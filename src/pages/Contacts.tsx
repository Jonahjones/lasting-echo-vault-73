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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, User, Mail, Phone, Edit, Trash2, Users, Shield, Info, Download, Crown, Star, Heart, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
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
  invitation_status?: string;
}

// Common relationship options sorted alphabetically
const RELATIONSHIP_OPTIONS = [
  "Aunt/Uncle",
  "Child", 
  "Colleague",
  "Cousin",
  "Friend",
  "Grandparent",
  "Neighbor",
  "Niece/Nephew",
  "Other",
  "Parent",
  "Partner",
  "Sibling",
  "Spouse"
];

export default function Contacts() {
  console.log('Contacts component rendering...');
  
  const { user } = useAuth();
  console.log('User from auth:', user);
  
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Collapsible section state - initialized from sessionStorage
  const [trustedSectionExpanded, setTrustedSectionExpanded] = useState(() => {
    const saved = sessionStorage.getItem('trustedContactsExpanded');
    return saved !== null ? JSON.parse(saved) : false; // Collapsed by default
  });
  
  const [regularSectionExpanded, setRegularSectionExpanded] = useState(() => {
    const saved = sessionStorage.getItem('regularContactsExpanded');
    return saved !== null ? JSON.parse(saved) : false; // Collapsed by default
  });
  
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const checkUserExists = async (email: string) => {
    try {
      // For now, we'll assume the user doesn't exist and let the backend handle the invitation
      // In a real implementation, you could use a Supabase function to check auth.users
      // or implement a server-side check
      return { exists: false, user_id: null };
    } catch (error) {
      return { exists: false, user_id: null };
    }
  };

  const sendWelcomeEmail = async (contactData: any, isExistingUser: boolean) => {
    try {
      console.log('Calling send-welcome-email function with:', {
        contact_email: contactData.email,
        contact_name: contactData.full_name,
        contact_type: contactData.contact_type,
        is_existing_user: isExistingUser
      });
      
      // Call Supabase function to send welcome email
      const response = await fetch(`https://fradbhfppmwjcouodahf.supabase.co/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYWRiaGZwcG13amNvdW9kYWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDkxNDMsImV4cCI6MjA2NzIyNTE0M30.HlIxWduJjc5kXnLzCYxY688dSeT1yj5CfFyjjuZclFw`,
        },
        body: JSON.stringify({
          contact_email: contactData.email,
          contact_name: contactData.full_name,
          inviter_name: user?.user_metadata?.display_name || user?.email,
          contact_type: contactData.contact_type,
          is_existing_user: isExistingUser
        })
      });

      const data = await response.json();
      console.log('Direct API response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't fail the whole operation, just log the error
      toast({
        title: "Contact Added",
        description: "Contact was added but welcome email could not be sent.",
        variant: "default",
      });
    }
  };

  const handleSaveContact = async () => {
    if (!contactForm.full_name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a full name for the contact.",
        variant: "destructive",
      });
      return;
    }

    if (!contactForm.email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(contactForm.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Validation for trusted contacts
    if (contactForm.contact_type === 'trusted') {
      if (!contactForm.phone.trim()) {
        toast({
          title: "Phone Required",
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
    }

    setIsSaving(true);

    try {
      const email = contactForm.email.trim().toLowerCase();
      
      // Check if contact already exists for this user
      if (!editingContact) {
        const existingContact = contacts.find(c => c.email?.toLowerCase() === email);
        if (existingContact) {
          toast({
            title: "Contact Exists",
            description: "A contact with this email address already exists.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      const contactData = {
        full_name: contactForm.full_name.trim(),
        email: email,
        phone: contactForm.phone.trim() || null,
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
        // Check if user exists in the platform
        const { exists, user_id } = await checkUserExists(email);
        
        const newContactData = {
          ...contactData,
          user_id: user?.id,
          invitation_status: exists ? 'registered' : 'pending'
        };

        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert(newContactData);

        if (error) throw error;

        // Send welcome email for new users
        if (!exists) {
          console.log('Sending welcome email to:', contactData.email, 'Contact type:', contactData.contact_type);
          await sendWelcomeEmail(contactData, false);
        } else {
          console.log('User already exists, skipping welcome email');
        }

        toast({
          title: "Contact Added",
          description: exists 
            ? `${contactData.full_name} has been added to your contacts.`
            : `${contactData.full_name} has been invited to join One Final Moment and added to your contacts.`,
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
    } finally {
      setIsSaving(false);
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

  // Functions to toggle section expansion
  const toggleTrustedSection = () => {
    const newState = !trustedSectionExpanded;
    setTrustedSectionExpanded(newState);
    sessionStorage.setItem('trustedContactsExpanded', JSON.stringify(newState));
  };

  const toggleRegularSection = () => {
    const newState = !regularSectionExpanded;
    setRegularSectionExpanded(newState);
    sessionStorage.setItem('regularContactsExpanded', JSON.stringify(newState));
  };

  const openAddModalWithType = (type: 'trusted' | 'regular') => {
    resetForm();
    setContactForm(prev => ({ ...prev, contact_type: type }));
    setIsAddModalOpen(true);
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
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center pb-20">
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
    <div className="min-h-screen bg-gradient-surface pb-20">
      {/* Compact Header */}
      <div className="pt-6 pb-4 px-4 max-w-2xl mx-auto">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-0 shadow-gentle">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-gentle">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                  My Contacts & Permissions
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1 leading-snug">
                  Manage who can receive your memories and help deliver your messages
                </p>
              </div>
            </div>
            
            <div className="pt-1">
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full bg-gradient-primary hover:shadow-gentle transition-all duration-300"
                    onClick={() => {
                      resetForm();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Contact
                  </Button>
                </DialogTrigger>
                
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
                        <Select
                          value={contactForm.relationship}
                          onValueChange={(value) => setContactForm(prev => ({ ...prev, relationship: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIP_OPTIONS.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : (editingContact ? "Update Contact" : "Add Contact")}
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
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

             <div className="px-4 max-w-2xl mx-auto space-y-4">

        {/* Trusted Contacts Section */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-semibold text-foreground">Trusted Contacts</h2>
                  <Badge variant="secondary" className="text-xs">
                    {trustedContacts.length}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-sm">Trusted contacts have special administrative privileges and can handle sensitive matters on your behalf.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground transition-transform duration-200"
                  onClick={toggleTrustedSection}
                  style={{ transform: trustedSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Can manage your message delivery and confirm your passing.
              </p>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  trustedSectionExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Trusted contacts can manage your message delivery, confirm your passing, and release your private memories to your regular contacts if needed.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Requires both email and phone for security verification.
                  </p>
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => openAddModalWithType('trusted')}
                className="w-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-amber-300 text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Trusted Contact
              </Button>
            </div>
          </div>

          {trustedContacts.length > 0 ? (
            <div className="grid gap-4">
              {trustedContacts.map((contact) => {
                const RoleIcon = getRoleIcon(contact.role);
                return (
                  <Card key={contact.id} className="shadow-card hover:shadow-gentle transition-all duration-300 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/30 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <RoleIcon className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {contact.full_name}
                            </h3>
                            <Badge variant="default" className="text-xs bg-amber-600 hover:bg-amber-700">
                              <Crown className="w-3 h-3 mr-1" />
                              {getRoleLabel(contact.role)}
                            </Badge>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
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
                        
                        <div className="flex flex-col space-y-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(contact)}
                            className="w-8 h-8 p-0 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDemoteContact(contact)}
                            className="w-8 h-8 p-0 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
                            title="Demote to regular contact"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="w-8 h-8 p-0 hover:bg-red-200/50 dark:hover:bg-red-800/50 text-red-600 hover:text-red-700"
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
            <Card className="shadow-card bg-amber-50/50 dark:bg-amber-950/20 border-dashed border-2 border-amber-300/50 dark:border-amber-700/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  No trusted contacts yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add trusted contacts to help manage your message delivery and final wishes
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Regular Contacts Section */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-semibold text-foreground">Regular Contacts</h2>
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                    {regularContacts.length}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-sm">Regular contacts can receive videos but cannot access administrative features or manage deliveries.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground transition-transform duration-200"
                  onClick={toggleRegularSection}
                  style={{ transform: regularSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Can receive your memories but cannot manage deliveries.
              </p>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  regularSectionExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Regular contacts can receive the memories you choose to share, but cannot manage deliveries or access your administrative features.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Perfect for friends and family who you want to share memories with.
                  </p>
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => openAddModalWithType('regular')}
                className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-blue-300 text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Regular Contact
              </Button>
            </div>
          </div>

          {regularContacts.length > 0 ? (
            <div className="grid gap-4">
              {regularContacts.map((contact) => (
                <Card key={contact.id} className="shadow-card hover:shadow-gentle transition-all duration-300 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {contact.full_name}
                          </h3>
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
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
                      
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(contact)}
                          className="w-8 h-8 p-0 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {contact.email && contact.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromoteContact(contact)}
                            className="w-8 h-8 p-0 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
                            title="Promote to trusted contact"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="w-8 h-8 p-0 hover:bg-red-200/50 dark:hover:bg-red-800/50 text-red-600 hover:text-red-700"
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
            <Card className="shadow-card bg-blue-50/50 dark:bg-blue-950/20 border-dashed border-2 border-blue-300/50 dark:border-blue-700/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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


      </div>
    </div>
  );
}