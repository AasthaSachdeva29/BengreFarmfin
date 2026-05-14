import mongoose from 'mongoose';

async function testConcurrency() {
  await mongoose.connect('mongodb://127.0.0.1:27017/bengrefarm');
  const Product = mongoose.connection.collection('products');
  
  // 1. Set stock of m1 to 1
  await Product.updateOne({ id: 'm1' }, { $set: { count: 1 } });
  console.log("Stock of m1 (Cow Milk) set to 1.");

  const orderPayload = {
    orderNo: Math.floor(Math.random() * 10000),
    userId: 'test_user',
    userName: 'Test User',
    phone: '1234567890',
    address: 'Test Address',
    items: [{ menuId: 'm1', name: 'Cow Milk', price: 60, qty: 1 }],
    total: 60,
    deliveryCharge: 0,
    grandTotal: 60,
    paymentMethod: 'cod',
    deliveryType: 'personal',
    deliveryAreaId: 'c1',
    deliveryAreaName: 'Dhanas',
    dateKey: '2026-05-14'
  };

  console.log("Placing 2 concurrent orders...");
  
  // 2. Fire two requests at the exact same time
  const [res1, res2] = await Promise.all([
    fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }).then(r => r.json()),
    fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }).then(r => r.json())
  ]);

  console.log("Response 1:", res1);
  console.log("Response 2:", res2);

  // 3. Check final stock
  const finalProduct = await Product.findOne({ id: 'm1' });
  console.log("Final Stock of m1:", finalProduct.count);

  process.exit(0);
}

testConcurrency();
