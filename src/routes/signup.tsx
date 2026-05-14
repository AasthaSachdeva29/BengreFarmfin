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
import { ArrowLeft, User, Mail, Lock, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { signup, currentUser } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (currentUser) {
      navigate({ to: "/shop" });
    }
  }, [currentUser, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.phone || !form.address) {
      return toast.error("Please fill all fields");
    }
    setLoading(true);
    const r = await signup(form);
    setLoading(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Account created! Welcome to Bengre Farm");
    navigate({ to: "/shop" });
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4 py-8">
      <Toaster richColors />
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        {/* Logo */}
        <div className="text-center">
          <Logo className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold text-primary">Join Bengre Farm</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your account to start ordering</p>
        </div>

        {/* Signup Card */}
        <Card className="shadow-warm">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl">Sign Up</CardTitle>
            <CardDescription>Fill in your details below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" /> Name
                  </Label>
                  <Input 
                    id="signup-name"
                    placeholder="Your name"
                    value={form.name} 
                    onChange={(e) => set("name", e.target.value)} 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" /> Phone
                  </Label>
                  <Input 
                    id="signup-phone"
                    placeholder="9876543210"
                    value={form.phone} 
                    onChange={(e) => set("phone", e.target.value)} 
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> Email
                </Label>
                <Input 
                  id="signup-email"
                  type="email" 
                  placeholder="you@example.com"
                  value={form.email} 
                  onChange={(e) => set("email", e.target.value)} 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" /> Password
                </Label>
                <Input 
                  id="signup-password"
                  type="password" 
                  placeholder="Min 6 characters"
                  value={form.password} 
                  onChange={(e) => set("password", e.target.value)} 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Delivery Address
                </Label>
                <Input 
                  id="signup-address"
                  placeholder="House no, street, area, pincode"
                  value={form.address} 
                  onChange={(e) => set("address", e.target.value)} 
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base bg-gradient-primary hover:opacity-90" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login CTA */}
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
