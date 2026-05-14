import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { LogOut, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { currentUser, logout, state } = useStore();
  const navigate = useNavigate();

  const cartCount = state?.cart ? Object.values(state.cart).reduce((a, b) => a + b, 0) : 0;

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Logo className="h-8 w-8 sm:h-10 sm:w-10" />
          <div className="min-w-0">
            <div className="font-display text-base sm:text-lg font-bold leading-none text-primary truncate">BENGRE FARM</div>
            <div className="text-[8px] sm:text-[10px] text-muted-foreground tracking-widest truncate">VIBES OF VILLAGE</div>
            <div className="text-[7px] sm:text-[8px] text-primary/60 font-semibold mt-0.5 hidden xs:block">FSSAI No. 30250711120704466</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {currentUser ? (
            <>
              <span className="hidden sm:inline text-muted-foreground">
                Hi, <span className="font-semibold text-foreground">{currentUser.name}</span>
                {currentUser.role !== "user" && (
                  <span className="ml-1 text-primary font-medium">({currentUser.role})</span>
                )}
              </span>
              {currentUser.role === "user" && (
                <Link to="/shop" className="relative">
                  <Button size="sm" variant="ghost" className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden xs:inline">Shop</span>
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-primary text-white">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}
              {currentUser.role === "admin" && (
                <Link to="/admin"><Button size="sm" variant="ghost">Dashboard</Button></Link>
              )}
              {currentUser.role === "delivery" && (
                <Link to="/delivery"><Button size="sm" variant="ghost">Deliveries</Button></Link>
              )}
              <Button size="sm" variant="outline" onClick={handleLogout} className="gap-1">
                <LogOut className="h-3.5 w-3.5" /> Logout
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link to="/login" className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">Login</Link>
              <Link to="/signup" className="px-4 py-1.5 text-sm font-bold bg-gradient-primary text-white rounded-md hover:opacity-90 transition-opacity shadow-sm">Sign Up</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
