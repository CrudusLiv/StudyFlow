import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export function AuthForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = isLogin ? "login" : "register";
      const payload = isLogin ? { email, password } : { email, password, name };
      const response = await axios.post(`http://localhost:5000/${endpoint}`, payload);
      localStorage.setItem("token", response.data.token);
      navigate("/");
    } catch (error: unknown) {
      console.error(`${isLogin ? "Login" : "Registration"} error:`, error);
      if (axios.isAxiosError(error) && error.response) {
        alert(error.response.data.error || "An error occurred");
      } else {
        alert("An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-none shadow-lg">
        <CardContent className="grid md:grid-cols-2">
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
                    <Input
                      id="password"
                      type="password"
                      placeholder={isLogin ? "Enter password" : "Create a strong password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-lg"
                      required
                    />
                  </div>
                </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-white hover:bg-gray-100 text-black border border-gray-200 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isLoading}
              >
                {isLoading 
                  ? (isLogin ? "Signing in..." : "Creating account...") 
                  : (isLogin ? "Sign in" : "Create account")}
              </Button>

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
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <AuthForm />
      </div>
    </div>
  );
}
