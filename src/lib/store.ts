import { useEffect, useState } from "react";

export type Role = "user" | "admin" | "delivery";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  address: string;
  phone: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  available: boolean;
  description?: string;
  imageUrl?: string;
  category: string;
  count: number;
}

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  qty: number;
}

export type OrderStatus = "pending" | "out_for_delivery" | "delivered" | "cancelled";
export type PaymentMethod = "gpay" | "cod";
export type DeliveryType = "daily_route" | "personal";

export const ORDER_START_TIME = "06:00";
export const ROUTE_CUTOFF_TIME = "15:15";
export const PERSONAL_MIN_ORDER = 180;
export const PERSONAL_DELIVERY_CHARGE = 50;

export interface Order {
  orderNo: number;
  userId: string;
  userName: string;
  address: string;
  phone: string;
  items: OrderItem[];
  total: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  deliveryAreaId?: string;
  deliveryAreaName?: string;
  deliveryType: DeliveryType;
  status: OrderStatus;
  createdAt: number;
  deliveredAt?: number;
  dateKey: string;
}

export interface DeliveryArea {
  id: string;
  name: string;
}

interface Store {
  users: User[];
  currentUserId: string | null;
  menu: MenuItem[];
  orders: Order[];
  areas: DeliveryArea[];
  cart: Record<string, number>;
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const LOCAL_KEY = "bengre_store_v4";

const loadLocal = () => {
  if (typeof window === "undefined") return { cart: {}, currentUserId: null };
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { cart: {}, currentUserId: null };
    const parsed = JSON.parse(raw);
    return {
      cart: parsed.cart || {},
      currentUserId: parsed.currentUserId || null
    };
  } catch {
    return { cart: {}, currentUserId: null };
  }
};

const initialLocal = loadLocal();

let _store: Store = {
  users: [],
  currentUserId: initialLocal.currentUserId,
  menu: [],
  orders: [],
  areas: [],
  cart: initialLocal.cart,
};

const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

const persistLocal = () => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({
      cart: _store.cart,
      currentUserId: _store.currentUserId
    }));
  }
};

const mutate = (fn: (s: Store) => void) => {
  _store = { ..._store, cart: { ..._store.cart } };
  fn(_store);
  persistLocal();
  notify();
};

// Helper: check if current time is within the allowed order window (6:00 AM – 11:15 AM)
const isWithinOrderWindow = (): { allowed: boolean; error?: string } => {
  const now = new Date();

  const start = new Date();
  const [sh, sm] = ORDER_START_TIME.split(":").map(Number);
  start.setHours(sh, sm, 0, 0);

  const cutoff = new Date();
  const [ch, cm] = ROUTE_CUTOFF_TIME.split(":").map(Number);
  cutoff.setHours(ch, cm, 0, 0);

  if (now < start) return { allowed: false, error: "Orders open at 6:00 AM. Please come back then!" };
  if (now > cutoff) return { allowed: false, error: "Orders are closed after 11:15 AM. Please try again tomorrow." };
  return { allowed: true };
};

export function useStore() {
  const [snap, setSnap] = useState<Store>(_store);

  useEffect(() => {
    setSnap(_store);
    const l = () => setSnap({ ..._store });
    listeners.add(l);

    // Fetch initial data from backend
    const fetchData = async () => {
      try {
        const [prodRes, areaRes, orderRes] = await Promise.all([
          fetch("/api/products").then(r => r.json()),
          fetch("/api/areas").then(r => r.json()),
          fetch("/api/orders").then(r => r.json())
        ]);
        mutate(s => {
          if (prodRes.ok) s.menu = prodRes.products;
          if (areaRes.ok) s.areas = areaRes.areas;
          if (orderRes.ok) s.orders = orderRes.orders;
        });
      } catch (err) {
        console.error("Failed to fetch store data", err);
      }
    };

    fetchData();

    return () => { listeners.delete(l); };
  }, []);

  const currentUser = snap.users.find((u) => u.id === snap.currentUserId) ||
    (snap.currentUserId === 'admin' ? { id: 'admin', name: 'Admin', role: 'admin', email: 'admin@bengre.farm', password: '', address: '', phone: '' } : null) ||
    (snap.currentUserId === 'delivery' ? { id: 'delivery', name: 'Delivery Boy', role: 'delivery', email: '', password: '', address: '', phone: '' } : null);

  return {
    state: snap,
    currentUser: currentUser as User | null,

    login: async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!data.ok) return { ok: false as const, error: data.error as string };
        const u: User = data.user;
        mutate((s) => {
          s.currentUserId = u.id;
          if (!s.users.find(x => x.id === u.id)) s.users.push(u);
        });
        return { ok: true as const, user: u };
      } catch (err) {
        return { ok: false as const, error: "Login failed" };
      }
    },

    signup: async (data: { name: string; email: string; password: string; address: string; phone: string }) => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!result.ok) return { ok: false as const, error: result.error as string };
        const u: User = result.user;
        mutate((s) => {
          s.currentUserId = u.id;
          s.users.push(u);
        });
        return { ok: true as const, user: u };
      } catch (err) {
        return { ok: false as const, error: "Signup failed" };
      }
    },

    logout: () => mutate((s) => { s.currentUserId = null; }),

    setCartQty: (id: string, q: number) => mutate((s) => {
      if (q <= 0) delete s.cart[id]; else s.cart[id] = q;
    }),

    clearCart: () => mutate((s) => { s.cart = {}; }),

    placeOrder: async (userId: string, items: OrderItem[], paymentMethod: PaymentMethod, deliveryType: DeliveryType, fullAddress: string, areaId?: string) => {
      // Check order time window for all order types
      const timeCheck = isWithinOrderWindow();
      if (!timeCheck.allowed) return { ok: false as const, error: timeCheck.error! };

      let userName = "User";
      let phone = "";
      const u = _store.users.find(x => x.id === userId);
      if (u) { userName = u.name; phone = u.phone; }

      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      let deliveryCharge = 0;

      if (deliveryType === "personal") {
        if (total < PERSONAL_MIN_ORDER) return { ok: false as const, error: `Minimum order for Personal Delivery is ₹${PERSONAL_MIN_ORDER}` };
        deliveryCharge = PERSONAL_DELIVERY_CHARGE;
      } else {
        if (!areaId) return { ok: false as const, error: "Please select your sector for Daily Route delivery" };
      }

      const grandTotal = total + deliveryCharge;
      const dateKey = todayKey();
      const area = deliveryType === "daily_route" ? _store.areas.find(a => a.id === areaId) : null;

      const orderPayload = {
        orderNo: 0, // Generated by backend
        userId, userName, address: fullAddress, phone,
        items, total, deliveryCharge, grandTotal, paymentMethod,
        deliveryAreaId: area?.id, deliveryAreaName: area?.name, deliveryType,
        dateKey
      };

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (!data.ok) return { ok: false as const, error: data.error };

        mutate(s => {
          s.orders.push(data.order);
          s.cart = {};
          // Also update local menu count to reflect stock decrement
          for (const item of items) {
            const prod = s.menu.find(p => p.id === item.menuId);
            if (prod) prod.count -= item.qty;
          }
        });
        return { ok: true as const, order: data.order };
      } catch (err) {
        return { ok: false as const, error: "Failed to connect to server" };
      }
    },

    setOrderStatus: async (dateKey: string, orderNo: number, status: OrderStatus) => {
      try {
        const res = await fetch(`/api/orders/${dateKey}/${orderNo}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.ok) {
          mutate(s => {
            const o = s.orders.find(x => x.dateKey === dateKey && x.orderNo === orderNo);
            if (o) {
              o.status = status;
              if (status === "delivered") o.deliveredAt = Date.now();
            }
          });
        }
      } catch (err) {
        console.error("Failed to update status", err);
      }
    },

    addMenuItem: async (item: Omit<MenuItem, "id">) => {
      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const data = await res.json();
        if (data.ok) {
          mutate(s => { s.menu.push(data.product); });
        }
      } catch (err) {
        console.error("Failed to add menu item", err);
      }
    },

    updateMenuItem: async (id: string, patch: Partial<MenuItem>) => {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const data = await res.json();
        if (data.ok) {
          mutate(s => {
            const m = s.menu.find(x => x.id === id);
            if (m) Object.assign(m, patch);
          });
        }
      } catch (err) {
        console.error("Failed to update menu item", err);
      }
    },

    removeMenuItem: async (id: string) => {
      try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.ok) {
          mutate(s => { s.menu = s.menu.filter(x => x.id !== id); });
        }
      } catch (err) {
        console.error("Failed to delete menu item", err);
      }
    },

    addArea: async (a: Omit<DeliveryArea, "id">) => {
      try {
        const res = await fetch("/api/areas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(a)
        });
        const data = await res.json();
        if (data.ok) {
          mutate(s => { s.areas.push(data.area); });
        }
      } catch (err) {
        console.error("Failed to add area", err);
      }
    },

    removeArea: async (id: string) => {
      try {
        const res = await fetch(`/api/areas/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.ok) {
          mutate(s => { s.areas = s.areas.filter(x => x.id !== id); });
        }
      } catch (err) {
        console.error("Failed to delete area", err);
      }
    },

    todayKey,
  };
}
