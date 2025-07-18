import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const { login, signup, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Check for logout success flag
  useEffect(() => {
    const logoutSuccess = localStorage.getItem('logout_success');
    if (logoutSuccess === 'true') {
      toast({
        title: "Successfully logged out",
        description: "You've been logged out. See you again soon! 👋",
        duration: 4000,
      });
      // Clear the flag
      localStorage.removeItem('logout_success');
    }
  }, [toast]);

  // Redirect authenticated users - let Index.tsx handle profile completion
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
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
        // Navigation handled by Index.tsx based on profile completion status
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
        // Show resend verification option
        setShowResendVerification(true);
        // Navigation handled by Index.tsx - will show profile setup for new users
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to resend verification.",
        variant: "destructive",
      });
      return;
    }

    setIsResendingVerification(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Resend Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: `A new verification email has been sent to ${email}. Please check your inbox and spam folder.`,
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Resend Error",
        description: error.message || 'Failed to resend verification email.',
        variant: "destructive",
      });
    } finally {
      setIsResendingVerification(false);
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
                {isLogin ? t('auth.login.title') : t('auth.signup.title')}
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto font-light">
                {isLogin 
                  ? t('auth.login.subtitle')
                  : t('auth.signup.subtitle')
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
                {t('auth.login.googleLogin')}
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
                  className="w-full h-14 text-base bg-gradient-primary hover:shadow-gentle transition-all duration-300 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Please wait...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>{isLogin ? "Continue Your Journey" : "Begin Your Legacy"}</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Resend Verification Section */}
              {showResendVerification && !isLogin && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">
                        Didn't receive your verification email?
                      </h4>
                      <p className="text-xs text-blue-600 mb-3">
                        Check your spam folder, or we can send you a new verification email.
                      </p>
                      <Button
                        onClick={handleResendVerification}
                        disabled={isResendingVerification}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        {isResendingVerification ? (
                          <>
                            <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          'Resend Verification Email'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle between login and signup */}
              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setShowResendVerification(false); // Hide resend when switching modes
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  {isLogin 
                    ? "New here? Create your legacy account" 
                    : "Already preserving memories? Sign in"
                  }
                </button>
              </div>
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