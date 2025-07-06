import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Users, Globe, Lock, Calendar, Save, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { DeliveryOption } from "./DeliveryScheduler";

interface Contact {
  id: string;
  full_name: string;
  email: string;
}

interface VideoConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  
  // Video details
  title: string;
  description?: string;
  
  // Sharing details
  isPublic: boolean;
  selectedContacts: Contact[];
  deliveryOption: DeliveryOption;
  scheduledDate?: Date;
}

export function VideoConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  isLoading,
  title,
  description,
  isPublic,
  selectedContacts,
  deliveryOption,
  scheduledDate
}: VideoConfirmationModalProps) {
  const getActionText = () => {
    switch (deliveryOption) {
      case 'send-now':
        return isPublic ? 'Publish Video' : selectedContacts.length > 0 ? 'Send Video' : 'Save Video';
      case 'schedule':
        return isPublic ? 'Schedule Publication' : 'Schedule Delivery';
      case 'save-only':
        return 'Save Video';
      default:
        return 'Confirm';
    }
  };

  const getActionIcon = () => {
    switch (deliveryOption) {
      case 'send-now':
        return isPublic ? <Globe className="w-4 h-4" /> : selectedContacts.length > 0 ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />;
      case 'schedule':
        return <Calendar className="w-4 h-4" />;
      case 'save-only':
        return <Save className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getDeliveryDescription = () => {
    switch (deliveryOption) {
      case 'send-now':
        if (isPublic) {
          return "Your video will be published to the public feed immediately and visible to all users.";
        }
        if (selectedContacts.length === 0) {
          return "Your video will be saved to your private library.";
        }
        return `Your video will be sent immediately to ${selectedContacts.length} contact${selectedContacts.length === 1 ? '' : 's'}.`;
      
      case 'schedule':
        if (isPublic) {
          return scheduledDate ? 
            `Your video will be automatically published to the public feed on ${format(scheduledDate, "PPPP")}.` :
            "Please select a date for publication.";
        }
        if (selectedContacts.length === 0) {
          return scheduledDate ?
            `Your video will remain private in your library until ${format(scheduledDate, "PPPP")}.` :
            "Please select a date for availability.";
        }
        return scheduledDate ?
          `Your video will be automatically sent to ${selectedContacts.length} contact${selectedContacts.length === 1 ? '' : 's'} on ${format(scheduledDate, "PPPP")}.` :
          "Please select a delivery date.";
      
      case 'save-only':
        return "Your video will be saved privately to your library. You can share it later from your video management page.";
      
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Confirm Video Details</span>
          </DialogTitle>
          <DialogDescription>
            Please review your video details before finalizing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Details */}
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2">Video Details</h4>
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="font-medium text-foreground">{title}</p>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Privacy & Audience */}
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2 flex items-center space-x-2">
              {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>Privacy & Audience</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant={isPublic ? "default" : "secondary"}>
                  {isPublic ? "Public" : "Private"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {isPublic ? "Visible to everyone" : "Only visible to selected contacts"}
                </span>
              </div>
              
              {!isPublic && selectedContacts.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Recipients ({selectedContacts.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedContacts.map((contact) => (
                      <Badge key={contact.id} variant="outline" className="text-xs">
                        {contact.full_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {!isPublic && selectedContacts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No contacts selected - video will be private to you only
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Delivery Schedule */}
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Delivery</span>
            </h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-foreground">
                {getDeliveryDescription()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="legacy"
              onClick={onConfirm}
              className="flex-1"
              disabled={isLoading || (deliveryOption === 'schedule' && !scheduledDate)}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {getActionIcon()}
                  <span className="ml-2">{getActionText()}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}