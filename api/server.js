import 'dotenv/config';
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Razorpay from "razorpay";

const app = express();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "test",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "test",
});

app.use(cors());
app.use(express.json());

// ── Schemas ────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, default: 'user' },
  address:  { type: String, default: '' },
  phone:    { type: String, default: '' }
});
const User = (() => {
  try { return mongoose.model('User'); } catch { return mongoose.model('User', userSchema); }
})();

const productSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  unit:        { type: String, required: true },
  available:   { type: Boolean, default: true },
  description: { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  category:    { type: String, required: true },
  count:       { type: Number, default: 0 }
});
const Product = (() => {
  try { return mongoose.model('Product'); } catch { return mongoose.model('Product', productSchema); }
})();

const areaSchema = new mongoose.Schema({
  id:   { type: String, required: true, unique: true },
  name: { type: String, required: true }
});
const Area = (() => {
  try { return mongoose.model('Area'); } catch { return mongoose.model('Area', areaSchema); }
})();

const settingsSchema = new mongoose.Schema({
  key:              { type: String, required: true, unique: true },
  orderStartTime:   { type: String, default: "06:00" },
  routeCutoffTime:  { type: String, default: "11:15" },
});
const Settings = (() => {
  try { return mongoose.model('Settings'); } catch { return mongoose.model('Settings', settingsSchema); }
})();

const orderSchema = new mongoose.Schema({
  orderNo:          { type: Number, required: true },
  userId:           { type: String, required: true },
  userName:         { type: String, required: true },
  address:          { type: String, required: true },
  phone:            { type: String, required: true },
  items: [{
    menuId: { type: String, required: true },
    name:   { type: String, required: true },
    price:  { type: Number, required: true },
    qty:    { type: Number, required: true }
  }],
  total:            { type: Number, required: true },
  deliveryCharge:   { type: Number, required: true },
  grandTotal:       { type: Number, required: true },
  paymentMethod:    { type: String, required: true },
  deliveryAreaId:   { type: String },
  deliveryAreaName: { type: String },
  deliveryType:     { type: String, required: true },
  status:           { type: String, default: 'pending' },
  createdAt:        { type: Number, required: true },
  deliveredAt:      { type: Number },
  dateKey:          { type: String, required: true }
});
const Order = (() => {
  try { return mongoose.model('Order'); } catch { return mongoose.model('Order', orderSchema); }
})();

// ── DB Connection ──────────────────────────────────────────────────────────

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set in environment variables");
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("MongoDB connected");

  // Default admin & delivery users
  const adminExists = await User.findOne({ id: 'admin' });
  if (!adminExists) {
    await User.insertMany([
      { id: 'admin',    name: 'Admin',        email: 'admin@bengre.farm',    password: 'admin123',   role: 'admin',    address: 'Bengre Farm HQ', phone: '9999999999' },
      { id: 'delivery', name: 'Delivery Boy', email: 'delivery@bengre.farm', password: 'deliver123', role: 'delivery', address: '-',               phone: '8888888888' }
    ]);
    console.log("Default users created");
  }

  // Default areas
  const areaCount = await Area.countDocuments();
  if (areaCount === 0) {
    await Area.insertMany([
      { id: "c1",  name: "Dhanas" },
      { id: "c2",  name: "Police Line" },
      { id: "c3",  name: "Panjab University" },
      { id: "c4",  name: "Sector 15" },
      { id: "c5",  name: "Sukhna Enclave" },
      { id: "c6",  name: "PGI" },
      { id: "c7",  name: "Sector 11" },
      { id: "c8",  name: "Sector 23" },
      { id: "c9",  name: "Sector 24" },
      { id: "c10", name: "Nirman Sadan Sector 33" },
    ]);
    console.log("Default areas created");
  }

  // Default products
  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    await Product.insertMany([
      { id: "m1",      name: "Cow Milk",            price: 60,   unit: "1 kg",    available: true, category: "Cow Milk",      imageUrl: "/products/milk.jpg",         description: "Fresh, pure milk sourced from our select herd of indigenous cows.",  count: 100 },
      { id: "m2",      name: "Buffalo Milk",         price: 74,   unit: "1 kg",    available: true, category: "Buffalo Milk",  imageUrl: "/products/milk.jpg",         description: "Creamy, full-fat buffalo milk, prized for its thick texture.",        count: 100 },
      { id: "m3",      name: "Mix Milk",             price: 70,   unit: "1 kg",    available: true, category: "Mix Milk",      imageUrl: "/products/milk.jpg",         description: "A balanced blend of cow and buffalo milk.",                           count: 100 },
      { id: "m4",      name: "Cow Bilona Ghee",      price: 1240, unit: "1 litre", available: true, category: "Cow Ghee",      imageUrl: "/products/cow-ghee.jpg",     description: "Our finest ghee, crafted from the Bilona process.",                   count: 100 },
      { id: "m5",      name: "Hara Kheer",           price: 20,   unit: "Cup",     available: true, category: "Hara Kheer",    imageUrl: "/products/kheer.jpg",        description: "A traditional, slow-cooked rice pudding.",                            count: 100 },
      { id: "m6",      name: "Hara Kheer",           price: 50,   unit: "Bowl",    available: true, category: "Hara Kheer",    imageUrl: "/products/kheer.jpg",        description: "A traditional, slow-cooked rice pudding.",                            count: 100 },
      { id: "m8_500",  name: "Dahi",                 price: 45,   unit: "500 gm",  available: true, category: "Dahi",          imageUrl: "/products/dahi.jpg",         description: "Thick, creamy curd set in traditional earthen pots.",                 count: 100 },
      { id: "m8_1kg",  name: "Dahi",                 price: 90,   unit: "1 kg",    available: true, category: "Dahi",          imageUrl: "/products/dahi.jpg",         description: "Thick, creamy curd set in traditional earthen pots.",                 count: 100 },
      { id: "m9_100",  name: "Desi Makhan",          price: 70,   unit: "100 gm",  available: true, category: "Desi Makhan",   imageUrl: "/products/makhan.jpg",       description: "Fresh, hand-pressed, soft, white Makhan.",                            count: 100 },
      { id: "m9_200",  name: "Desi Makhan",          price: 140,  unit: "200 gm",  available: true, category: "Desi Makhan",   imageUrl: "/products/makhan.jpg",       description: "Fresh, hand-pressed, soft, white Makhan.",                            count: 100 },
      { id: "m9_500",  name: "Desi Makhan",          price: 350,  unit: "500 gm",  available: true, category: "Desi Makhan",   imageUrl: "/products/makhan.jpg",       description: "Fresh, hand-pressed, soft, white Makhan.",                            count: 100 },
      { id: "m10",     name: "Lassi Bilona Plain",   price: 30,   unit: "700 ml",  available: true, category: "Lassi",         imageUrl: "/products/lassi.jpg",        description: "A refreshing, cooling yogurt drink.",                                 count: 100 },
      { id: "m11",     name: "Lassi Bilona Plain",   price: 60,   unit: "1400 ml", available: true, category: "Lassi",         imageUrl: "/products/lassi.jpg",        description: "A refreshing, cooling yogurt drink.",                                 count: 100 },
      { id: "m12_200", name: "Paneer",               price: 85,   unit: "200 gm",  available: true, category: "Paneer",        imageUrl: "/products/paneer.jpg",       description: "Artisan, soft Paneer made from fresh milk.",                          count: 100 },
      { id: "m12_500", name: "Paneer",               price: 213,  unit: "500 gm",  available: true, category: "Paneer",        imageUrl: "/products/paneer.jpg",       description: "Artisan, soft Paneer made from fresh milk.",                          count: 100 },
      { id: "m12_1kg", name: "Paneer",               price: 425,  unit: "1 kg",    available: true, category: "Paneer",        imageUrl: "/products/paneer.jpg",       description: "Artisan, soft Paneer made from fresh milk.",                          count: 100 },
      { id: "m13",     name: "Buffalo Ghee",         price: 1220, unit: "1 litre", available: true, category: "Buffalo Ghee",  imageUrl: "/products/buffalo-ghee.jpg", description: "Pure Buffalo Ghee, rich in aroma and taste.",                         count: 100 }
    ]);
    console.log("Default products created");
  }

  // Default settings
  const settingsExist = await Settings.findOne({ key: "main" });
  if (!settingsExist) {
    await Settings.create({ key: "main", orderStartTime: "06:00", routeCutoffTime: "11:15" });
    console.log("Default settings created");
  }
}

// Connect DB on every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    res.status(500).json({ ok: false, error: "Database connection failed" });
  }
});

// ── Auth Routes ────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, error: "Email and password required" });

    // ✅ FIX: plain-text password comparison (no bcrypt — passwords stored as plain text)
    const user = await User.findOne({ email: email.toLowerCase().trim(), password });
    if (!user)
      return res.status(401).json({ ok: false, error: "Invalid email or password" });

    const { password: _pw, __v, _id, ...userData } = user.toObject();
    res.json({ ok: true, user: userData });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ ok: false, error: "Login failed. Please try again." });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    if (!name || !email || !password || !phone || !address)
      return res.status(400).json({ ok: false, error: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(400).json({ ok: false, error: "Email is already registered" });

    const id = `u_${Date.now()}`;
    // ✅ Storing password as plain text (consistent with login above)
    const newUser = await User.create({
      id, name, email: email.toLowerCase().trim(),
      password, role: 'user', address, phone
    });
    const { password: _pw, __v, _id, ...userData } = newUser.toObject();
    res.json({ ok: true, user: userData });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ ok: false, error: "Signup failed. Please try again." });
  }
});

// ── Health Check ───────────────────────────────────────────────────────────

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// ── Product Routes ─────────────────────────────────────────────────────────

app.get("/api/products", async (_req, res) => {
  try {
    const products = await Product.find({});
    const mapped = products.map(p => { const { _id, __v, ...rest } = p.toObject(); return rest; });
    res.json({ ok: true, products: mapped });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch products" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const newProduct = await Product.create({ ...req.body, id: `m_${Date.now()}` });
    const { _id, __v, ...rest } = newProduct.toObject();
    res.json({ ok: true, product: rest });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to create product" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!product) return res.status(404).json({ ok: false, error: "Product not found" });
    const { _id, __v, ...rest } = product.toObject();
    res.json({ ok: true, product: rest });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to delete product" });
  }
});

// ── Area Routes ────────────────────────────────────────────────────────────

app.get("/api/areas", async (_req, res) => {
  try {
    const areas = await Area.find({});
    const mapped = areas.map(a => { const { _id, __v, ...rest } = a.toObject(); return rest; });
    res.json({ ok: true, areas: mapped });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch areas" });
  }
});

app.post("/api/areas", async (req, res) => {
  try {
    const newArea = await Area.create({ ...req.body, id: `a_${Date.now()}` });
    const { _id, __v, ...rest } = newArea.toObject();
    res.json({ ok: true, area: rest });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to create area" });
  }
});

app.delete("/api/areas/:id", async (req, res) => {
  try {
    await Area.findOneAndDelete({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to delete area" });
  }
});

// ── Settings Routes ────────────────────────────────────────────────────────

app.get("/api/settings", async (_req, res) => {
  try {
    const s = await Settings.findOne({ key: "main" });
    res.json({ ok: true, settings: { orderStartTime: s?.orderStartTime || "06:00", routeCutoffTime: s?.routeCutoffTime || "11:15" } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch settings" });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { orderStartTime, routeCutoffTime } = req.body;
    if (!orderStartTime || !routeCutoffTime)
      return res.status(400).json({ ok: false, error: "Both orderStartTime and routeCutoffTime are required" });
    const s = await Settings.findOneAndUpdate({ key: "main" }, { orderStartTime, routeCutoffTime }, { new: true, upsert: true });
    res.json({ ok: true, settings: { orderStartTime: s.orderStartTime, routeCutoffTime: s.routeCutoffTime } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to update settings" });
  }
});

// ── Order Routes ───────────────────────────────────────────────────────────

app.get("/api/orders", async (_req, res) => {
  try {
    const orders = await Order.find({});
    const mapped = orders.map(o => { const { _id, __v, ...rest } = o.toObject(); return rest; });
    res.json({ ok: true, orders: mapped });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  // ✅ KEY FIX: Removed mongoose transactions (requires replica set, not available on M0 free tier).
  // Using atomic findOneAndUpdate for stock check instead — safe for concurrent requests.
  try {
    const {
      userId, userName, address, phone, items,
      total, deliveryCharge, grandTotal, paymentMethod,
      deliveryAreaId, deliveryAreaName, deliveryType, dateKey
    } = req.body;

    // Check and decrement stock atomically for each item
    for (const item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { id: item.menuId, count: { $gte: item.qty } },  // only update if enough stock
        { $inc: { count: -item.qty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback: re-increment stock for already-decremented items
        const idx = items.indexOf(item);
        for (let i = 0; i < idx; i++) {
          await Product.findOneAndUpdate({ id: items[i].menuId }, { $inc: { count: items[i].qty } });
        }
        return res.status(400).json({
          ok: false,
          error: `"${item.name}" is out of stock or has insufficient quantity.`
        });
      }
    }

    // Generate order number for this day
    const orderCount = await Order.countDocuments({ dateKey });
    const generatedOrderNo = orderCount + 1;

    const newOrder = await Order.create({
      orderNo: generatedOrderNo,
      userId, userName, address, phone, items,
      total, deliveryCharge, grandTotal, paymentMethod,
      deliveryAreaId, deliveryAreaName, deliveryType,
      status: 'pending',
      createdAt: Date.now(),
      dateKey
    });

    const { _id, __v, ...rest } = newOrder.toObject();
    res.json({ ok: true, order: rest });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ ok: false, error: "Failed to create order. Please try again." });
  }
});

app.put("/api/orders/:dateKey/:orderNo/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'delivered') updateData.deliveredAt = Date.now();

    const order = await Order.findOneAndUpdate(
      { dateKey: req.params.dateKey, orderNo: Number(req.params.orderNo) },
      updateData,
      { new: true }
    );
    if (!order) return res.status(404).json({ ok: false, error: "Order not found" });

    const { _id, __v, ...rest } = order.toObject();
    res.json({ ok: true, order: rest });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to update order status" });
  }
});

// ── Razorpay ───────────────────────────────────────────────────────────────

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount)
      return res.status(400).json({ ok: false, error: "Amount is required" });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });
    res.json({ ok: true, order });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ ok: false, error: "Failed to create Razorpay order" });
  }
});

// ── Start (local only) ─────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
}

export default app;
