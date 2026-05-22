import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { useStore, type AppSettings } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Trash2, Package, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, IndianRupee, Download, Bell, BellOff } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Bengre Farm" }] }),
});

// ✅ CSV download helper
function downloadOrdersCSV(orders: any[], filename: string) {
  if (orders.length === 0) {
    toast.error("No orders to download.");
    return;
  }

  const headers = [
    "Order No", "Date", "Customer Name", "Phone", "Address",
    "Delivery Type", "Delivery Area", "Payment Method",
    "Items", "Subtotal (₹)", "Delivery Charge (₹)", "Grand Total (₹)", "Status"
  ];

  const rows = orders.map(o => [
    o.orderNo,
    o.dateKey,
    o.userName,
    o.phone,
    `"${(o.address || "").replace(/"/g, '""')}"`,
    o.deliveryType.replace("_", " "),
    o.deliveryAreaName || "—",
    o.paymentMethod.toUpperCase(),
    `"${o.items.map((i: any) => `${i.name} x${i.qty}`).join(", ")}"`,
    o.total,
    o.deliveryCharge,
    o.grandTotal ?? o.total,
    o.status.replace("_", " ")
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
}

// ─────────────────────────────────────────────
// 🔔 AUDIO — single shared AudioContext
// Browsers suspend audio until the user interacts.
// We create ONE context and keep it alive, unlocking
// it on the first click/tap anywhere on the page.
// ─────────────────────────────────────────────
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
}

// Call once on any user interaction to unlock audio
function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch (e) {
    // ignore
  }
}

// Play a bright C5→E5→G5→C6 chime
function playOrderChime() {
  try {
    const ctx = getAudioContext();

    const playNotes = () => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;

        const startAt = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(0.3, startAt + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.8);

        osc.start(startAt);
        osc.stop(startAt + 0.8);
      });
    };

    // If still suspended (shouldn't happen after unlock, but just in case)
    if (ctx.state === "suspended") {
      ctx.resume().then(playNotes);
    } else {
      playNotes();
    }
  } catch (e) {
    console.warn("Audio playback failed", e);
  }
}

// ─────────────────────────────────────────────
// 🔔 BROWSER PUSH NOTIFICATIONS
// ─────────────────────────────────────────────
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        toast.success("🔔 Browser notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Browser notifications blocked. Enable them in browser settings.");
      }
    });
  }
}

// Works even when the tab is in the background
function showBrowserNotification(count: number, orderNos: number[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const orderList = orderNos.slice(0, 3).map(n => `#${n}`).join(", ");
  const extra = orderNos.length > 3 ? ` +${orderNos.length - 3} more` : "";

  new Notification("🛒 New Order — Bengre Farm", {
    body: `${count} new order${count > 1 ? "s" : ""} received! (${orderList}${extra})`,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "new-order",        // replaces previous instead of stacking
    requireInteraction: true, // stays until admin dismisses it
  });
}

// ─────────────────────────────────────────────
// 🏠 ADMIN PAGE
// ─────────────────────────────────────────────
function AdminPage() {
  const { currentUser, state, addMenuItem, updateMenuItem, removeMenuItem, setOrderStatus, todayKey, addArea, removeArea, updateSettings } = useStore();
  const navigate = useNavigate();
  const [newItem, setNewItem] = useState({ name: "", price: 0, unit: "litre", category: "", description: "", available: true, count: 0 });
  const [newArea, setNewArea] = useState({ name: "" });
  const [activeSection, setActiveSection] = useState<"orders" | "menu" | "areas" | "timings" | "history">("orders");

  // 🔔 Notification state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Redirect non-admins
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") navigate({ to: "/" });
  }, [currentUser, navigate]);

  // ✅ FIX: Unlock audio on ANY click or touch on the page
  // This is the key fix — browsers require a user gesture before audio plays.
  // We attach this listener once when the admin page mounts.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // 🔔 Ask for browser notification permission when admin logs in
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
      setTimeout(() => {
        if ("Notification" in window) setNotifPermission(Notification.permission);
      }, 1500);
    }
  }, [currentUser]);

  // 🔔 Watch for new orders — chime + toast + browser notification
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;

    const today = todayKey();
    const todayOrders = state.orders.filter(o => o.dateKey === today);

    if (isFirstLoadRef.current) {
      // On first load, record existing IDs silently — don't alert
      todayOrders.forEach(o => knownOrderIdsRef.current.add(`${o.dateKey}-${o.orderNo}`));
      isFirstLoadRef.current = false;
      return;
    }

    // Detect genuinely new orders
    const newOrderNos: number[] = [];
    todayOrders.forEach(o => {
      const key = `${o.dateKey}-${o.orderNo}`;
      if (!knownOrderIdsRef.current.has(key)) {
        knownOrderIdsRef.current.add(key);
        newOrderNos.push(o.orderNo);
      }
    });

    if (newOrderNos.length > 0) {
      // ✅ Play chime (will work because audio is unlocked on first interaction)
      if (soundEnabled) {
        playOrderChime();
      }

      // ✅ In-app toast with order numbers
      toast.success(
        `🛒 ${newOrderNos.length} new order${newOrderNos.length > 1 ? "s" : ""} received! (${newOrderNos.map(n => `#${n}`).join(", ")})`,
        { duration: 6000 }
      );

      // ✅ OS-level browser notification (works in background tab)
      showBrowserNotification(newOrderNos.length, newOrderNos);
    }
  }, [state.orders, soundEnabled, currentUser]);

  if (!currentUser || currentUser.role !== "admin") {
    return <div className="min-h-screen bg-gradient-warm"><Header /></div>;
  }

  const today = todayKey();
  const todayOrders = state.orders.filter((o) => o.dateKey === today).sort((a, b) => a.orderNo - b.orderNo);
  const allOrders = state.orders.slice().reverse();

  const pendingOrders = todayOrders.filter((o) => o.status === "pending");
  const outForDelivery = todayOrders.filter((o) => o.status === "out_for_delivery");
  const deliveredOrders = todayOrders.filter((o) => o.status === "delivered");
  const cancelledOrders = todayOrders.filter((o) => o.status === "cancelled");
  const pendingRevenue = [...pendingOrders, ...outForDelivery].reduce((s, o) => s + (o.grandTotal || o.total), 0);
  const todayRevenue = deliveredOrders.reduce((s, o) => s + (o.grandTotal || o.total), 0);

  const addItem = () => {
    if (!newItem.name || newItem.price <= 0 || !newItem.category) return toast.error("Enter name, price and category");
    addMenuItem(newItem);
    setNewItem({ name: "", price: 0, unit: "litre", category: "", description: "", available: true, count: 0 });
    toast.success("Item added");
  };

  const handleNotifToggle = () => {
    if (!("Notification" in window)) {
      toast.error("Your browser doesn't support notifications.");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error("Notifications are blocked. Click the 🔒 lock icon in your browser address bar to enable them.");
      return;
    }
    if (Notification.permission === "default") {
      requestNotificationPermission();
      setTimeout(() => setNotifPermission(Notification.permission), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      <Toaster richColors />
      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Today: {today}</p>
          </div>

          {/* 🔔 Notification controls */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Browser push notification button */}
            {"Notification" in window && (
              <button
                onClick={handleNotifToggle}
                title={
                  notifPermission === "granted"
                    ? "Browser notifications are ON"
                    : notifPermission === "denied"
                    ? "Notifications blocked — enable in browser settings"
                    : "Click to enable browser notifications"
                }
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  notifPermission === "granted"
                    ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : notifPermission === "denied"
                    ? "border-red-200 bg-red-50 text-red-600 cursor-not-allowed"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {notifPermission === "granted" ? (
                  <><Bell className="h-4 w-4" /><span className="hidden sm:inline">Notif. On</span></>
                ) : notifPermission === "denied" ? (
                  <><BellOff className="h-4 w-4" /><span className="hidden sm:inline">Notif. Blocked</span></>
                ) : (
                  <><Bell className="h-4 w-4 animate-bounce" /><span className="hidden sm:inline">Enable Notifs</span></>
                )}
              </button>
            )}

            {/* ✅ Sound toggle — also unlocks audio on click */}
            <button
              onClick={() => {
                unlockAudio(); // unlock on this interaction
                setSoundEnabled(v => !v);
                toast(soundEnabled ? "🔕 Order sound muted" : "🔔 Order sound enabled");
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                soundEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {soundEnabled ? "Sound On" : "Sound Off"}
            </button>
          </div>
        </div>

        {/* Banner: ask for notification permission if not yet answered */}
        {"Notification" in window && notifPermission === "default" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Bell className="h-4 w-4 shrink-0 animate-bounce" />
              <p className="text-sm font-medium">
                Enable browser notifications to get alerts even when this tab is in the background.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                requestNotificationPermission();
                setTimeout(() => {
                  if ("Notification" in window) setNotifPermission(Notification.permission);
                }, 1500);
              }}
            >
              Enable
            </Button>
          </div>
        )}

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <AnalyticCard icon={<Package className="h-5 w-5" />}     label="Total Orders"  value={todayOrders.length}                          color="text-primary"     bg="bg-primary/10" />
          <AnalyticCard icon={<Clock className="h-5 w-5" />}       label="Pending"       value={pendingOrders.length + outForDelivery.length} color="text-amber-600"   bg="bg-amber-50" />
          <AnalyticCard icon={<CheckCircle className="h-5 w-5" />} label="Delivered"     value={deliveredOrders.length}                       color="text-emerald-600" bg="bg-emerald-50" />
          <AnalyticCard icon={<IndianRupee className="h-5 w-5" />} label="Revenue"       value={`₹${todayRevenue}`}                           color="text-primary"     bg="bg-primary/10" />
          <AnalyticCard icon={<TrendingUp className="h-5 w-5" />}  label="Pending Rev."  value={`₹${pendingRevenue}`}                         color="text-amber-600"   bg="bg-amber-50" />
        </div>

        {/* Admin Nav */}
        <div className="flex gap-2 flex-wrap border-b pb-3">
          {(["orders", "menu", "areas", "timings", "history"] as const).map((s) => (
            <Button
              key={s}
              variant={activeSection === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(s)}
              className={activeSection === s ? "bg-gradient-primary" : ""}
            >
              {s === "orders" ? "Today's Orders" : s === "menu" ? "Manage Menu" : s === "areas" ? "Route Areas" : s === "timings" ? "Order Timings" : "All History"}
            </Button>
          ))}
        </div>

        {/* ── Orders Section ── */}
        {activeSection === "orders" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => downloadOrdersCSV(todayOrders, `BengreFarm_Orders_${today}.csv`)}
              >
                <Download className="h-4 w-4" /> Download Today's Orders (CSV)
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Pending & Out for Delivery ({pendingOrders.length + outForDelivery.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingOrders.length + outForDelivery.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending orders right now.</p>
                )}
                {Object.entries(
                  [...pendingOrders, ...outForDelivery].reduce((acc, order) => {
                    const area = order.deliveryType === "personal" ? "Personal Delivery" : (order.deliveryAreaName || "Unassigned");
                    if (!acc[area]) acc[area] = [];
                    acc[area].push(order);
                    return acc;
                  }, {} as Record<string, typeof pendingOrders>)
                ).map(([area, orders]) => (
                  <div key={area} className="space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-1 mt-4">
                      {area} <span className="text-muted-foreground text-sm font-normal">({orders.length})</span>
                    </h3>
                    {orders.map((o) => (
                      <OrderCard key={o.orderNo} order={o} onStatus={setOrderStatus} />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Delivered Today ({deliveredOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveredOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No deliveries completed yet.</p>
                )}
                {deliveredOrders.map((o) => (
                  <div key={o.orderNo} className="flex justify-between items-center border rounded-xl p-3 opacity-70">
                    <div>
                      <div className="font-semibold text-sm">#{o.orderNo} · {o.userName}</div>
                      <div className="text-[10px] bg-muted px-2 py-0.5 rounded capitalize">{o.deliveryType.replace("_", " ")}</div>
                      <div className="text-xs text-muted-foreground">{o.items.map((i: any) => `${i.name}×${i.qty}`).join(", ")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₹{o.grandTotal || o.total}</div>
                      <Badge className="bg-emerald-600 text-white">Delivered</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {cancelledOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Cancelled ({cancelledOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cancelledOrders.map((o) => (
                    <div key={o.orderNo} className="flex justify-between items-center border rounded-xl p-3 opacity-50">
                      <div>
                        <div className="font-semibold text-sm">#{o.orderNo} · {o.userName}</div>
                        <div className="text-xs text-muted-foreground">{o.items.map((i: any) => `${i.name}×${i.qty}`).join(", ")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold line-through">₹{o.total}</div>
                        <Badge variant="destructive">Cancelled</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Menu Management ── */}
        {activeSection === "menu" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Daily Menu</CardTitle>
              <CardDescription>Toggle availability or add new items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.menu.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-2 rounded-xl p-4 transition-all hover:shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{m.name}</div>
                      <Badge variant="outline" className="text-[10px] h-4">{m.category}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">₹{m.price} / {m.unit}</div>
                    {m.description && <div className="text-[10px] text-muted-foreground italic mt-0.5">{m.description}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <Label className="text-[10px] mb-1">Stock Count</Label>
                      <Input type="number" value={m.count ?? 0} onChange={(e) => updateMenuItem(m.id, { count: Number(e.target.value) })} className="w-20 h-8 text-center" />
                    </div>
                    <div className="flex flex-col items-center">
                      <Label className="text-[10px] mb-1">Status</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${m.available ? "text-emerald-600" : "text-destructive"}`}>
                          {m.available ? "Avail." : "Unavail."}
                        </span>
                        <Switch checked={m.available} onCheckedChange={(v) => updateMenuItem(m.id, { available: v })} />
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 self-center" onClick={() => removeMenuItem(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-t-2 pt-4 space-y-3">
                <h3 className="font-semibold text-sm">Add New Item</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-11 sm:col-span-2" />
                  <Input type="number" placeholder="Price" value={newItem.price || ""} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })} className="h-11" />
                  <Input type="number" placeholder="Stock Count" value={newItem.count || ""} onChange={(e) => setNewItem({ ...newItem, count: Number(e.target.value) })} className="h-11" />
                  <Input placeholder="Unit (litre, kg...)" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="h-11" />
                  <Input placeholder="Category (e.g. Milk, Ghee)" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="h-11" />
                  <Input placeholder="Description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="h-11 sm:col-span-2" />
                </div>
                <Button onClick={addItem} className="w-full bg-gradient-primary hover:opacity-90">Add Menu Item</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Areas Management ── */}
        {activeSection === "areas" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Daily Route Locations</CardTitle>
              <CardDescription>Areas covered in the 11:30 AM route</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.areas.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-2 rounded-xl p-4">
                  <div className="font-semibold">{a.name}</div>
                  <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeArea(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-t-2 pt-4 space-y-3">
                <h3 className="font-semibold text-sm">Add New Route Point</h3>
                <Input placeholder="Location name" value={newArea.name} onChange={(e) => setNewArea({ name: e.target.value })} className="h-11" />
                <Button className="w-full bg-gradient-primary hover:opacity-90" onClick={() => {
                  if (!newArea.name) return toast.error("Enter location name");
                  addArea(newArea);
                  setNewArea({ name: "" });
                  toast.success("Location added");
                }}>Add Location</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Timings ── */}
        {activeSection === "timings" && (
          <TimingsSection settings={state.settings} onSave={updateSettings} />
        )}

        {/* ── All History ── */}
        {activeSection === "history" && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="font-display">All Orders History</CardTitle>
                <CardDescription>{allOrders.length} total orders</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5 shrink-0"
                onClick={() => downloadOrdersCSV(allOrders, `BengreFarm_AllOrders.csv`)}
              >
                <Download className="h-4 w-4" /> Download All (CSV)
              </Button>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-auto space-y-2">
              {allOrders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>}
              {allOrders.map((o) => (
                <div key={`${o.dateKey}-${o.orderNo}`} className="flex justify-between items-center text-sm border rounded-xl p-3 hover:shadow-sm transition-shadow">
                  <div>
                    <div className="font-semibold">#{o.orderNo} · {o.dateKey}</div>
                    <div className="text-[10px] text-muted-foreground">{o.userName} · {o.deliveryType.replace("_", " ")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{o.grandTotal}</div>
                    <Badge variant={o.status === "delivered" ? "default" : o.status === "cancelled" ? "destructive" : "outline"}>
                      {o.status.replace("_", " ")}
                    </Badge>
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

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
function OrderCard({ order: o, onStatus }: { order: any; onStatus: (dateKey: string, orderNo: number, status: any) => void }) {
  return (
    <div className="border-2 rounded-xl p-4 space-y-3 bg-card hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold text-primary">#{o.orderNo}</span>
            <Badge variant={o.status === "out_for_delivery" ? "default" : "secondary"}>
              {o.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="font-semibold mt-1">{o.userName}</div>
          <div className="text-xs text-muted-foreground">📞 {o.phone}</div>
          <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold inline-block mt-1">
            📍 {o.address} {o.deliveryAreaName && `(${o.deliveryAreaName})`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-bold text-primary">₹{o.grandTotal}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
            {o.deliveryType.replace("_", " ")} · {o.paymentMethod.toUpperCase()}
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="font-medium text-xs text-muted-foreground mb-1">ORDER ITEMS</div>
        {o.items.map((i: any) => (
          <div key={i.menuId} className="flex justify-between">
            <span>{i.name} × {i.qty}</span>
            <span className="font-medium">₹{i.price * i.qty}</span>
          </div>
        ))}
        {o.deliveryCharge > 0 && (
          <div className="flex justify-between border-t border-muted-foreground/20 pt-1 mt-1 text-xs">
            <span>Delivery Charge</span>
            <span className="font-medium">₹{o.deliveryCharge}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {o.status === "pending" && (
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onStatus(o.dateKey, o.orderNo, "out_for_delivery")}>
            🚚 Out for Delivery
          </Button>
        )}
        {o.status !== "delivered" && o.status !== "cancelled" && (
          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onStatus(o.dateKey, o.orderNo, "delivered")}>
            ✓ Mark Delivered
          </Button>
        )}
        {o.status === "pending" && (
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => onStatus(o.dateKey, o.orderNo, "cancelled")}>
            ✕ Cancel Order
          </Button>
        )}
      </div>
    </div>
  );
}

function AnalyticCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string | number; color: string; bg: string }) {
  return (
    <Card className="border-2 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg} ${color}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimingsSection({
  settings,
  onSave,
}: {
  settings: AppSettings;
  onSave: (s: AppSettings) => Promise<void>;
}) {
  const [start, setStart] = useState("");
  const [cutoff, setCutoff] = useState("");

  useEffect(() => {
    if (settings.orderStartTime) setStart(settings.orderStartTime);
    if (settings.routeCutoffTime) setCutoff(settings.routeCutoffTime);
  }, [settings.orderStartTime, settings.routeCutoffTime]);

  const fmt12 = (t: string) => {
    if (!t || !t.includes(":")) return t;
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" /> Order Window Timings
        </CardTitle>
        <CardDescription>
          Set when customers can place orders each day. Changes take effect immediately for all users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="opening-time">Opening Time</Label>
          <input
            id="opening-time"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {start && <p className="text-xs text-muted-foreground">Orders will open at <strong>{fmt12(start)}</strong></p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="closing-time">Closing Time (Order Cutoff)</Label>
          <input
            id="closing-time"
            type="time"
            value={cutoff}
            onChange={(e) => setCutoff(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {cutoff && <p className="text-xs text-muted-foreground">Orders will close at <strong>{fmt12(cutoff)}</strong></p>}
        </div>

        <div className="rounded-xl border-2 border-primary/10 bg-primary/5 p-4 space-y-1">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Current Window Preview</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Opens</span>
            <span className="font-semibold">{fmt12(start || "06:00")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Closes</span>
            <span className="font-semibold">{fmt12(cutoff || "11:15")}</span>
          </div>
        </div>

        <Button
          className="w-full bg-gradient-primary hover:opacity-90 h-11"
          onClick={async () => {
            if (!start || !cutoff) return toast.error("Both times are required");
            if (start >= cutoff) return toast.error("Opening time must be before closing time");
            await onSave({ orderStartTime: start, routeCutoffTime: cutoff });
            toast.success("Timings updated successfully!");
          }}
        >
          Save Timings
        </Button>
      </CardContent>
    </Card>
  );
}
