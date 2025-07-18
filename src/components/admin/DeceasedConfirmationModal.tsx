import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, Shield, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeceasedConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
}

export function DeceasedConfirmationModal({ 
  isOpen, 
  onClose, 
  targetUserId, 
  targetUserName 
}: DeceasedConfirmationModalProps) {
  const [step, setStep] = useState(1);
  const [notes, setNotes] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [hasUnderstood, setHasUnderstood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const expectedConfirmationText = `I confirm that ${targetUserName} has passed away`;

  const resetModal = () => {
    setStep(1);
    setNotes("");
    setVerificationMethod("");
    setConfirmationText("");
    setHasUnderstood(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSubmit = async () => {
    if (confirmationText !== expectedConfirmationText) {
      toast({
        title: "Confirmation Text Mismatch",
        description: "Please type the exact confirmation text as shown.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the secure API endpoint that enforces trusted contact authorization
      const { data, error } = await supabase.functions.invoke('mark-user-deceased', {
        body: {
          target_user_id: targetUserId,
          confirmation_notes: notes,
          verification_method: verificationMethod
        }
      });

      if (error) {
        console.error('Error calling mark-user-deceased function:', error);
        throw new Error(error.message || 'Failed to record confirmation');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to record confirmation');
      }

      console.log('✅ Successfully marked user as deceased:', data);

      toast({
        title: "Confirmation Recorded",
        description: `${targetUserName} has been marked as deceased. Their private videos will be released to designated contacts.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record confirmation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Confirm Passing - {targetUserName}</span>
          </DialogTitle>
          <DialogDescription>
            This is a serious and irreversible action. Please proceed with care and respect.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                <strong>Important:</strong> This action will immediately mark {targetUserName} as deceased and trigger the release of their private videos to designated contacts. This cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">What happens next:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <Heart className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                  <span>Their account will be marked as deceased</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Private videos will be released to their trusted contacts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                  <span>All contacts will be notified of their passing</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="understand"
                checked={hasUnderstood}
                onCheckedChange={(checked) => setHasUnderstood(checked as boolean)}
              />
              <Label htmlFor="understand" className="text-sm">
                I understand the consequences of this action and confirm this information is accurate
              </Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!hasUnderstood}
                className="bg-red-600 hover:bg-red-700"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification">How was this confirmed?</Label>
              <Select value={verificationMethod} onValueChange={setVerificationMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select verification method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family_notification">Family notification</SelectItem>
                  <SelectItem value="official_document">Official death certificate</SelectItem>
                  <SelectItem value="funeral_service">Funeral service attendance</SelectItem>
                  <SelectItem value="medical_professional">Medical professional confirmation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Details (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please provide any additional context or details about the confirmation..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type the following to confirm: 
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  {expectedConfirmationText}
                </Badge>
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type the confirmation text exactly as shown above"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!verificationMethod || confirmationText !== expectedConfirmationText || isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? "Recording..." : "Confirm Passing"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 