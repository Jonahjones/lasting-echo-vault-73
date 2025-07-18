import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Users, Globe, Lock, Calendar, Save, Send, Clock, Shield } from "lucide-react";
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
  
  // New delivery mode props
  shareMode?: 'regular' | 'trusted';
  regularContactsCount?: number;
  trustedContactsCount?: number;
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
  scheduledDate,
  shareMode = 'regular',
  regularContactsCount = 0,
  trustedContactsCount = 0
}: VideoConfirmationModalProps) {
  const getActionText = () => {
    if (shareMode === 'trusted') {
      return 'Save for Trusted Contact Release';
    }
    
    switch (deliveryOption) {
      case 'send-now':
        return isPublic ? 'Publish Video' : selectedContacts.length > 0 ? 'Send Video' : 'Save Video';
      case 'schedule':
        return 'Schedule Video';
      case 'save-only':
      default:
        return 'Save Video';
    }
  };

  const getDeliveryDescription = () => {
    if (shareMode === 'trusted') {
      return `Will be released by ${trustedContactsCount} trusted contact${trustedContactsCount !== 1 ? 's' : ''} upon confirmation`;
    }
    
    if (shareMode === 'regular') {
      return `Will be sent immediately to ${regularContactsCount} regular contact${regularContactsCount !== 1 ? 's' : ''}`;
    }
    
    // Fallback for old delivery options
    switch (deliveryOption) {
      case 'send-now':
        return isPublic 
          ? 'Your video will be published to the public feed immediately'
          : `Your video will be sent to ${selectedContacts.length} selected contact${selectedContacts.length !== 1 ? 's' : ''} immediately`;
      case 'schedule':
        return scheduledDate 
          ? `Your video will be sent on ${format(scheduledDate, 'MMMM d, yyyy')} at ${format(scheduledDate, 'h:mm a')}`
          : 'Your video will be sent at the scheduled time';
      case 'save-only':
      default:
        return 'Your video will be saved to your library only';
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

          {/* Privacy & Delivery Mode */}
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2 flex items-center space-x-2">
              {shareMode === 'trusted' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              <span>Delivery Mode</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant={shareMode === 'trusted' ? "default" : "secondary"}>
                  {shareMode === 'trusted' ? "Trusted Contact Release" : "Immediate Sharing"}
                </Badge>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {getDeliveryDescription()}
                </p>
              </div>
              
              {/* Contact counts */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Regular: {regularContactsCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Trusted: {trustedContactsCount}</span>
                </div>
              </div>
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
              variant="primary"
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
                  {shareMode === 'trusted' ? (
                    <Shield className="w-4 h-4 mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {getActionText()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}