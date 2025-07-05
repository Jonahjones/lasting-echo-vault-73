import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-comfort">
      <div className="text-center space-y-6 px-4">
        <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-gentle animate-pulse">
          <span className="text-3xl font-serif text-primary-foreground">404</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-serif font-semibold text-foreground">Page Not Found</h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link 
          to={user ? "/" : "/auth"} 
          className="inline-flex items-center px-8 py-4 bg-gradient-primary text-primary-foreground font-medium rounded-xl shadow-gentle hover:shadow-warm transition-all duration-300 hover:scale-[1.02]"
        >
          {user ? "Return to Home" : "Go to Login"}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
