import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Heart, ArrowRight, User, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Check if user came from SSO by looking at their provider
  const isFromSSO = user?.app_metadata?.provider !== 'email';
  
  // Profile data - intelligently pre-fill from SSO or profile, but never for manual signup
  const [firstName, setFirstName] = useState(() => {
    // If profile already has data, use that (user is editing)
    if (profile?.first_name) return profile.first_name;
    
    // Only pre-fill for SSO users
    if (isFromSSO) {
      // Try different SSO metadata sources
      return user?.user_metadata?.first_name || 
             user?.user_metadata?.given_name ||
             (user?.user_metadata?.name ? user.user_metadata.name.split(' ')[0] : '') || 
             '';
    }
    
    // Manual signup - never pre-fill
    return '';
  });
  
  const [lastName, setLastName] = useState(() => {
    // If profile already has data, use that (user is editing)
    if (profile?.last_name) return profile.last_name;
    
    // Only pre-fill for SSO users
    if (isFromSSO) {
      // Try different SSO metadata sources
      const fullName = user?.user_metadata?.name;
      return user?.user_metadata?.last_name || 
             user?.user_metadata?.family_name ||
             (fullName && fullName.includes(' ') ? fullName.split(' ').slice(1).join(' ') : '') || 
             '';
    }
    
    // Manual signup - never pre-fill
    return '';
  });
  
  const [tagline, setTagline] = useState(profile?.tagline || '');
  
  // Image handling
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(profile?.avatar_url || '');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = useCallback((image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(resolve as BlobCallback, 'image/jpeg', 0.9);
    });
  }, []);

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedImage || !completedCrop || !imgRef.current || !user) return null;

    try {
      setUploadError('');
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      const fileName = `avatars/${user.id}/avatar-${Date.now()}.jpg`;
      
      // Upload with timeout
      const uploadPromise = supabase.storage
        .from('videos')
        .upload(fileName, croppedImageBlob, {
          cacheControl: '3600',
          upsert: true
        });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 30000)
      );
      
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setUploadError(errorMessage);
      toast({
        title: "Upload Failed",
        description: errorMessage + ". Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;

    setIsLoading(true);
    setSaveError('');
    
    try {
      let avatarUrl = profile?.avatar_url || null;
      
      // Upload new avatar if selected
      if (selectedImage && completedCrop) {
        avatarUrl = await uploadAvatar();
        if (uploadError) {
          // Upload failed, but allow user to continue without avatar
          console.log('Avatar upload failed, continuing without new avatar');
        }
      }

      const profileData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        tagline: tagline?.trim() || null,
        avatar_url: avatarUrl,
        onboarding_completed: true
      };

      // Use timeout for profile save
      const savePromise = supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...profileData
        }, {
          onConflict: 'user_id'
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout')), 15000)
      );

      const { error } = await Promise.race([savePromise, timeoutPromise]) as any;

      if (error) throw error;

      toast({
        title: "Profile Created Successfully",
        description: "Welcome to One Final Moment. Let's capture your first meaningful moment.",
      });

      // Refresh the profile context and complete onboarding
      await refreshProfile();
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      setSaveError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage + ". Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!firstName.trim() || !lastName.trim())) {
      toast({
        title: "Required Information",
        description: "Please enter your first and last name to continue.",
        variant: "destructive"
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-comfort flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-gentle">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-light text-foreground">Memory Journal</h1>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-2">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                num <= step ? 'bg-primary shadow-gentle' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-lg">
          <Card className="shadow-comfort border-0 bg-card/80 backdrop-blur-sm">
            {step === 1 && (
              <>
                <CardHeader className="text-center space-y-4 pb-6">
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle">
                    <User className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-serif font-light text-foreground">
                    Tell us about yourself
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    Help us personalize your memory journal experience with your name and details.
                    {isFromSSO && (firstName || lastName) && (
                      <span className="block mt-2 text-sm text-primary font-medium">
                        ✓ We've pre-filled your name from your account - feel free to edit it if needed
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">First Name</label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        className="h-12 border-border/60 focus:border-primary/50 bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Last Name</label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                        className="h-12 border-border/60 focus:border-primary/50 bg-background/50"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleNext}
                    size="lg" 
                    className="w-full h-14 text-base font-medium shadow-gentle hover:shadow-warm transition-all duration-300"
                  >
                    Continue <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </>
            )}

            {step === 2 && (
              <>
                <CardHeader className="text-center space-y-4 pb-6">
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle">
                    <Camera className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-serif font-light text-foreground">
                    Add your photo
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    Upload a photo so your loved ones can see your face when they receive your memories.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    
                    {!imagePreview ? (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Tap to select a photo
                            </span>
                          </div>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={1}
                            circularCrop
                          >
                            <img
                              ref={imgRef}
                              alt="Crop me"
                              src={imagePreview}
                              className="max-h-64 rounded-lg"
                            />
                          </ReactCrop>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          Choose Different Photo
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={handleBack}
                      className="flex-1 h-12"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleNext}
                      className="flex-1 h-12 shadow-gentle hover:shadow-warm transition-all duration-300"
                    >
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {step === 3 && (
              <>
                <CardHeader className="text-center space-y-4 pb-6">
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle">
                    <MessageCircle className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-serif font-light text-foreground">
                    Your personal tagline
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    Add a meaningful phrase that captures your spirit. This will appear with your stories.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Personal Message <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Textarea
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g., 'Always remember to choose love over fear' or 'Living life with gratitude and joy'"
                      className="min-h-20 border-border/60 focus:border-primary/50 bg-background/50 resize-none"
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {tagline.length}/120 characters
                    </p>
                  </div>
                  
                  {/* Error Display */}
                  {(uploadError || saveError) && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        {uploadError && "Image upload failed: " + uploadError}
                        {saveError && "Save failed: " + saveError}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You can try again or continue without the photo.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={handleBack}
                      className="flex-1 h-12"
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleProfileSave}
                      disabled={isLoading}
                      className="flex-1 h-12 shadow-gentle hover:shadow-warm transition-all duration-300"
                    >
                      {isLoading ? "Creating Profile..." : "Complete Setup"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}