import { Button } from "@/components/ui/button";
import { Heart, Play, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

export function HeroSection() {
  return (
    <section className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-background/80"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen bg-gradient-subtle/50 flex items-center">
        <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Badge */}
          <div className="inline-flex items-center space-x-2 bg-primary-glow/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
            <Heart className="w-4 h-4" />
            <span>Preserve Your Legacy Forever</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Transform Your{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Final Words
            </span>{" "}
            Into Lasting Legacies
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in">
            A secure platform where meaningful video messages become enduring gifts of wisdom, 
            comfort, and connection for the people you love most.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-gentle-scale">
            <Button size="lg" variant="legacy" asChild>
              <Link to="/record" className="flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Create Your First Message</span>
              </Link>
            </Button>
            
            <Button size="lg" variant="gentle" asChild>
              <Link to="/library" className="flex items-center space-x-2">
                <Heart className="w-5 h-5" />
                <span>Explore Legacy Stories</span>
              </Link>
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-card hover:shadow-gentle transition-all duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Bank-Level Security</h3>
              <p className="text-sm text-muted-foreground">
                End-to-end encryption protects your most precious memories
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-card hover:shadow-gentle transition-all duration-300">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Trusted Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Designate loved ones to ensure your messages reach their destination
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-card hover:shadow-gentle transition-all duration-300">
              <div className="w-12 h-12 bg-primary-glow/10 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Forever Preserved</h3>
              <p className="text-sm text-muted-foreground">
                Your legacy lives on across generations with permanent storage
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}