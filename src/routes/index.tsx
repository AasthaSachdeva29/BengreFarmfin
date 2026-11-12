import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Header } from "@/components/Header";
import { useStore, type MenuItem } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, ShieldCheck, Clock, Leaf, Heart, MessageCircle, MapPin, ChevronRight, Smartphone } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Bengre Farm — Fresh Dairy Delivered" },
      { name: "description", content: "Bengre Farm delivers fresh dairy products from village to your door. Every product gives you the vibes of village." },
    ],
  }),
});

// ✅ "11:15" → "11:15 AM" / "13:00" → "1:00 PM"
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function HomePage() {
  const { currentUser, state } = useStore();
  const navigate = useNavigate();

  // ✅ Pull live settings from store
  const { routeCutoffTime } = state.settings;

  const groupedMenu = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    state.menu.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [state.menu]);

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
                      <Link to="/login" className="text-lg px-8 py-4 bg-gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-warm font-bold">
                        Login
                      </Link>
                      <Link to="/signup" className="text-lg px-8 py-4 border-2 border-primary/20 text-primary rounded-xl hover:bg-primary/5 transition-colors font-bold">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* ✅ Feature cards now use dynamic times */}
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                <FeatureCard icon={<Truck className="h-6 w-6" />}       title="0₹ Delivery"       desc="On our daily route (11:30 AM)"                              color="text-primary" />
                <FeatureCard icon={<Clock className="h-6 w-6" />}       title="Route Timing"      desc={`Orders close by ${formatTime(routeCutoffTime)}`}           color="text-amber-600" />
                <FeatureCard icon={<Smartphone className="h-6 w-6" />}  title="Personal Delivery" desc="Instant dispatch for min ₹180"                              color="text-emerald-600" />
                <FeatureCard icon={<ShieldCheck className="h-6 w-6" />} title="100% Pure"         desc="Direct from our own farm"                                   color="text-blue-600" />
                <FeatureCard icon={<Leaf className="h-6 w-6" />}        title="Farm Fresh"        desc="No preservatives, no chemicals"                             color="text-green-600" />
                <FeatureCard icon={<Heart className="h-6 w-6" />}       title="Traditional"       desc="Traditional methods, pure taste"                            color="text-rose-600" />
              </div>
            </div>
          </div>
        </section>

        {/* Vibes of Village */}
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
                          <img src={mainItem.imageUrl} alt={category} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
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
                          {items.map(i => <Badge key={i.id} variant="outline" className="bg-white/50">{i.unit}</Badge>)}
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-lg">{mainItem.description}</p>
                      <div className="pt-4">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary font-bold group gap-2"
                          onClick={() => navigate({ to: "/shop" })}
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
                    <MapPin className="h-4 w-4 opacity-50" /> {a.name}
                  </div>
                ))}
              </div>
              {/* ✅ Dynamic order cutoff time */}
              <div className="mt-8 pt-6 border-t text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Order by <strong>{formatTime(routeCutoffTime)}</strong> for same-day free delivery on this route.
                </p>
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
