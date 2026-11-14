import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { useStore, slotText } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MapPin, Phone, Package, CheckCircle, Truck, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/delivery")({
  component: DeliveryPage,
  head: () => ({ meta: [{ title: "Delivery — Bengre Farm" }] }),
});

const SLOT_GROUPS = ["morning", "evening", "daily_route", "personal"] as const;

function DeliveryPage() {
  const { currentUser, state, setOrderStatus, todayKey } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.role !== "delivery") navigate({ to: "/" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "delivery") {
    return <div className="min-h-screen bg-gradient-warm"><Header /></div>;
  }

  const today = todayKey();
  // dateKey is the delivery date, so this is everything that must be delivered today
  const todayOrders = state.orders.filter((o) => o.dateKey === today).sort((a, b) => a.orderNo - b.orderNo);
  const pending = todayOrders.filter((o) => o.status === "pending" || o.status === "out_for_delivery");
  const done = todayOrders.filter((o) => o.status === "delivered");
  const totalEarnings = done.reduce((s, o) => s + (o.grandTotal || o.total), 0);

  const markDelivered = (dateKey: string, orderNo: number) => {
    setOrderStatus(dateKey, orderNo, "delivered");
    toast.success(`Order #${orderNo} delivered! ✅`);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      <Toaster richColors />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Delivery Route</h1>
          <p className="text-sm text-muted-foreground">Today: {today}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-amber-50 text-amber-600 mb-2">
                <Truck className="h-5 w-5" />
              </div>
              <div className="text-2xl font-display font-bold">{pending.length}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 mb-2">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="text-2xl font-display font-bold">{done.length}</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary mb-2">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div className="text-2xl font-display font-bold">₹{totalEarnings}</div>
              <div className="text-xs text-muted-foreground">Collected</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Pending Deliveries
            </CardTitle>
            <CardDescription>
              {pending.length === 0 ? "All caught up! 🎉" : `${pending.length} orders to deliver`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle className="h-16 w-16 mx-auto mb-3 text-emerald-400 opacity-50" />
                <p className="font-semibold text-lg">All deliveries done!</p>
                <p className="text-sm">Check back later for new orders</p>
              </div>
            )}

            {SLOT_GROUPS.map((slotKey) => {
              const inSlot = pending.filter((o) => o.deliveryType === slotKey);
              if (inSlot.length === 0) return null;
              const byArea = inSlot.reduce((acc, order) => {
                const area = order.deliveryAreaName || "Unassigned";
                if (!acc[area]) acc[area] = [];
                acc[area].push(order);
                return acc;
              }, {} as Record<string, typeof inSlot>);

              return (
                <div key={slotKey} className="space-y-4">
                  <div className="rounded-xl bg-primary/10 px-4 py-2 font-display text-lg font-bold text-primary">
                    {slotText(slotKey)} <span className="text-sm font-normal text-muted-foreground">({inSlot.length})</span>
                  </div>
                  {Object.entries(byArea).map(([area, orders]) => (
                    <div key={area} className="space-y-4">
                      <h3 className="font-display text-xl font-bold border-b-2 border-primary/20 pb-2 text-primary">{area} <span className="text-muted-foreground text-sm font-normal">({orders.length})</span></h3>
                      {orders.map((o) => (
                        <div key={o.orderNo} className="border-2 border-primary/20 rounded-2xl p-5 space-y-4 bg-card hover:shadow-warm transition-shadow">
                          {/* Order Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-display text-3xl font-bold text-primary">#{o.orderNo}</div>
                              <div className="font-semibold text-lg mt-1">{o.userName}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant={o.status === "out_for_delivery" ? "default" : "secondary"}
                                className={o.status === "out_for_delivery" ? "bg-amber-500" : ""}
                              >
                                {o.status.replace("_", " ")}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{slotText(o.deliveryType)}</span>
                            </div>
                          </div>

                          {/* Address & Phone */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-3 bg-muted rounded-xl p-3">
                              <MapPin className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                              <div>
                                <div className="text-xs text-muted-foreground font-medium uppercase">Delivery Address</div>
                                <div className="font-medium">{o.address}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 bg-muted rounded-xl p-3">
                              <Phone className="h-5 w-5 text-primary shrink-0" />
                              <div>
                                <div className="text-xs text-muted-foreground font-medium uppercase">Phone</div>
                                <a href={`tel:${o.phone}`} className="font-medium text-primary underline text-lg">{o.phone}</a>
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="rounded-xl bg-muted/50 border p-4">
                            <div className="text-xs text-muted-foreground font-medium uppercase mb-2">Order Items</div>
                            <div className="space-y-1">
                              {o.items.map((i) => (
                                <div key={i.menuId} className="flex justify-between text-sm">
                                  <span>
                                    <span className="mr-2">
                                      {i.name.includes("Cow") ? "🥛" :
                                       i.name.includes("Buffalo") ? "🐃" :
                                       i.name.includes("Curd") ? "🍶" :
                                       i.name.includes("Paneer") ? "🧀" :
                                       i.name.includes("Ghee") ? "🫕" : "•"}
                                    </span>
                                    {i.name} × {i.qty}
                                  </span>
                                  <span className="font-medium">₹{i.price * i.qty}</span>
                                </div>
                              ))}
                            </div>
                            {o.deliveryCharge > 0 && (
                              <div className="flex justify-between border-t border-muted-foreground/20 pt-2 mt-2 text-sm text-amber-700 font-medium">
                                <span>Delivery Charge</span>
                                <span>₹{o.deliveryCharge}</span>
                              </div>
                            )}
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex justify-between font-display font-bold text-xl">
                                <span>Total</span>
                                <span className="text-primary">₹{o.grandTotal || o.total}</span>
                              </div>
                              {o.paymentMethod === "cod" ? (
                                <div className="mt-2 text-center bg-amber-100 text-amber-800 p-2 rounded-lg font-bold text-sm">
                                  💵 COLLECT CASH: ₹{o.grandTotal || o.total}
                                </div>
                              ) : (
                                <div className="mt-2 text-center bg-emerald-100 text-emerald-800 p-2 rounded-lg font-bold text-sm">
                                  ✓ PAID VIA {o.paymentMethod === "gpay" ? "GPAY" : "WALLET"} (Do not collect cash)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <Button
                            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => markDelivered(o.dateKey, o.orderNo)}
                          >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {o.paymentMethod === "cod" ? "Cash Collected & Delivered" : "Mark as Delivered"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Delivered Today — order number and customer phone stay visible */}
        {done.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" /> Delivered Today ({done.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {done.map((o) => (
                <div key={o.orderNo} className="flex justify-between items-start gap-3 border rounded-xl p-3 bg-emerald-50/40">
                  <div className="space-y-1">
                    <div className="font-semibold">#{o.orderNo} · {o.userName}</div>
                    <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline">
                      <Phone className="h-3.5 w-3.5" /> {o.phone}
                    </a>
                    <div className="text-xs text-muted-foreground">{o.address}</div>
                    <div className="text-xs text-muted-foreground">{o.items.map(i => `${i.name}×${i.qty}`).join(", ")}</div>
                    <div className="text-[10px] text-muted-foreground">{slotText(o.deliveryType)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">₹{o.grandTotal || o.total}</div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Delivered</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
