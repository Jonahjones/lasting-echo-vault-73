import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Crown, Star, AlertTriangle, Users, Heart, ChevronRight, Loader2, RefreshCw, Search, Calendar, Mail, Phone, Eye, EyeOff, Clock, CheckCircle, X, UserCheck, Info } from "lucide-react";
import { useTrustedContactStatus } from "@/hooks/useTrustedContactStatus";
import { DeceasedConfirmationModal } from "@/components/admin/DeceasedConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExtendedRelationship {
  mainUserId: string;
  mainUserName: string;
  mainUserEmail: string;
  role: 'executor' | 'legacy_messenger' | 'guardian';
  isPrimary: boolean;
  addedDate?: string;
  contactInfo?: {
    email: string;
    phone?: string;
  };
  status: 'active' | 'inactive'; // Simplified: no deceased/pending states
  lastActivity?: string;
}

interface InvitationConfirmationDialog {
  isOpen: boolean;
  invitation: any | null;
  action: 'accept' | 'decline';
}

export default function TrustedContactCenter() {
  const { 
    trustedRelationships, 
    activeRelationships,
    // Remove pending-related state
    isTrustedContact, 
    isLoading, 
    error,
    refreshStatus
  } = useTrustedContactStatus();
  
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [showDeceasedModal, setShowDeceasedModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [extendedRelationships, setExtendedRelationships] = useState<ExtendedRelationship[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { toast } = useToast();

  // Fetch extended relationship details (simplified)
  const fetchExtendedRelationshipDetails = async () => {
    if (!trustedRelationships.length) return;
    
    setLoadingDetails(true);
    try {
      const userIds = trustedRelationships.map(r => r.mainUserId);
      
      // Get additional details from simplified structure
      const { data: contactsData, error: contactsError } = await (supabase as any)
        .from('user_contacts')
        .select(`
          user_id,
          created_at,
          contacts (
            email,
            phone
          )
        `)
        .in('user_id', userIds)
        .eq('relationship_type', 'trusted')
        .eq('status', 'active'); // Only active contacts

      if (contactsError) {
        console.error('Error fetching contact details:', contactsError);
      }

      // Merge the data - all contacts are active in simplified system
      const extended: ExtendedRelationship[] = trustedRelationships.map(rel => {
        const contactInfo = contactsData?.find(c => c.user_id === rel.mainUserId);
        
        return {
          ...rel,
          addedDate: contactInfo?.created_at,
          contactInfo: {
            email: contactInfo?.contacts?.email || rel.mainUserEmail,
            phone: contactInfo?.contacts?.phone
          },
          status: 'active', // All contacts are active in simplified system
          lastActivity: contactInfo?.created_at
        };
      });

      setExtendedRelationships(extended);
    } catch (error) {
      console.error('Error fetching extended relationship details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchExtendedRelationshipDetails();
  }, [trustedRelationships]);

  // Refresh all data (simplified)
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshStatus();
      toast({
        title: "Refreshed",
        description: "Trusted contact information has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Filter relationships based on search and role
  const filteredRelationships = extendedRelationships.filter(rel => {
    const userName = (rel.mainUserName || "").toLowerCase();
    const userEmail = (rel.mainUserEmail || "").toLowerCase();
    const searchTerm = (searchQuery || "").toLowerCase().trim();
    
    const matchesSearch = userName.includes(searchTerm) || userEmail.includes(searchTerm);
    const matchesRole = selectedRole === "all" || rel.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Calculate simplified stats (all relationships are active)
  const stats = {
    total: activeRelationships.length,
    active: activeRelationships.length,
    pending: 0, // No pending in simplified system
    deceased: 0 // Simplified for now
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading trusted contact information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 dark:from-green-950/20 dark:to-amber-950/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Trusted Contact Center
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your trusted contacts who can receive your messages and help deliver your messages.
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trusted Contacts
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Relationships
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.active}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Role
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {isTrustedContact ? 'Trusted Contact' : 'User'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {stats.total === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trusted Contacts</h3>
              <p className="text-muted-foreground mb-4">
                You haven't been designated as a trusted contact by anyone yet.
              </p>
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-green-600 hover:bg-green-700"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle>Your Trusted Contact Relationships</CardTitle>
                    <CardDescription>
                      People who have designated you as their trusted contact
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    variant="outline"
                    size="sm"
                  >
                    {refreshing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="sm:w-48">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="executor">Executor</SelectItem>
                        <SelectItem value="legacy_messenger">Legacy Messenger</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Relationships List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>Active Relationships ({filteredRelationships.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDetails ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading relationship details...</p>
                  </div>
                ) : filteredRelationships.length > 0 ? (
                  <div className="space-y-4">
                    {filteredRelationships.map((relationship) => {
                      const roleInfo = {
                        executor: { icon: Crown, color: "text-purple-600", label: "Executor" },
                        legacy_messenger: { icon: Heart, color: "text-blue-600", label: "Legacy Messenger" },
                        guardian: { icon: Shield, color: "text-green-600", label: "Guardian" }
                      }[relationship.role];

                      return (
                        <Card key={relationship.mainUserId} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                      {relationship.mainUserName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">{relationship.mainUserName}</h3>
                                    <p className="text-sm text-muted-foreground">{relationship.mainUserEmail}</p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <Badge variant="outline" className={`${roleInfo.color} border-current`}>
                                    <roleInfo.icon className="w-3 h-3 mr-1" />
                                    {roleInfo.label}
                                  </Badge>
                                  {relationship.isPrimary && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                                      <Star className="w-3 h-3 mr-1" />
                                      Primary Contact
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                </div>

                                {relationship.addedDate && (
                                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Added: {new Date(relationship.addedDate).toLocaleDateString()}
                                  </div>
                                )}

                                {relationship.contactInfo && (
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                      <Mail className="w-4 h-4 mr-2" />
                                      {relationship.contactInfo.email}
                                    </div>
                                    {relationship.contactInfo.phone && (
                                      <div className="flex items-center">
                                        <Phone className="w-4 h-4 mr-2" />
                                        {relationship.contactInfo.phone}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser({
                                      userId: relationship.mainUserId,
                                      userName: relationship.mainUserName
                                    });
                                    setShowDeceasedModal(true);
                                  }}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <AlertTriangle className="w-4 h-4 mr-1" />
                                  Mark Deceased
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No matching relationships</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || selectedRole !== "all" 
                        ? "Try adjusting your search or filter criteria." 
                        : "No trusted contact relationships found."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Deceased Confirmation Modal */}
        {selectedUser && (
          <DeceasedConfirmationModal
            isOpen={showDeceasedModal}
            onClose={() => {
              setShowDeceasedModal(false);
              setSelectedUser(null);
            }}
            targetUserName={selectedUser.userName}
            targetUserId={selectedUser.userId}
          />
        )}
      </div>
    </div>
  );
} 