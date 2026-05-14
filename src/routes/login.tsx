import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, currentUser } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (currentUser) {
      const dest = currentUser.role === "admin" ? "/admin" : currentUser.role === "delivery" ? "/delivery" : "/shop";
      navigate({ to: dest });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(`Welcome, ${r.user!.name}`);
    const dest = r.user!.role === "admin" ? "/admin" : r.user!.role === "delivery" ? "/delivery" : "/shop";
    navigate({ to: dest });
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
      <Toaster richColors />
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        {/* Logo */}
        <div className="text-center">
          <Logo className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold text-primary">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">Login to your Bengre Farm account</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-warm">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl">Login</CardTitle>
            <CardDescription>Enter your email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> Email
                </Label>
                <Input 
                  id="login-email"
                  type="email" 
                  placeholder="you@example.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" /> Password
                </Label>
                <Input 
                  id="login-password"
                  type="password" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base bg-gradient-primary hover:opacity-90" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Signup CTA */}
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
