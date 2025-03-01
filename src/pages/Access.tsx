import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { GoogleLogin, googleLogout } from "@react-oauth/google";

// Interface for Google OAuth response
interface GoogleCredentialResponse {
  credential?: string;
}

export function AuthForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);  // Initially hidden
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);  // Initially hidden

  const navigate = useNavigate();

  // Password strength checker function
  const checkPasswordStrength = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[+=!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = 
      (hasUpperCase ? 1 : 0) +
      (hasLowerCase ? 1 : 0) +
      (hasNumbers ? 1 : 0) +
      (hasSpecialChar ? 1 : 0);

    return strength <= 2 ? 'weak' : strength === 3 ? 'medium' : 'strong';
  };
  
  // Form validation function
    const validateForm = () => {
      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        return false;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }
      if (!isLogin && !name.trim()) {
        setError('Please enter your name');
        return false;
      }
      if (!isLogin && password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      return true;
    };

  // Google authentication handler
  const handleGoogleAuth = async (credentialResponse: GoogleCredentialResponse) => {
    if (credentialResponse.credential === undefined) {
      setError("Google authentication failed. Please try again.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:5000/auth/google/callback', {
        credential: credentialResponse.credential
      });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        navigate("/");
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setError("Google authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/logout');
      localStorage.removeItem('token');
      googleLogout();
      navigate('/access');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setError(null);
    setIsLoading(true);
    try {
      const endpoint = isLogin ? "login" : "signup";
      const payload = isLogin 
        ? { email, password } 
        : { email, password, name, role: 'user' };

      const response = await axios.post(`http://localhost:5000/${endpoint}`, payload);
      localStorage.setItem("token", response.data.token);

      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setError(error.response.data.error || "Authentication failed");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Form toggle between login and signup
  const toggleForm = () => {
    // Resets form state when switching between login/signup
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError(null);
    setPasswordStrength(null);
  };


  return (
    <div className="h-screen w-screen overflow-auto bg-gray-50">
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-none shadow-lg">
         {/* Two-column layout */}
        <CardContent className="grid md:grid-cols-2">
           {/* Left column: Form */}
          <div className="relative p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
            <form className="relative space-y-6" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {isLogin ? "Welcome back" : "Join StudyFlow"}
                </h1>
                <p className="text-gray-500">
                  {isLogin ? "Login to your account" : "Create your account to get started"}
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              
              <div className="space-y-4 min-h-[280px]">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-lg"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-lg"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    {isLogin && (
                      <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                        Forgot password?
                      </a>
                    )}
                  </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Enter password" : "Create a strong password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (!isLogin) {
                        setPasswordStrength(checkPasswordStrength(e.target.value));
                      }
                    }}
                    className="h-11 rounded-lg pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 rounded-lg pr-10"
                        required
                      />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
                {!isLogin && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Password Strength:</span>
                      <span className={`text-sm ${
                        passwordStrength === 'weak' ? 'text-red-500' :
                        passwordStrength === 'medium' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                          passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                          'w-full bg-green-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              <Button 
                type="submit" 
                className={`w-full h-11 bg-white hover:bg-gray-100 text-black border border-gray-200 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >

                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  isLogin ? "Sign in" : "Create account"
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <GoogleLogin
                onSuccess={handleGoogleAuth}
                onError={() => setError("Google login failed")}
                auto_select={true}
              />

              <div className="text-center text-sm">
                <span className="text-gray-500">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                  type="button"
                  onClick={toggleForm}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </form>
          </div>

          <div className="hidden md:block bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white">
            <div className="h-full flex flex-col justify-center space-y-6">
              <h2 className="text-2xl font-bold">
                {isLogin ? "Welcome Back to StudyFlow" : "Start Your Learning Journey"}
              </h2>
              <ul className="space-y-4">
                <li className="flex items-center space-x-3">
                  <span>✓</span>
                  <span>{isLogin ? "Track your progress" : "Personalized study plans"}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span>✓</span>
                  <span>{isLogin ? "Access your materials" : "Progress tracking tools"}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span>✓</span>
                  <span>{isLogin ? "Connect with peers" : "Join study groups"}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="absolute top-4 right-4">
            <Button onClick={handleLogout} variant="ghost" size="sm">
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <AuthForm className="w-full max-w-4xl" />
    </div>
  );
}
