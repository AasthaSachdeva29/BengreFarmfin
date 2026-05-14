import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Header } from "@/components/Header";
import { useStore, type MenuItem } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, ShieldCheck, Clock, Leaf, Heart, ShoppingCart, MessageCircle, MapPin, ChevronRight, Smartphone, Package, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Bengre Farm — Fresh Dairy Delivered" },
      { name: "description", content: "Bengre Farm delivers fresh dairy products from village to your door. Every product gives you the vibes of village." },
    ],
  }),
});

function HomePage() {
  const { currentUser, state, setCartQty } = useStore();
  const navigate = useNavigate();

  // Group menu by category
  const groupedMenu = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    state.menu.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [state.menu]);

  // Track selected variant ID for each category
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const getSelectedId = (category: string, items: MenuItem[]) =>
    selectedVariants[category] || items[0].id;

  const handleAddToCart = (category: string, items: MenuItem[]) => {
    const itemId = getSelectedId(category, items);
    const item = state.menu.find(m => m.id === itemId);
    if (!item) return;
    
    const currentQty = state.cart[itemId] || 0;
    if (currentQty >= item.count) {
      toast.error(`Only ${item.count} left in stock!`);
      return;
    }

    setCartQty(itemId, currentQty + 1);
    toast.success(`Added ${item.name} (${item.unit}) to cart`, {
      action: currentUser
        ? { label: "Checkout", onClick: () => navigate({ to: "/shop" }) }
        : { label: "Login to order", onClick: () => navigate({ to: "/login" }) },
    });
  };

  // NOT using useMemo — state.cart is mutated in place so reference never changes;
  // the store's tick mechanism re-renders the component, so plain computation is correct.
  const cartItems = Object.entries(state.cart)
    .map(([id, qty]) => ({ item: state.menu.find(m => m.id === id), qty }))
    .filter(i => i.item && i.qty > 0);

  const cartTotal = cartItems.reduce((acc, { item, qty }) => acc + (item?.price || 0) * qty, 0);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-gradient-primary opacity-[0.03] pointer-events-none" />
          <div className="container mx-auto px-4 py-16 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="flex items-center gap-5">
                  <Logo className="h-24 w-24 drop-shadow-lg" />
                  <div>
                    <h1 className="font-display text-5xl lg:text-6xl font-bold text-primary leading-tight">
                      Bengre Farm
                    </h1>
                    <p className="text-sm tracking-[0.3em] text-muted-foreground uppercase mt-1">
                      Every product gives you the vibes of village
                    </p>
                  </div>
                </div>
                <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                  Fresh, farm-to-door dairy. Cow milk, buffalo milk, curd, paneer & ghee — 
                  delivered every morning right to your doorstep.
                </p>
                <div className="flex flex-wrap gap-4">
                  {currentUser ? (
                    <Link 
                      to={currentUser.role === "admin" ? "/admin" : currentUser.role === "delivery" ? "/delivery" : "/shop"}
                      className="text-lg px-8 py-4 bg-gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-warm font-bold"
                    >
                      Go to {currentUser.role === "admin" ? "Dashboard" : currentUser.role === "delivery" ? "Deliveries" : "Shop"} →
                    </Link>
                  ) : (
                    <>
                      <Link 
                        to="/login" 
                        className="text-lg px-8 py-4 bg-gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-warm font-bold"
                      >
                        Login
                      </Link>
                      <Link 
                        to="/signup" 
                        className="text-lg px-8 py-4 border-2 border-primary/20 text-primary rounded-xl hover:bg-primary/5 transition-colors font-bold"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                <FeatureCard icon={<Truck className="h-6 w-6" />} title="0₹ Delivery" desc="On our daily route (11:30 AM)" color="text-primary" />
                <FeatureCard icon={<Clock className="h-6 w-6" />} title="Route Timing" desc="Orders close by 11:15 AM" color="text-amber-600" />
                <FeatureCard icon={<Smartphone className="h-6 w-6" />} title="Personal Delivery" desc="Instant dispatch for min ₹180" color="text-emerald-600" />
                <FeatureCard icon={<ShieldCheck className="h-6 w-6" />} title="100% Pure" desc="Direct from our own farm" color="text-blue-600" />
                <FeatureCard icon={<Leaf className="h-6 w-6" />} title="Farm Fresh" desc="No preservatives, no chemicals" color="text-green-600" />
                <FeatureCard icon={<Heart className="h-6 w-6" />} title="Traditional" desc="Traditional methods, pure taste" color="text-rose-600" />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Order Section */}
        <section id="quick-order" className="py-16 bg-white/50 border-b">
          <div className="container mx-auto px-4">
            <Toaster richColors />
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 py-1 px-3 border-primary/20 text-primary uppercase tracking-widest text-[10px]">Fresh Selection</Badge>
              <h2 className="font-display text-4xl font-bold text-foreground">Add to Cart</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                Quickly add your daily essentials with flexible size options.
              </p>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {/* Product Grid */}
              <div className="lg:col-span-2 xl:col-span-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(groupedMenu).map(([category, items]) => {
                  const selectedId = getSelectedId(category, items);
                  const selectedItem = items.find(i => i.id === selectedId) || items[0];
                  
                  return (
                    <Card key={category} className={`border-2 transition-colors shadow-sm bg-card ${selectedItem.count <= 0 ? "opacity-50 grayscale border-destructive/20" : "hover:border-primary/40"}`}>
                      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                        <div>
                          <h3 className="font-display font-bold text-lg mb-1">{category}</h3>
                          <div className="text-2xl font-display font-black text-primary">
                            ₹{selectedItem.price}
                          </div>
                          {selectedItem.count > 0 ? (
                            <div className="text-xs text-amber-600 font-semibold mt-1">{selectedItem.count} left in stock</div>
                          ) : (
                            <div className="text-xs text-destructive font-semibold mt-1">Out of stock</div>
                          )}
                        </div>

                        {items.length > 1 ? (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Select Size</label>
                            <Select
                              value={selectedId}
                              onValueChange={(val) => setSelectedVariants(prev => ({ ...prev, [category]: val }))}
                            >
                              <SelectTrigger className="h-10 w-full border-primary/10">
                                <SelectValue>
                                  <span>{selectedItem.unit} — ₹{selectedItem.price}</span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {items.map(item => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.unit} — ₹{item.price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="h-[58px] flex items-end">
                            <Badge variant="secondary" className="text-xs font-semibold">{selectedItem.unit}</Badge>
                          </div>
                        )}

                        <Button 
                          onClick={() => handleAddToCart(category, items)}
                          disabled={!selectedItem.available || selectedItem.count <= 0}
                          className="w-full bg-gradient-primary hover:opacity-90 gap-2 h-11 font-bold shadow-sm"
                        >
                          <ShoppingCart className="h-4 w-4" /> {selectedItem.count <= 0 ? "Out of Stock" : "Add to Cart"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Homepage Mini Cart */}
              <div className="lg:col-span-1" id="mini-cart">
                <Card className="border-2 border-primary/20 shadow-warm lg:sticky lg:top-24">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="h-5 w-5 text-primary" /> Your Cart
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {cartItems.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Your cart is empty.</p>
                      </div>
                    ) : (
                      <div className="divide-y max-h-[300px] overflow-auto">
                        {cartItems.map(({ item, qty }) => (
                          <div key={item!.id} className="p-3 flex items-center gap-2 bg-white/40">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{item!.name}</div>
                              <div className="text-xs text-muted-foreground">{item!.unit} · ₹{item!.price} × {qty}</div>
                            </div>
                            <div className="font-bold text-primary shrink-0">₹{item!.price * qty}</div>
                            <button
                              onClick={() => setCartQty(item!.id, 0)}
                              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                              aria-label="Remove item"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="p-4 bg-muted/30 border-t space-y-4">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total</span>
                        <span className="text-xl text-primary">₹{cartTotal}</span>
                      </div>

                      {!currentUser ? (
                        <div className="space-y-2 pt-2 border-t border-primary/10">
                          <p className="text-[10px] font-bold text-center text-primary uppercase tracking-wider">Login to Checkout</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" onClick={() => navigate({ to: "/login" })} className="bg-primary text-white">Login</Button>
                            <Button size="sm" onClick={() => navigate({ to: "/signup" })} variant="outline">Sign Up</Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => navigate({ to: "/shop" })}
                          disabled={cartItems.length === 0}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
                        >
                          Checkout Now →
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Explanation Showcase */}
        <section className="py-20 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="font-display text-4xl font-bold mb-4">Vibes of Village</h2>
              <div className="h-1 w-20 bg-primary mx-auto mb-6 rounded-full" />
              <p className="text-muted-foreground text-lg italic">
                "Each product carries the story of our farm and the traditional wisdom of our elders."
              </p>
            </div>

            <div className="grid gap-12 max-w-6xl mx-auto">
              {Object.entries(groupedMenu).map(([category, items], index) => {
                const mainItem = items[0];
                const isEven = index % 2 === 0;
                
                return (
                  <div key={category} className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 items-center animate-in fade-in duration-1000`}>
                    <div className="lg:w-1/2 group relative">
                      <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-xl group-hover:bg-primary/10 transition-all" />
                      <div className="relative aspect-video rounded-2xl overflow-hidden border-4 border-white shadow-2xl">
                        {mainItem.imageUrl ? (
                          <img 
                            src={mainItem.imageUrl} 
                            alt={category} 
                            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" 
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-7xl">
                            {category.includes("Milk") ? "🥛" : category.includes("Ghee") ? "🫕" : "🍶"}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="lg:w-1/2 space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-display text-3xl font-bold text-primary">{category}</h3>
                        <div className="flex gap-2 flex-wrap">
                          {items.map(i => (
                            <Badge key={i.id} variant="outline" className="bg-white/50">{i.unit}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-lg">
                        {mainItem.description}
                      </p>
                      <div className="pt-4">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary font-bold group gap-2"
                          onClick={() => {
                            const orderSection = document.getElementById('quick-order');
                            orderSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          Order {category} now <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Delivery Areas */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl lg:text-4xl font-bold">Daily Route Delivery</h2>
              <p className="text-muted-foreground mt-2">Zero delivery charge · 11:30 AM – 1:30 PM</p>
            </div>
            <div className="max-w-4xl mx-auto bg-card p-8 rounded-2xl border-2 border-primary/10 shadow-warm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm font-semibold">
                {state.areas.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-primary">
                    <MapPin className="h-4 w-4 opacity-50" />
                    {a.name}
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t text-center space-y-3">
                <p className="text-sm text-muted-foreground">Order by <strong>11:15 AM</strong> for same-day free delivery on this route.</p>
                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-bold ring-1 ring-amber-200">
                  <Truck className="h-4 w-4" /> Personal delivery available for all other Chandigarh areas (Min ₹180)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-card/80 border-t">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-3 items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Logo className="h-12 w-12" />
                  <div>
                    <h3 className="font-display font-bold text-xl text-primary">Bengre Farm</h3>
                    <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Vibes of Village</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  We bring the pure, unadulterated taste of the village to your city home. 
                  Freshness you can trust, quality you can taste.
                </p>
                <div className="pt-2">
                  <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/60">
                    FSSAI No. 30250711120704466
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-display font-bold text-lg">Contact Us</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <span>Shop no.3, Residence Complex,<br />Panjab University, Chandigarh</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">98886 06082 (WhatsApp)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-display font-bold text-lg">Quick Links</h4>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary justify-start" onClick={() => navigate({ to: "/login" })}>Customer Login</Button>
                  <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary justify-start" onClick={() => navigate({ to: "/signup" })}>Create Account</Button>
                  <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary justify-start" onClick={() => navigate({ to: "/shop" })}>View Menu</Button>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t text-center text-[10px] text-muted-foreground">
              <p>© {new Date().getFullYear()} Bengre Farm™ — All Rights Reserved.</p>
              <p className="mt-1 font-medium">Naturally Sourced • Traditionally Crafted • Freshly Delivered</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <Card className="hover:shadow-warm transition-all duration-300 hover:-translate-y-1">
      <CardContent className="pt-5 pb-4">
        <div className={`${color} mb-3`}>{icon}</div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      </CardContent>
    </Card>
  );
}
