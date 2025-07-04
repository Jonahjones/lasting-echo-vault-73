import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { login, signup, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect authenticated users to home
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) {
      toast({
        title: "Error",
        description: "Google sign-in failed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords don't match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(email, password);
        if (!success) {
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive"
          });
          return;
        }
      } else {
        success = await signup(email, password);
        if (!success) {
          toast({
            title: "Signup Failed", 
            description: "Failed to create account. Please try again.",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "Account Created!",
          description: "Welcome to One Final Moment. Please check your email to verify your account.",
        });
      }

      if (success) {
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-comfort flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-gentle">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-light text-foreground">One Final Moment</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-lg">
          <Card className="shadow-comfort border-0 bg-card/80 backdrop-blur-sm">
            {/* Tab Navigation */}
            <div className="flex border-b border-border/50">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-5 px-8 text-center font-medium transition-all duration-300 ${
                  isLogin 
                    ? "text-primary border-b-2 border-primary bg-primary/8 font-serif" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                Welcome Back
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-5 px-8 text-center font-medium transition-all duration-300 ${
                  !isLogin 
                    ? "text-primary border-b-2 border-primary bg-primary/8 font-serif" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                Create Your Legacy
              </button>
            </div>
            
            <CardHeader className="text-center space-y-6 pb-8 pt-8">
              <CardTitle className="text-3xl font-serif font-light text-foreground leading-relaxed">
                {isLogin ? "Continue your journey" : "Create your lasting legacy"}
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto font-light">
                {isLogin 
                  ? "Welcome back to your sacred space of memories and meaningful connections"
                  : "Your words will safely comfort and inspire future generations. Begin preserving your most precious thoughts today."
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 px-8 pb-8">
              {/* Google SSO Button */}
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full h-16 text-base font-medium border-2 border-border/60 hover:border-primary/30 hover:bg-primary/5 shadow-gentle transition-all duration-300 hover:shadow-warm"
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/40"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-6 bg-card text-muted-foreground font-light">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Your Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 text-base border-border/60 focus:border-primary/50 focus:ring-primary/20 bg-background/50 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 h-14 text-base border-border/60 focus:border-primary/50 focus:ring-primary/20 bg-background/50 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password for Sign Up */}
                {!isLogin && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-12 h-14 text-base border-border/60 focus:border-primary/50 focus:ring-primary/20 bg-background/50 transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  type="submit"
                  size="lg" 
                  variant="legacy" 
                  className="w-full h-16 text-lg font-medium mt-8 shadow-gentle hover:shadow-warm transition-all duration-300 hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Please wait..."
                  ) : (
                    <>
                      {isLogin ? "Continue Your Journey" : "Begin Your Legacy"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer Message */}
          <div className="mt-10 text-center">
            <p className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto font-light">
              <span className="font-medium text-primary">Securely preserve your most precious words.</span> Your messages are encrypted and stored with the highest security standards. We're here to help you create lasting legacies with complete peace of mind.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}