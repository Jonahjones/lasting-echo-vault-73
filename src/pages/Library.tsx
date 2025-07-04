
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, Search, Globe, Lock, Edit, Trash2, Clock, MessageCircle, Shield, Crown, Star, Check, Zap, Archive, Users } from "lucide-react";
import { useVideoLibrary } from "@/contexts/VideoLibraryContext";
import { EditVideoModal } from "@/components/EditVideoModal";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { value: "all", label: "All Messages", icon: Globe },
  { value: "wisdom", label: "Wisdom", icon: Heart },
  { value: "story", label: "Stories", icon: MessageCircle },
  { value: "love", label: "Love", icon: Heart },
  { value: "advice", label: "Advice", icon: Clock }
];

interface StoragePlan {
  id: string;
  name: string;
  price: number;
  isOneTime: boolean;
  storage: string;
  videos: number;
  features: string[];
  popular?: boolean;
  icon: any;
}

const storagePlans: StoragePlan[] = [
  {
    id: "basic",
    name: "Legacy Starter",
    price: 49,
    isOneTime: true,
    storage: "5 GB",
    videos: 10,
    features: [
      "Up to 10 video messages",
      "5 GB secure storage",
      "Basic delivery scheduling",
      "2 trusted contacts",
      "Email notifications"
    ],
    icon: Archive
  },
  {
    id: "premium",
    name: "Family Legacy",
    price: 149,
    isOneTime: true,
    storage: "25 GB",
    videos: 50,
    features: [
      "Up to 50 video messages",
      "25 GB secure storage",
      "Advanced scheduling options",
      "Unlimited trusted contacts",
      "Priority support",
      "Legacy website generation"
    ],
    popular: true,
    icon: Crown
  },
  {
    id: "unlimited",
    name: "Eternal Legacy",
    price: 299,
    isOneTime: true,
    storage: "Unlimited",
    videos: 999,
    features: [
      "Unlimited video messages",
      "Unlimited secure storage",
      "AI-assisted storytelling",
      "Custom legacy themes",
      "Family collaboration",
      "Generational access",
      "White-glove support"
    ],
    icon: Star
  }
];

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentUsage] = useState({
    videos: 3,
    storage: 1.2, // GB
    maxVideos: 5,
    maxStorage: 2 // GB for free tier
  });
  const { videos, updateVideo, deleteVideo } = useVideoLibrary();
  const { toast } = useToast();

  const storagePercentage = (currentUsage.storage / currentUsage.maxStorage) * 100;
  const videoPercentage = (currentUsage.videos / currentUsage.maxVideos) * 100;

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData?.icon || Heart;
  };

  const handleEditVideo = (videoId: string, updates: any) => {
    updateVideo(videoId, updates);
    toast({
      title: "Video Updated",
      description: "Your video settings have been saved.",
    });
  };

  const handleDeleteVideo = (videoId: string) => {
    deleteVideo(videoId);
    toast({
      title: "Video Deleted",
      description: "Your video has been removed from the library.",
    });
  };

  const editingVideoData = editingVideo ? videos.find(v => v.id === editingVideo) : null;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="container mx-auto px-4 py-8 max-w-sm">
        <div className="mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              My Library & Storage
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your saved video messages and secure storage vault
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="messages" className="space-y-8">
            <TabsList className="flex w-full">
              <TabsTrigger value="messages" className="flex-1">Messages</TabsTrigger>
              <TabsTrigger value="storage" className="flex-1">Storage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages" className="space-y-8">
              {/* ... keep existing code (filters and videos grid) */}
              {/* Filters */}
              <div>
                <Card className="shadow-card">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                      {/* Search */}
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search messages..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Category Filter */}
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => {
                          const IconComponent = category.icon;
                          return (
                            <Button
                              key={category.value}
                              variant={selectedCategory === category.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedCategory(category.value)}
                              className="flex items-center space-x-1"
                            >
                              <IconComponent className="w-4 h-4" />
                              <span>{category.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 gap-6">
                {filteredVideos.map((video) => {
                  const CategoryIcon = getCategoryIcon(video.category);
                  
                  return (
                    <Card key={video.id} className="shadow-card hover:shadow-gentle transition-all duration-300 group">
                      <CardContent className="p-0">
                        {/* ... keep existing code (video thumbnail and content) */}
                        {/* Video Thumbnail */}
                        <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                          <video
                            src={video.videoUrl}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="lg"
                              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                              onClick={() => {
                                const videoElement = document.createElement('video');
                                videoElement.src = video.videoUrl;
                                videoElement.controls = true;
                                videoElement.autoplay = true;
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4';
                                modal.onclick = () => modal.remove();
                                modal.appendChild(videoElement);
                                document.body.appendChild(modal);
                              }}
                            >
                              <Play className="w-6 h-6" />
                            </Button>
                          </div>
                          
                          {/* Duration Badge */}
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                            {video.duration}
                          </div>
                          
                          {/* Privacy Indicator */}
                          <div className="absolute top-2 right-2">
                            {video.isPublic ? (
                              <Globe className="w-4 h-4 text-white/70" />
                            ) : (
                              <Lock className="w-4 h-4 text-white/70" />
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="mb-2">
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {video.category}
                            </Badge>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingVideo(video.id)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVideo(video.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                            {video.title}
                          </h3>
                          
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {video.description}
                          </p>
                          
                          {video.prompt && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Original Prompt:</p>
                              <p className="text-xs text-muted-foreground italic line-clamp-2">
                                "{video.prompt}"
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Your Message</span>
                            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Empty State */}
              {filteredVideos.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No videos found</h3>
                  <p className="text-muted-foreground mb-6">
                    {videos.length === 0 
                      ? "Start by recording your first video message"
                      : "Try adjusting your search or filter criteria"
                    }
                  </p>
                  {videos.length === 0 ? (
                    <Button asChild>
                      <Link to="/record">Record Your First Message</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                    }}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="storage" className="space-y-8">
              {/* Current Usage */}
              <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Archive className="w-5 h-5 text-primary" />
                      <span>Storage Usage</span>
                    </CardTitle>
                    <CardDescription>
                      {currentUsage.storage.toFixed(1)} GB of {currentUsage.maxStorage} GB used
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={storagePercentage} className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {storagePercentage > 80 && "Consider upgrading for more storage space"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span>Video Messages</span>
                    </CardTitle>
                    <CardDescription>
                      {currentUsage.videos} of {currentUsage.maxVideos} messages created
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={videoPercentage} className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {videoPercentage > 80 && "You're close to your video limit"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Security Features */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Your Security & Privacy</span>
                  </CardTitle>
                  <CardDescription>
                    Military-grade protection for your most precious memories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">End-to-End Encryption</h4>
                        <p className="text-sm text-muted-foreground">
                          Your videos are encrypted before leaving your device
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center mt-1">
                        <Clock className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Permanent Storage</h4>
                        <p className="text-sm text-muted-foreground">
                          Your legacy is preserved forever, across generations
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary-glow/10 rounded-lg flex items-center justify-center mt-1">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Instant Access</h4>
                        <p className="text-sm text-muted-foreground">
                          Trusted contacts receive secure, immediate access
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Storage Plans */}
              <div>
                <h2 className="text-2xl font-bold text-foreground text-center mb-6">
                  Choose Your Legacy Storage Plan
                </h2>
                
                <div className="grid grid-cols-1 gap-6">
                  {storagePlans.map((plan) => {
                    const IconComponent = plan.icon;
                    return (
                      <Card 
                        key={plan.id} 
                        className={`shadow-card cursor-pointer transition-all duration-300 relative ${
                          selectedPlan === plan.id 
                            ? "ring-2 ring-primary shadow-gentle" 
                            : "hover:shadow-gentle"
                        } ${plan.popular ? "border-primary/50" : ""}`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-gradient-accent text-accent-foreground px-3 py-1">
                              Most Popular
                            </Badge>
                          </div>
                        )}
                        
                        <CardHeader className="text-center pb-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <IconComponent className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <div className="text-3xl font-bold text-foreground">
                            ${plan.price}
                            <span className="text-base font-normal text-muted-foreground ml-1">
                              one-time
                            </span>
                          </div>
                          <CardDescription className="text-sm">
                            {plan.storage} • Up to {plan.videos} videos
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                          <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start space-x-2 text-sm">
                                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <Button 
                            variant={selectedPlan === plan.id ? "default" : "outline"}
                            className="w-full"
                            size="lg"
                          >
                            {selectedPlan === plan.id ? "Selected" : "Choose Plan"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Purchase Flow */}
              {selectedPlan && (
                <Card className="shadow-card animate-gentle-scale">
                  <CardHeader>
                    <CardTitle className="text-center">Complete Your Purchase</CardTitle>
                    <CardDescription className="text-center">
                      Secure your legacy with one-time payment, lifetime access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="text-2xl font-bold text-foreground mb-2">
                        {storagePlans.find(p => p.id === selectedPlan)?.name}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        ${storagePlans.find(p => p.id === selectedPlan)?.price} - One-time payment
                      </div>
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button size="lg" variant="default" className="min-w-32">
                        Secure Payment
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => setSelectedPlan(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      30-day money-back guarantee • Secure payment processing
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Video Modal */}
      {editingVideoData && (
        <EditVideoModal
          isOpen={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          onSave={(updates) => handleEditVideo(editingVideo!, updates)}
          video={editingVideoData}
        />
      )}
    </div>
  );
}
