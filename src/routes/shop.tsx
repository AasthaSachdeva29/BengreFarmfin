import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useStore, type OrderItem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { Plus, Minus, ShoppingCart, Package, Download, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  head: () => ({ meta: [{ title: "Shop — Bengre Farm" }] }),
});

// Formats "HH:MM" 24hr → "6:00 AM" / "11:15 AM" etc.
const fmt12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

function getRouteOrderStatus(settings: { orderStartTime: string; routeCutoffTime: string }): "before" | "open" | "closed" {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = settings.orderStartTime.split(":").map(Number);
  const [ch, cm] = settings.routeCutoffTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = ch * 60 + cm;

  if (total < start) return "before";
  if (total <= end) return "open";
  return "closed";
}

function ShopPage() {
  const { currentUser, state, setCartQty } = useStore();
  const navigate = useNavigate();
  const cart = state.cart || {};
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [routeStatus, setRouteStatus] = useState(() => getRouteOrderStatus(state.settings));

  // Re-check order status every minute using live settings
  useEffect(() => {
    setRouteStatus(getRouteOrderStatus(state.settings));
    const interval = setInterval(() => {
      setRouteStatus(getRouteOrderStatus(state.settings));
    }, 60_000);
    return () => clearInterval(interval);
  }, [state.settings]);

  // Redirect only if not logged in — currentUser is now available instantly from localStorage
  useEffect(() => {
    if (!currentUser) navigate({ to: "/login" });
    else if (currentUser.role !== "user") navigate({ to: currentUser.role === "admin" ? "/admin" : "/delivery" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "user") {
    return <div className="min-h-screen bg-gradient-warm"><Header /></div>;
  }

  const setQty = (id: string, q: number) => setCartQty(id, q);

  const items: OrderItem[] = Object.entries(cart).reduce((acc, [id, qty]) => {
    const m = state.menu.find((x) => x.id === id);
    if (m) acc.push({ menuId: id, name: m.name, price: m.price, qty });
    return acc;
  }, [] as OrderItem[]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const myOrders = state.orders.filter((o) => o.userId === currentUser.id).slice().reverse();

  const handleDownloadReceipt = (placedOrder: any) => {
    const content = `BENGRE FARM - ORDER RECEIPT
-----------------------------------
Order No: #${placedOrder.orderNo}
Date: ${placedOrder.dateKey}
Customer: ${placedOrder.userName}
Phone: ${placedOrder.phone}
Address: ${placedOrder.address}
Delivery: ${placedOrder.deliveryType.replace("_", " ")}
Payment: ${placedOrder.paymentMethod.toUpperCase()}

ITEMS:
${placedOrder.items.map((i: any) => `${i.name} x ${i.qty} = Rs.${i.price * i.qty}`).join("\n")}

-----------------------------------
Subtotal: Rs.${placedOrder.total}
Delivery: Rs.${placedOrder.deliveryCharge}
GRAND TOTAL: Rs.${placedOrder.grandTotal}
-----------------------------------
Thank you for ordering fresh from Bengre Farm!`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BengreFarm_Receipt_Order_${placedOrder.orderNo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-24">
      <Header />
      <Toaster richColors />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Shop</h1>
            <p className="text-sm text-muted-foreground">Fresh dairy from Bengre Farm</p>
          </div>
          {cartCount > 0 && (
            <Link to="/cart" className="hidden lg:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold shadow-md hover:bg-primary/90">
              <ShoppingCart className="h-5 w-5" /> View Cart ({cartCount})
            </Link>
          )}
        </div>

        {/* Order timing banner */}
        {activeTab === "menu" && (
          <>
            {routeStatus === "open" && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Orders open</strong> — accepting until <strong>{fmt12(state.settings.routeCutoffTime)}</strong>. Place your order now!
                </span>
              </div>
            )}
            {routeStatus === "before" && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Orders open at {fmt12(state.settings.orderStartTime)}.</strong> You can browse the menu and add items to cart now.
                </span>
              </div>
            )}
            {routeStatus === "closed" && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Orders closed</strong> for today (after {fmt12(state.settings.routeCutoffTime)}). Please come back tomorrow from {fmt12(state.settings.orderStartTime)}.
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 mb-6 border-b pb-3">
          <Button variant={activeTab === "menu" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("menu")}
            className={activeTab === "menu" ? "bg-gradient-primary" : ""}>
            <ShoppingCart className="h-4 w-4 mr-2" /> Menu {cartCount > 0 && `(${cartCount})`}
          </Button>
          <Button variant={activeTab === "orders" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("orders")}
            className={activeTab === "orders" ? "bg-gradient-primary" : ""}>
            <Package className="h-4 w-4 mr-2" /> My Orders
          </Button>
        </div>

        <div className="space-y-6">
          {activeTab === "menu" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Today's Menu</CardTitle>
                <CardDescription>Tap + / - to add items to cart</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {state.menu.map((m) => {
                  const isAvailable = m.available && m.count > 0;
                  const currentQty = cart[m.id] || 0;
                  return (
                    <div key={m.id}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all duration-200 ${
                        currentQty > 0 ? "border-primary/40 bg-primary/5 shadow-sm" : "hover:border-primary/20"
                      } ${!isAvailable ? "opacity-40 pointer-events-none" : ""}`}>
                      <div className="flex items-center gap-3">
                        {m.imageUrl && (
                          <div className="h-16 w-16 bg-white rounded-md overflow-hidden shrink-0 border shadow-sm">
                            <img src={m.imageUrl} alt={m.name} className="h-full w-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{m.name}</div>
                          <div className="text-xs text-primary font-bold">₹{m.price} <span className="text-xs text-muted-foreground font-normal">/ {m.unit}</span></div>
                          {m.description && <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{m.description}</div>}
                          {!isAvailable && <div className="text-xs text-destructive mt-1 font-semibold">{m.count <= 0 ? "Out of stock" : "Unavailable today"}</div>}
                          {isAvailable && m.count <= 5 && <div className="text-[10px] text-amber-600 font-semibold mt-1">Only {m.count} left!</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 ml-2 shrink-0">
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" disabled={!isAvailable || currentQty >= m.count} onClick={() => setQty(m.id, currentQty + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        {currentQty > 0 && (
                          <>
                            <span className="w-8 text-center text-sm font-bold">{currentQty}</span>
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" disabled={!isAvailable || !currentQty} onClick={() => setQty(m.id, currentQty - 1)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {activeTab === "orders" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display">My Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {myOrders.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No orders yet. Start shopping!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map((o) => (
                      <div key={`${o.dateKey}-${o.orderNo}`} className="border rounded-xl p-4 hover:shadow-sm transition-shadow space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div>
                            <div className="font-semibold text-lg">Order #{o.orderNo}</div>
                            <div className="text-xs text-muted-foreground">{o.dateKey}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display font-bold text-primary text-lg">₹{o.grandTotal}</div>
                            <Badge variant={o.status === "delivered" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}>
                              {o.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 pt-1 border-t">
                          <span className="bg-muted px-2 py-0.5 rounded-full capitalize">{o.deliveryType.replace("_", " ")}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-full uppercase">{o.paymentMethod}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-full">{o.address}</span>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs text-primary border-primary" onClick={() => handleDownloadReceipt(o)}>
                            <Download className="h-3 w-3 mr-1" /> Download Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {cartCount > 0 && activeTab === "menu" && (
          <div className="fixed bottom-6 left-4 right-4 z-50 lg:hidden animate-in slide-in-from-bottom-4 duration-300">
            <Link to="/cart" className="w-full h-14 bg-primary text-white shadow-2xl rounded-2xl flex items-center justify-between px-6 font-bold hover:bg-primary/90">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>View Cart ({cartCount})</span>
              </div>
              <div className="text-lg">₹{subtotal} &rarr;</div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
