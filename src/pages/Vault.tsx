import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown, Star, Check, Zap, Archive, Clock, Users } from "lucide-react";

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

export default function Vault() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentUsage] = useState({
    videos: 3,
    storage: 1.2, // GB
    maxVideos: 5,
    maxStorage: 2 // GB for free tier
  });

  const storagePercentage = (currentUsage.storage / currentUsage.maxStorage) * 100;
  const videoPercentage = (currentUsage.videos / currentUsage.maxVideos) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Secure Legacy Vault
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Protect your precious memories with bank-level security and permanent storage
            </p>
          </div>

          {/* Current Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
          <Card className="shadow-card mb-8">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground text-center mb-6">
              Choose Your Legacy Storage Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <Button size="lg" variant="legacy" className="min-w-32">
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
        </div>
      </div>
    </div>
  );
}