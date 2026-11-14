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
// "daily_route" and "personal" only exist on old orders
export type DeliveryType = "morning" | "evening" | "daily_route" | "personal";
export type Slot = "morning" | "evening";

export const SLOT_INFO: Record<Slot, { label: string; time: string; cutoff: string }> = {
  morning: { label: "Morning Delivery", time: "6 – 8 AM", cutoff: "Order any time until 11:59 PM the night before" },
  evening: { label: "Evening Delivery", time: "4 – 6 PM", cutoff: "Order until 3:00 PM on the delivery day" },
};

export const slotText = (t: string) =>
  t === "morning" ? "Morning delivery (6 – 8 AM)"
  : t === "evening" ? "Evening delivery (4 – 6 PM)"
  : t === "personal" ? "Personal delivery"
  : "Daily route";

// Date and time in India — order cut-offs always follow IST, whatever the device clock says
export const istNow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    dateKey: `${g("year")}-${g("month")}-${g("day")}`,
    minutes: (Number(g("hour")) % 24) * 60 + Number(g("minute")),
  };
};

// Can an order for this slot on this delivery date still be placed right now?
export const slotAvailability = (slot: Slot, deliveryDate: string): { ok: boolean; reason?: string } => {
  const now = istNow();
  if (deliveryDate < now.dateKey) return { ok: false, reason: "This date has already passed" };
  if (slot === "morning") {
    // closes at 11:59 PM of the previous day
    if (deliveryDate <= now.dateKey) return { ok: false, reason: "Closed – morning orders close at 11:59 PM the night before" };
    return { ok: true };
  }
  // evening: open until 3 PM on the delivery day itself
  if (deliveryDate === now.dateKey && now.minutes >= 15 * 60) return { ok: false, reason: "Closed – evening orders for today closed at 3:00 PM" };
  return { ok: true };
};

export interface StoreSettings {
  orderStartTime: string;  // "HH:MM" 24hr (no longer used for ordering)
  routeCutoffTime: string; // "HH:MM" 24hr (no longer used for ordering)
}

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
  dateKey: string; // for new orders this is the DELIVERY date
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
  settings: StoreSettings;
}

const todayKey = () => istNow().dateKey;

const LOCAL_KEY = "bengre_store_v4";

// Load persisted data from localStorage — includes full user object now
const loadLocal = (): { cart: Record<string, number>; currentUserId: string | null; currentUser: User | null } => {
  if (typeof window === "undefined") return { cart: {}, currentUserId: null, currentUser: null };
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { cart: {}, currentUserId: null, currentUser: null };
    const parsed = JSON.parse(raw);
    return {
      cart: parsed.cart || {},
      currentUserId: parsed.currentUserId || null,
      currentUser: parsed.currentUser || null,
    };
  } catch {
    return { cart: {}, currentUserId: null, currentUser: null };
  }
};

const initialLocal = loadLocal();

// If we have a saved user, pre-populate the users array immediately
// so currentUser is non-null on first render — no flicker, no redirect
const initialUsers: User[] = initialLocal.currentUser ? [initialLocal.currentUser] : [];

let _store: Store = {
  users: initialUsers,
  currentUserId: initialLocal.currentUserId,
  menu: [],
  orders: [],
  areas: [],
  cart: initialLocal.cart,
  settings: { orderStartTime: "06:00", routeCutoffTime: "11:15" },
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const persistLocal = () => {
  if (typeof window !== "undefined") {
    // Save the full current user object so it survives refresh
    const currentUser = _store.users.find(u => u.id === _store.currentUserId) || null;
    localStorage.setItem(LOCAL_KEY, JSON.stringify({
      cart: _store.cart,
      currentUserId: _store.currentUserId,
      currentUser,
    }));
  }
};

const mutate = (fn: (s: Store) => void) => {
  _store = { ..._store, cart: { ..._store.cart } };
  fn(_store);
  persistLocal();
  notify();
};

export function useStore() {
  const [snap, setSnap] = useState<Store>(_store);

  useEffect(() => {
    setSnap(_store);
    const l = () => setSnap({ ..._store });
    listeners.add(l);

    const fetchData = async () => {
      try {
        const [prodRes, areaRes, orderRes, settingsRes] = await Promise.all([
          fetch("/api/products").then(r => r.json()),
          fetch("/api/areas").then(r => r.json()),
          fetch("/api/orders").then(r => r.json()),
          fetch("/api/settings").then(r => r.json()),
        ]);
        mutate(s => {
          if (prodRes.ok) s.menu = prodRes.products;
          if (areaRes.ok) s.areas = areaRes.areas;
          if (orderRes.ok) s.orders = orderRes.orders;
          if (settingsRes.ok) s.settings = settingsRes.settings;
        });
      } catch (err) {
        console.error("Failed to fetch store data", err);
      }
    };

    fetchData();
    return () => { listeners.delete(l); };
  }, []);

  const currentUser = snap.users.find((u) => u.id === snap.currentUserId) ||
    (snap.currentUserId === 'admin' ? { id: 'admin', name: 'Admin', role: 'admin' as Role, email: 'admin@bengre.farm', password: '', address: '', phone: '' } : null) ||
    (snap.currentUserId === 'delivery' ? { id: 'delivery', name: 'Delivery Boy', role: 'delivery' as Role, email: '', password: '', address: '', phone: '' } : null);

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
          // Update or insert user — also persists full user to localStorage
          const idx = s.users.findIndex(x => x.id === u.id);
          if (idx >= 0) s.users[idx] = u; else s.users.push(u);
        });
        return { ok: true as const, user: u };
      } catch {
        return { ok: false as const, error: "Login failed" };
      }
    },

    // Google sign-in / sign-up. First call sends only the Google credential; if the
    // account is new the server asks for phone + address, and we call again with them.
    googleAuth: async (credential: string, extra?: { phone: string; address: string }) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, ...extra }),
        });
        const data = await res.json();
        if (data.needsProfile) {
          return { ok: false as const, needsProfile: true as const, profile: data.profile as { name: string; email: string }, error: "" };
        }
        if (!data.ok) return { ok: false as const, needsProfile: false as const, error: data.error as string };
        const u: User = data.user;
        mutate((s) => {
          s.currentUserId = u.id;
          const idx = s.users.findIndex(x => x.id === u.id);
          if (idx >= 0) s.users[idx] = u; else s.users.push(u);
        });
        return { ok: true as const, user: u };
      } catch {
        return { ok: false as const, needsProfile: false as const, error: "Google sign-in failed" };
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
      } catch {
        return { ok: false as const, error: "Signup failed" };
      }
    },

    logout: () => mutate((s) => {
      s.currentUserId = null;
      s.users = []; // clear saved user so localStorage is clean
    }),

    setCartQty: (id: string, q: number) => mutate((s) => {
      if (q <= 0) delete s.cart[id]; else s.cart[id] = q;
    }),

    clearCart: () => mutate((s) => { s.cart = {}; }),

    placeOrder: async (
      userId: string,
      items: OrderItem[],
      paymentMethod: PaymentMethod,
      slot: Slot,
      deliveryDate: string,
      fullAddress: string,
      areaId: string,
    ) => {
      const avail = slotAvailability(slot, deliveryDate);
      if (!avail.ok) return { ok: false as const, error: avail.reason! };
      if (!areaId) return { ok: false as const, error: "Please select your sector" };

      let userName = "User";
      let phone = "";
      const u = _store.users.find(x => x.id === userId);
      if (u) { userName = u.name; phone = u.phone; }

      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const area = _store.areas.find(a => a.id === areaId);

      const orderPayload = {
        orderNo: 0,
        userId, userName, address: fullAddress, phone,
        items, total, deliveryCharge: 0, grandTotal: total, paymentMethod,
        deliveryAreaId: area?.id, deliveryAreaName: area?.name, deliveryType: slot,
        dateKey: deliveryDate,
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
          for (const item of items) {
            const prod = s.menu.find(p => p.id === item.menuId);
            if (prod) prod.count -= item.qty;
          }
        });
        return { ok: true as const, order: data.order };
      } catch {
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

    updateSettings: async (settings: StoreSettings) => {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (data.ok) {
          mutate(s => { s.settings = settings; });
        }
      } catch (err) {
        console.error("Failed to update settings", err);
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
