import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Mail, Phone, Shield, Edit, Trash2 } from "lucide-react";

interface TrustedContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  isPrimary: boolean;
}

const initialContacts: TrustedContact[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    relationship: "Daughter",
    isPrimary: true
  },
  {
    id: "2",
    name: "Michael Rodriguez",
    email: "michael.r@email.com",
    relationship: "Son",
    isPrimary: false
  }
];

export default function Contacts() {
  const [contacts, setContacts] = useState<TrustedContact[]>(initialContacts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    relationship: ""
  });

  const handleAddContact = () => {
    if (newContact.name && newContact.email) {
      const contact: TrustedContact = {
        id: Date.now().toString(),
        ...newContact,
        isPrimary: contacts.length === 0
      };
      setContacts([...contacts, contact]);
      setNewContact({ name: "", email: "", phone: "", relationship: "" });
      setShowAddForm(false);
    }
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  const handleSetPrimary = (id: string) => {
    setContacts(contacts.map(contact => ({
      ...contact,
      isPrimary: contact.id === id
    })));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="container mx-auto px-4 py-8 max-w-sm">
        <div className="mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted Contacts
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designate loved ones who will ensure your messages reach their intended recipients
            </p>
          </div>

          <div className="space-y-8">
            {/* Contacts List */}
            <div className="space-y-6">
              {/* Add New Contact */}
              {!showAddForm ? (
                <Card className="shadow-card border-dashed border-2 hover:shadow-gentle transition-all duration-300">
                  <CardContent className="flex items-center justify-center py-12">
                    <Button 
                      variant="warm" 
                      size="lg"
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Trusted Contact</span>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Add New Trusted Contact</CardTitle>
                    <CardDescription>
                      This person will help manage and deliver your legacy messages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newContact.name}
                          onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="relationship">Relationship</Label>
                        <Input
                          id="relationship"
                          value={newContact.relationship}
                          onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                          placeholder="e.g., Daughter, Son, Spouse"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                        placeholder="Enter email address"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button variant="legacy" onClick={handleAddContact}>
                        Add Contact
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddForm(false);
                          setNewContact({ name: "", email: "", phone: "", relationship: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Existing Contacts */}
              {contacts.map((contact) => (
                <Card key={contact.id} className="shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-foreground">{contact.name}</h3>
                            {contact.isPrimary && (
                              <span className="bg-accent/20 text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
                                Primary Contact
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{contact.relationship}</p>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              <span>{contact.email}</span>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!contact.isPrimary && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSetPrimary(contact.id)}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Information Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>About Trusted Contacts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Primary Contact:</strong> Your main executor who will manage the delivery of all your messages.
                  </p>
                  <p>
                    <strong className="text-foreground">Backup Contacts:</strong> Additional family members or friends who can step in if needed.
                  </p>
                  <p>
                    <strong className="text-foreground">Security:</strong> Contacts are notified through secure, encrypted communications.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Add trusted family members or friends</p>
                  <p>2. Designate a primary contact</p>
                  <p>3. They receive secure instructions when needed</p>
                  <p>4. Your messages are delivered as intended</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
