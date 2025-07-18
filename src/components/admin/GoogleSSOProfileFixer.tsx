import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, CheckCircle, AlertTriangle, RefreshCw, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FixResult {
  success: boolean;
  message: string;
  profileData?: any;
  authData?: any;
  error?: string;
}

export function GoogleSSOProfileFixer() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const { toast } = useToast();

  const fixGoogleSSOProfile = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the Google SSO user's email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('🔧 Starting Google SSO profile fix for:', email);
      const emailLower = email.toLowerCase().trim();

      // Step 1: Check if user exists in profiles table first
      console.log('🔍 Checking profiles table...');
      
      const usernamePattern = emailLower.split('@')[0];
      const { data: existingProfiles, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${usernamePattern}%,first_name.ilike.%${usernamePattern}%`)
        .limit(5);

      console.log('📊 Existing profiles check:', { existingProfiles, profileCheckError });

      let userId: string | null = null;
      let existingProfile: any = null;
      let userEmail = emailLower;

      // Find the best matching profile
      if (existingProfiles && existingProfiles.length > 0) {
        // Try to find best match based on username pattern
        existingProfile = existingProfiles.find(p => 
          p.display_name?.toLowerCase().includes(usernamePattern) || 
          p.first_name?.toLowerCase().includes(usernamePattern)
        ) || existingProfiles[0];
        userId = existingProfile.user_id;
      }

      if (!userId) {
        setResult({
          success: false,
          message: "User not found in system",
          error: `No user account found for ${emailLower}. They may need to sign up via Google SSO first, or their profile may not have been created properly.`
        });
        return;
      }

      console.log('✅ User found:', { userId, existingProfile });

      // Step 2: Create/update the profile with proper email data
      const profileData = {
        user_id: userId,
        first_name: existingProfile?.first_name || emailLower.split('@')[0], 
        last_name: existingProfile?.last_name || '',
        display_name: existingProfile?.display_name || emailLower.split('@')[0],
        onboarding_completed: true, // Mark as completed so they don't get stuck
        first_video_recorded: existingProfile?.first_video_recorded || false,
        avatar_url: existingProfile?.avatar_url || null,
        tagline: existingProfile?.tagline || null,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Upserting profile with data:', profileData);

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        setResult({
          success: false,
          message: "Failed to fix profile",
          error: updateError.message
        });
        return;
      }

      console.log('✅ Profile fixed:', updatedProfile);

      // Step 3: Check trusted contact relationships (both directions)
      const [incomingContacts, outgoingContacts] = await Promise.all([
        // Contacts where this user is the trusted contact
        supabase
          .from('contacts')
          .select('*')
          .eq('email', emailLower)
          .eq('contact_type', 'trusted'),
        
        // Contacts this user has added  
        supabase
          .from('contacts')
          .select('*')
          .eq('user_id', userId)
          .eq('contact_type', 'trusted')
      ]);

      const incomingData = incomingContacts.data || [];
      const outgoingData = outgoingContacts.data || [];

      console.log('🛡️ Trusted contact relationships:', { 
        incoming: incomingData, 
        outgoing: outgoingData 
      });

      // Step 4: Check if the original relationship exists
      const { data: specificRelationship, error: relationshipError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', emailLower)
        .eq('contact_type', 'trusted');

      console.log('🔗 Specific relationship check:', { specificRelationship, relationshipError });

      setResult({
        success: true,
        message: `Profile successfully fixed for ${emailLower}`,
        profileData: updatedProfile,
        authData: {
          user_id: userId,
          email: userEmail,
          incoming_trusted_contacts: incomingData.length,
          outgoing_trusted_contacts: outgoingData.length,
          relationships: {
            incoming: incomingData,
            outgoing: outgoingData,
            specific: specificRelationship || []
          }
        }
      });

      toast({
        title: "Profile Fixed",
        description: `Google SSO profile has been fixed for ${emailLower}. Found ${incomingData.length} incoming and ${outgoingData.length} outgoing trusted contacts.`,
      });

    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      setResult({
        success: false,
        message: "Unexpected error occurred",
        error: error.message
      });
      
      toast({
        title: "Fix Failed",
        description: "Failed to fix the Google SSO profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Google SSO Profile Fixer
          </CardTitle>
          <CardDescription>
            Fix missing or incomplete profiles for Google SSO users to resolve trusted contact relationship issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sso-email">Google SSO User Email</Label>
            <Input
              id="sso-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="20attpkz@gmail.com"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Enter the email of the Google SSO user who needs their profile fixed
            </p>
          </div>

          <Button 
            onClick={fixGoogleSSOProfile}
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Fixing Profile...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Fix Google SSO Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              Fix Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                {result.message}
                {result.error && (
                  <div className="mt-2 font-mono text-sm">
                    Error: {result.error}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {result.success && result.profileData && (
              <div className="space-y-4">
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Fixed Profile Details:</h4>
                  <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                    <div><strong>User ID:</strong> {result.profileData.user_id}</div>
                    <div><strong>Name:</strong> {result.profileData.first_name} {result.profileData.last_name}</div>
                    <div><strong>Display Name:</strong> {result.profileData.display_name}</div>
                    <div><strong>Onboarding Completed:</strong> {result.profileData.onboarding_completed ? 'Yes' : 'No'}</div>
                    <div><strong>Trusted Contacts:</strong> {result.profileData.trusted_contacts_count} contacts</div>
                  </div>
                </div>

                {result.profileData.trusted_contacts_count > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Trusted Contacts:</h4>
                    <div className="space-y-2">
                      {result.profileData.trusted_contacts.map((contact: any, index: number) => (
                        <div key={contact.id} className="bg-muted p-2 rounded-md text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{contact.full_name} ({contact.email})</span>
                            <Badge variant="secondary">{contact.role}</Badge>
                            {contact.is_primary && <Badge variant="outline">Primary</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Next Steps:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Ask the trusted contacts to refresh their Trusted Contact Center</li>
                      <li>• The user's name should now appear properly in trusted contact relationships</li>
                      <li>• The user can now access all features normally</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 