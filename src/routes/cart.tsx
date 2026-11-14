import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useStore, istNow, slotAvailability, slotText, SLOT_INFO, type OrderItem, type PaymentMethod, type Slot } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Plus, Minus, Truck, CalendarDays, Sunrise, Sunset, CheckCircle2, Download, Loader2 } from "lucide-react";

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

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const prettyDate = (k: string) =>
  fromKey(k).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const MAX_DAYS_AHEAD = 14;

function CartPage() {
  const { currentUser, state, placeOrder, setCartQty, clearCart } = useStore();
  const navigate = useNavigate();
  const cart = state.cart || {};
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [slot, setSlot] = useState<Slot>("morning");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => fromKey(istNow().dateKey));
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [fullAddress, setFullAddress] = useState(currentUser?.address || "");
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [isPlacing, setIsPlacing] = useState(false);

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
    if (m) acc.push({ menuId: id, name: m.name, price: m.price, qty, count: m.count });
    return acc;
  }, [] as (OrderItem & { count: number })[]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const grandTotal = subtotal; // delivery is free

  const minDate = fromKey(istNow().dateKey);
  const maxDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() + MAX_DAYS_AHEAD);
  const dateKey = selectedDate ? toKey(selectedDate) : "";

  const getOrderValidation = () => {
    if (items.length === 0) return { ok: false, msg: "Cart is empty" };
    if (!dateKey) return { ok: false, msg: "Select a delivery date" };
    const a = slotAvailability(slot, dateKey);
    if (!a.ok) return { ok: false, msg: a.reason || "This slot is not available" };
    if (!selectedAreaId) return { ok: false, msg: "Select sector/area" };
    if (!fullAddress.trim()) return { ok: false, msg: "Enter full address" };
    return { ok: true, msg: "" };
  };

  const validation = getOrderValidation();

  const finalizeOrder = async (method: PaymentMethod) => {
    setIsPlacing(true);
    try {
      const r = await placeOrder(currentUser.id, items, method, slot, dateKey, fullAddress, selectedAreaId);
      if (!r.ok) {
        toast.error(r.error || "Failed to place order. Please contact support.");
        return;
      }
      clearCart();
      setPlacedOrder(r.order);
      toast.success(`Order #${r.order!.orderNo} placed! 🎉`);
    } catch (err: any) {
      toast.error("Something went wrong. Please contact support.");
    } finally {
      setIsPlacing(false);
    }
  };

  const handlePlace = async () => {
    const v = getOrderValidation();
    if (!v.ok) return toast.error(v.msg);

    if (paymentMethod === "gpay") {
      const res = await loadRazorpay();
      if (!res) return toast.error("Razorpay SDK failed to load. Are you online?");

      setIsPlacing(true);
      let orderId = "";
      try {
        const orderRes = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: grandTotal }),
        });
        const orderData = await orderRes.json();
        if (!orderData.ok) throw new Error(orderData.error || "Failed to create payment order");
        orderId = orderData.order.id;
      } catch (err: any) {
        setIsPlacing(false);
        return toast.error(err.message || "Could not setup payment");
      }
      setIsPlacing(false);

      const options = {
        key: RAZORPAY_KEY,
        amount: grandTotal * 100,
        currency: "INR",
        name: "Bengre Farm",
        description: "Fresh Dairy Delivery",
        order_id: orderId,
        handler: async function (_response: any) {
          await finalizeOrder("gpay");
        },
        modal: {
          ondismiss: function () {
            toast.error("Payment cancelled. Your order was not placed.");
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone,
        },
        theme: { color: "#059669" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      await finalizeOrder("cod");
    }
  };

  const handleDownloadReceipt = () => {
    if (!placedOrder) return;
    const content = `BENGRE FARM - ORDER RECEIPT
-----------------------------------
Order No: #${placedOrder.orderNo}
Delivery Date: ${placedOrder.dateKey}
Customer: ${placedOrder.userName}
Phone: ${placedOrder.phone}
Address: ${placedOrder.address}
Delivery: ${slotText(placedOrder.deliveryType)}
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
          <Card className="text-center py-10 shadow-warm animate-in fade-in duration-500">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-100 p-4">
                  <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                </div>
              </div>
              <div>
                <h2 className="font-display text-3xl font-bold text-emerald-700">Order Placed! 🎉</h2>
                <p className="text-muted-foreground mt-2">
                  {placedOrder.paymentMethod === "gpay"
                    ? "Payment successful! Your order has been confirmed."
                    : "Your order has been placed successfully!"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Our delivery partner will reach you in your chosen slot.</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-left space-y-3 max-w-sm mx-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Number</span>
                  <strong className="text-emerald-700">#{placedOrder.orderNo}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Date</span>
                  <strong>{prettyDate(placedOrder.dateKey)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Slot</span>
                  <strong>{slotText(placedOrder.deliveryType)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <strong>₹{placedOrder.grandTotal}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <strong className="uppercase">{placedOrder.paymentMethod === "gpay" ? "UPI / Online ✅" : "Cash on Delivery"}</strong>
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">Delivering to:</p>
                  <p className="text-sm font-medium">{placedOrder.address}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
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
                    <span className="text-emerald-600 font-bold">FREE</span>
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
                  <CalendarDays className="h-5 w-5" /> Delivery Date &amp; Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center rounded-xl border bg-white/60">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    defaultMonth={minDate}
                    disabled={[{ before: minDate }, { after: maxDate }]}
                  />
                </div>
                {dateKey && (
                  <p className="text-center text-sm font-semibold text-primary">Delivery on {prettyDate(dateKey)}</p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {(["morning", "evening"] as Slot[]).map((s) => {
                    const a = dateKey ? slotAvailability(s, dateKey) : { ok: true as boolean, reason: "" };
                    const active = slot === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!a.ok}
                        onClick={() => setSlot(s)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${active && a.ok ? "border-primary bg-primary/5 shadow-sm" : "border-muted"} ${!a.ok ? "cursor-not-allowed opacity-50" : "hover:border-primary/40"}`}
                      >
                        <div className="flex items-center gap-2 text-sm font-bold">
                          {s === "morning" ? <Sunrise className="h-4 w-4 text-amber-600" /> : <Sunset className="h-4 w-4 text-orange-600" />}
                          {SLOT_INFO[s].label}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-primary">{SLOT_INFO[s].time}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{a.ok ? SLOT_INFO[s].cutoff : a.reason}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">
                    ✓ No delivery charge <br />
                    ✓ No minimum order <br />
                    ✓ Pick any date up to {MAX_DAYS_AHEAD} days ahead — the order time limit applies only to that delivery day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Select Sector/Area</Label>
                  <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                    <SelectTrigger><SelectValue placeholder="Choose Area" /></SelectTrigger>
                    <SelectContent>
                      {state.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">House No / Landmark (Full Address)</Label>
                  <Input placeholder="e.g. H.No 123, Flat 4B..." value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
                </div>
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

                <Button
                  onClick={handlePlace}
                  disabled={!validation.ok || isPlacing}
                  className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 font-bold shadow-lg"
                >
                  {isPlacing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> Placing Order...
                    </span>
                  ) : (
                    `Place Order · ₹${grandTotal}`
                  )}
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
