import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarIcon, Users, Mail, Phone, Plus, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";

interface VideoDetailsState {
  videoBlob: Blob;
  prompt?: string;
}

export default function VideoDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { saveVideo } = useVideoLibrary();
  
  const state = location.state as VideoDetailsState;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mock contacts data - in real app this would come from a contacts API
  const [contacts] = useState([
    { id: "1", name: "Sarah Johnson", email: "sarah@example.com", avatar: null },
    { id: "2", name: "Michael Chen", email: "michael@example.com", avatar: null },
    { id: "3", name: "Emma Davis", email: "emma@example.com", avatar: null },
  ]);

  useEffect(() => {
    if (!state?.videoBlob) {
      navigate("/record");
      return;
    }

    // Create video URL and capture thumbnail
    const videoUrl = URL.createObjectURL(state.videoBlob);
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
      videoRef.current.addEventListener('loadeddata', captureThumbnail);
    }

    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [state, navigate]);

  const captureThumbnail = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Seek to 1 second or 10% of video length for better thumbnail
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
        
        video.addEventListener('seeked', () => {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to blob and create URL
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              setThumbnailUrl(thumbnailUrl);
            }
          }, 'image/jpeg', 0.8);
        }, { once: true });
      }
    }
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddNewContact = () => {
    if (newContactEmail.trim()) {
      // In real app, this would add to contacts list or send invitation
      toast({
        title: "Contact Invited",
        description: `Invitation sent to ${newContactEmail}`,
      });
      setNewContactEmail("");
    }
  };

  const handleSaveVideo = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your video message.",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryDate) {
      toast({
        title: "Delivery Date Required", 
        description: "Please select when this message should be delivered.",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.length === 0) {
      toast({
        title: "Recipients Required",
        description: "Please select at least one contact to share with.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const videoDuration = videoRef.current?.duration || 30;
      const formattedDuration = `${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toFixed(0).padStart(2, '0')}`;
      
      await saveVideo({
        title: title.trim(),
        description: description.trim(),
        prompt: state.prompt,
        videoBlob: state.videoBlob,
        duration: formattedDuration,
        isPublic: false,
        category: "love",
        scheduledDeliveryDate: deliveryDate,
        sharedWithContacts: selectedContacts
      });

      toast({
        title: "Message Scheduled!",
        description: `Your video message will be delivered on ${format(deliveryDate, "PPP")}.`,
      });
      
      navigate("/library");
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: "Error",
        description: "Failed to save video message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!state?.videoBlob) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 max-w-sm mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/record")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Video Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Complete your message
            </p>
          </div>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-sm mx-auto">
        {/* Video Thumbnail Preview */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Recording</CardTitle>
            <CardDescription>
              Preview of your video message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border relative">
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Generating thumbnail...
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Hidden video element for thumbnail generation */}
            <video
              ref={videoRef}
              className="hidden"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>

        {/* Video Details Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Message Details</CardTitle>
            <CardDescription>
              Give your message a meaningful title and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Video Title *</Label>
              <Input
                id="title"
                placeholder="e.g., A Message of Love, Life Lessons, Cherished Memories"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional context about this message..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Date */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Delivery Date</CardTitle>
            <CardDescription>
              When should this message be delivered?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !deliveryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, "PPP") : "Select delivery date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={setDeliveryDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Contact Selection */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Share With</span>
            </CardTitle>
            <CardDescription>
              Choose trusted contacts to receive this message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Contacts */}
            <div className="space-y-3">
              <Label>Your Contacts</Label>
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200",
                    selectedContacts.includes(contact.id)
                      ? "bg-primary/5 border-primary/20"
                      : "bg-card border-border hover:bg-muted"
                  )}
                  onClick={() => handleContactToggle(contact.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    </div>
                  </div>
                  {selectedContacts.includes(contact.id) && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Add New Contact */}
            <div className="space-y-3">
              <Label>Invite New Contact</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter email address"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleAddNewContact}
                  disabled={!newContactEmail.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                They'll receive an invitation to view your message on the delivery date
              </p>
            </div>

            {/* Selected Contacts Summary */}
            {selectedContacts.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Recipients</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((contactId) => {
                    const contact = contacts.find(c => c.id === contactId);
                    return contact ? (
                      <Badge key={contactId} variant="secondary">
                        {contact.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="space-y-4 flex flex-col items-center">
            <Button
              size="lg"
              variant="legacy"
              onClick={handleSaveVideo}
              disabled={isLoading}
              className="w-[90%] h-12"
            >
            {isLoading ? "Saving..." : "Schedule Message"}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Your message will be securely stored and delivered on the selected date
          </p>
        </div>
      </div>
    </div>
  );
}
