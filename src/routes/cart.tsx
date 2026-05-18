import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useStore, type OrderItem, type PaymentMethod, type DeliveryType, ROUTE_CUTOFF_TIME, PERSONAL_MIN_ORDER, PERSONAL_DELIVERY_CHARGE } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Plus, Minus, Truck, Clock, Smartphone, CheckCircle2, Download } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart — Bengre Farm" }] }),
});

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || "rzp_test_placeholder";

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function CartPage() {
  const { currentUser, state, placeOrder, setCartQty, clearCart } = useStore();
  const navigate = useNavigate();
  const cart = state.cart || {};
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("daily_route");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [fullAddress, setFullAddress] = useState(currentUser?.address || "");
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      if (!currentUser) navigate({ to: "/login" });
      else if (currentUser.role !== "user") navigate({ to: currentUser.role === "admin" ? "/admin" : "/delivery" });
    }, 100);
    return () => clearTimeout(t);
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "user") {
    return <div className="min-h-screen bg-gradient-warm"><Header /></div>;
  }

  const setQty = (id: string, q: number) => setCartQty(id, q);

  const items: (OrderItem & { count: number })[] = Object.entries(cart).reduce((acc, [id, qty]) => {
    const m = state.menu.find((x) => x.id === id);
    if (m) {
      acc.push({ menuId: id, name: m.name, price: m.price, qty, count: m.count });
    }
    return acc;
  }, [] as (OrderItem & { count: number })[]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryCharge = deliveryType === "personal" ? PERSONAL_DELIVERY_CHARGE : 0;
  const grandTotal = subtotal + deliveryCharge;

  const getOrderValidation = () => {
    if (items.length === 0) return { ok: false, msg: "Cart is empty" };
    if (deliveryType === "daily_route") {
      if (!selectedAreaId) return { ok: false, msg: "Select sector/area" };
      if (!fullAddress.trim()) return { ok: false, msg: "Enter full address" };
      
      const [hh, mm] = ROUTE_CUTOFF_TIME.split(":").map(Number);
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(hh, mm, 0, 0);
      if (now > cutoff) return { ok: false, msg: "Daily Route closed (after 11:15 AM). Use Personal Delivery." };
    } else {
      if (subtotal < PERSONAL_MIN_ORDER) return { ok: false, msg: `Min order ₹${PERSONAL_MIN_ORDER} for Personal` };
      if (!fullAddress.trim()) return { ok: false, msg: "Enter delivery address" };
    }
    return { ok: true, msg: "" };
  };

  const validation = getOrderValidation();

  const handlePlace = async () => {
    const v = getOrderValidation();
    if (!v.ok) return toast.error(v.msg);

    if (paymentMethod === "gpay") {
      const res = await loadRazorpay();
      if (!res) return toast.error("Razorpay SDK failed to load. Are you online?");

      toast.loading("Setting up secure payment...");
      let orderId = "";
      try {
        const orderRes = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: grandTotal }),
        });
        const orderData = await orderRes.json();
        toast.dismiss();
        if (!orderData.ok) throw new Error(orderData.error || "Failed to create order");
        orderId = orderData.order.id;
      } catch (err: any) {
        toast.dismiss();
        return toast.error(err.message || "Could not setup payment");
      }

      const options = {
        key: RAZORPAY_KEY,
        amount: grandTotal * 100,
        currency: "INR",
        name: "Bengre Farm",
        description: "Fresh Dairy Delivery",
        order_id: orderId,
        // ✅ FIX 1: handler marked async so we can await placeOrder
        handler: async function (response: any) {
          const r = await placeOrder(currentUser.id, items, paymentMethod, deliveryType, fullAddress, selectedAreaId);
          if (!r.ok) return toast.error(r.error || "Failed to place order");
          setPlacedOrder(r.order);
          toast.success(`Order #${r.order!.orderNo} placed successfully! 🎉`);
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone,
        },
        theme: {
          color: "#059669",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      // ✅ FIX 2: await placeOrder for COD
      const r = await placeOrder(currentUser.id, items, paymentMethod, deliveryType, fullAddress, selectedAreaId);
      if (!r.ok) return toast.error(r.error || "Failed to place order");
      setPlacedOrder(r.order);
      toast.success(`Order #${r.order!.orderNo} placed! 🎉`);
    }
  };

  const handleDownloadReceipt = () => {
    if (!placedOrder) return;
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
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      <Toaster richColors />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {placedOrder ? (
          <Card className="text-center py-10 shadow-warm">
            <CardContent className="space-y-6">
              <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
              <h2 className="font-display text-3xl font-bold text-emerald-700">Order Placed!</h2>
              <p className="text-muted-foreground">Your order #{placedOrder.orderNo} has been successfully placed. Our delivery partner will reach you soon.</p>
              
              <div className="bg-muted p-4 rounded-xl text-left space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-sm"><span>Order Number:</span> <strong>#{placedOrder.orderNo}</strong></div>
                <div className="flex justify-between text-sm"><span>Amount Paid:</span> <strong>₹{placedOrder.grandTotal}</strong></div>
                <div className="flex justify-between text-sm"><span>Payment Mode:</span> <strong className="uppercase">{placedOrder.paymentMethod}</strong></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button onClick={handleDownloadReceipt} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                  <Download className="h-4 w-4 mr-2" /> Download Receipt
                </Button>
                <Link to="/shop" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue Shopping
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="text-center py-16 shadow-warm">
            <CardContent>
              <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h2 className="text-2xl font-display font-bold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Looks like you haven't added any fresh dairy items yet.</p>
              <Link to="/shop" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Browse Menu
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="mb-2">
              <h1 className="font-display text-2xl font-bold">Checkout</h1>
              <p className="text-sm text-muted-foreground">Review your items and complete order</p>
            </div>

            <Card className="shadow-warm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-3">
                  {items.map(i => (
                    <div key={i.menuId} className="flex items-center justify-between text-sm">
                      <div className="flex-1 pr-2 truncate font-medium">
                        <span>{i.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-muted rounded-md px-1 py-1">
                          <button onClick={() => setQty(i.menuId, i.qty - 1)} className="p-1 hover:text-primary"><Minus className="h-3 w-3" /></button>
                          <span className="w-6 text-center font-bold text-xs">{i.qty}</span>
                          <button onClick={() => setQty(i.menuId, i.qty + 1)} disabled={i.qty >= i.count} className={`p-1 ${i.qty >= i.count ? "opacity-30 cursor-not-allowed" : "hover:text-primary"}`}><Plus className="h-3 w-3" /></button>
                        </div>
                        <span className="w-14 text-right font-bold text-primary">₹{i.price * i.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span className={deliveryCharge === 0 ? "text-emerald-600 font-bold" : ""}>
                      {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-display font-bold border-t pt-3">
                    <span>Total</span><span className="text-primary">₹{grandTotal}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-warm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" /> Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex p-1 bg-muted rounded-lg">
                  <button onClick={() => setDeliveryType("daily_route")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${deliveryType === "daily_route" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}>
                    Daily Route
                  </button>
                  <button onClick={() => setDeliveryType("personal")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${deliveryType === "personal" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}>
                    Personal Delivery
                  </button>
                </div>

                {deliveryType === "daily_route" ? (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-bold text-primary flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Route Delivery (11:30 AM - 1:30 PM)
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        ✓ No delivery charge <br />
                        ✓ No minimum order <br />
                        ✓ <strong>Accepting until 11:15 AM</strong>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Select Sector/Area</Label>
                      <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                        <SelectTrigger><SelectValue placeholder="Chose Area" /></SelectTrigger>
                        <SelectContent>
                          {state.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">House No / Landmark (Full Address)</Label>
                      <Input placeholder="e.g. H.No 123, Flat 4B..." value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-bold text-amber-700 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" /> Personal / Instant Delivery
                      </div>
                      <p className="text-[10px] text-amber-600">
                        • Delivery Charge: <strong>₹{PERSONAL_DELIVERY_CHARGE}</strong> <br />
                        • Minimum Order: <strong>₹{PERSONAL_MIN_ORDER}</strong> <br />
                        • Order anytime, no location restriction.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Full Delivery Address</Label>
                      <Input placeholder="Enter your complete address..." value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-warm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 p-1 bg-muted rounded-md mb-2">
                  <button onClick={() => setPaymentMethod("cod")} className={`flex-1 py-3 text-sm font-bold rounded ${paymentMethod === "cod" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}>Cash on Delivery</button>
                  <button onClick={() => setPaymentMethod("gpay")} className={`flex-1 py-3 text-sm font-bold rounded ${paymentMethod === "gpay" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}>UPI / Online</button>
                </div>
                
                <Button onClick={handlePlace} disabled={!validation.ok} className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 font-bold shadow-lg">
                  Place Order · ₹{grandTotal}
                </Button>
                {!validation.ok && items.length > 0 && (
                  <p className="text-xs text-center text-destructive bg-destructive/5 p-2 rounded-md animate-pulse">{validation.msg}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
