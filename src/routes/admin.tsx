import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Trash2, Package, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Bengre Farm" }] }),
});

function AdminPage() {
  const { currentUser, state, addMenuItem, updateMenuItem, removeMenuItem, setOrderStatus, todayKey, addArea, removeArea } = useStore();
  const navigate = useNavigate();
  const [newItem, setNewItem] = useState({ name: "", price: 0, unit: "litre", category: "", description: "", available: true, count: 0 });
  const [newArea, setNewArea] = useState({ name: "" });
  const [activeSection, setActiveSection] = useState<"orders" | "menu" | "areas" | "history">("orders");

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") navigate({ to: "/" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "admin") {
    return <div className="min-h-screen bg-gradient-warm"><Header /></div>;
  }

  const today = todayKey();
  const todayOrders = state.orders.filter((o) => o.dateKey === today).sort((a, b) => a.orderNo - b.orderNo);
  const allOrders = state.orders.slice().reverse();

  // Analytics
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

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      <Toaster richColors />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Today: {today}</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <AnalyticCard
            icon={<Package className="h-5 w-5" />}
            label="Total Orders"
            value={todayOrders.length}
            color="text-primary"
            bg="bg-primary/10"
          />
          <AnalyticCard
            icon={<Clock className="h-5 w-5" />}
            label="Pending"
            value={pendingOrders.length + outForDelivery.length}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <AnalyticCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Delivered"
            value={deliveredOrders.length}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <AnalyticCard
            icon={<IndianRupee className="h-5 w-5" />}
            label="Revenue"
            value={`₹${todayRevenue}`}
            color="text-primary"
            bg="bg-primary/10"
          />
          <AnalyticCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Pending Rev."
            value={`₹${pendingRevenue}`}
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>

        {/* Admin Nav */}
        <div className="flex gap-2 border-b pb-3">
          {(["orders", "menu", "areas", "history"] as const).map((s) => (
            <Button
              key={s}
              variant={activeSection === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(s)}
              className={activeSection === s ? "bg-gradient-primary" : ""}
            >
              {s === "orders" ? "Today's Orders" : s === "menu" ? "Manage Menu" : s === "areas" ? "Route Areas" : "All History"}
            </Button>
          ))}
        </div>

        {/* Orders Section */}
        {activeSection === "orders" && (
          <div className="space-y-4">
            {/* Pending & Out for Delivery */}
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
                    <h3 className="font-semibold text-lg border-b pb-1 mt-4">{area} <span className="text-muted-foreground text-sm font-normal">({orders.length})</span></h3>
                    {orders.map((o) => (
                      <OrderCard key={o.orderNo} order={o} onStatus={setOrderStatus} />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Delivered Today */}
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
                      <div className="text-xs text-muted-foreground">{o.items.map(i => `${i.name}×${i.qty}`).join(", ")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₹{o.grandTotal || o.total}</div>
                      <Badge className="bg-emerald-600 text-white">Delivered</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cancelled */}
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
                        <div className="text-xs text-muted-foreground">{o.items.map(i => `${i.name}×${i.qty}`).join(", ")}</div>
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

        {/* Menu Management */}
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
                      <Input 
                        type="number" 
                        value={m.count ?? 0} 
                        onChange={(e) => updateMenuItem(m.id, { count: Number(e.target.value) })}
                        className="w-20 h-8 text-center" 
                      />
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

        {/* Areas Management */}
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

        {/* All History */}
        {activeSection === "history" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">All Orders History</CardTitle>
              <CardDescription>{allOrders.length} total orders</CardDescription>
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
