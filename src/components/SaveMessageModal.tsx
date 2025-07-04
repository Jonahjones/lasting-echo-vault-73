import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CalendarDays, Users, Mail, Phone, X, Plus } from "lucide-react";

interface SaveMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SaveMessageData) => void;
  videoBlob: Blob | null;
}

interface SaveMessageData {
  title: string;
  description: string;
  deliveryDate: string | null;
  viewers: Array<{ email?: string; phone?: string; name: string }>;
}

export function SaveMessageModal({ isOpen, onClose, onSave, videoBlob }: SaveMessageModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [hasDeliveryDate, setHasDeliveryDate] = useState(false);
  const [viewers, setViewers] = useState<Array<{ email?: string; phone?: string; name: string }>>([
    { email: "", name: "" }
  ]);

  const addViewer = () => {
    setViewers([...viewers, { email: "", name: "" }]);
  };

  const removeViewer = (index: number) => {
    if (viewers.length > 1) {
      setViewers(viewers.filter((_, i) => i !== index));
    }
  };

  const updateViewer = (index: number, field: string, value: string) => {
    const updated = [...viewers];
    updated[index] = { ...updated[index], [field]: value };
    setViewers(updated);
  };

  const handleSave = () => {
    const validViewers = viewers.filter(v => v.name && (v.email || v.phone));
    
    if (!title.trim()) {
      alert("Please enter a title for your message");
      return;
    }
    
    if (validViewers.length === 0) {
      alert("Please add at least one viewer");
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      deliveryDate: hasDeliveryDate ? deliveryDate : null,
      viewers: validViewers
    });
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>Save Your Message</span>
          </DialogTitle>
          <DialogDescription>
            Set up delivery details for your video message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title *</label>
                <Input
                  placeholder="e.g., Birthday message for Sarah"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description (optional)</label>
                <Textarea
                  placeholder="Add any notes about this message..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hasDeliveryDate"
                  checked={hasDeliveryDate}
                  onChange={(e) => setHasDeliveryDate(e.target.checked)}
                  className="w-4 h-4 text-primary"
                />
                <label htmlFor="hasDeliveryDate" className="text-sm font-medium text-foreground">
                  Schedule delivery for a specific date
                </label>
              </div>
              
              {hasDeliveryDate && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Delivery Date</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={getTomorrowDate()}
                      className="pl-12 h-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave unchecked to deliver only upon your passing
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Viewers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Who can view this message?</span>
                </span>
                <Button variant="outline" size="sm" onClick={addViewer}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Add people who will receive this message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {viewers.map((viewer, index) => (
                <div key={index} className="space-y-3 p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Viewer {index + 1}
                    </span>
                    {viewers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeViewer(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="Name *"
                      value={viewer.name}
                      onChange={(e) => updateViewer(index, 'name', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={viewer.email || ""}
                        onChange={(e) => updateViewer(index, 'email', e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="Phone number (optional)"
                        value={viewer.phone || ""}
                        onChange={(e) => updateViewer(index, 'phone', e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Email or phone required
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="legacy" onClick={handleSave} className="flex-1">
              Save Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}