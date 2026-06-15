const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dimzjie123';

const notificationsFile = path.join(__dirname, 'checkout-notifications.json');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

function getNotifications() {
  return fs.existsSync(notificationsFile)
    ? JSON.parse(fs.readFileSync(notificationsFile, 'utf-8'))
    : [];
}

function saveNotification(data) {
  const existing = getNotifications();
  existing.push(data);
  fs.writeFileSync(notificationsFile, JSON.stringify(existing, null, 2));
}

function findNotificationByStripeSession(sessionId) {
  return getNotifications().find(item => item.stripeSessionId === sessionId);
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe belum dikonfigurasi di server.' });
    }

    const { customerName, customerEmail, customerPhone, customerAddress, cart, total } = req.body;
    if (!customerName || !customerEmail || !customerPhone || !customerAddress || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ success: false, error: 'Data pesanan tidak lengkap.' });
    }

    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'idr',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : [],
        },
        unit_amount: Number(item.price),
      },
      quantity: Number(item.quantity) || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/confirm.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/checkout.html`,
      customer_email: customerEmail,
      metadata: {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        cart: JSON.stringify(cart),
        total: String(total),
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal membuat sesi pembayaran Stripe.' });
  }
});

app.get('/checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe belum dikonfigurasi di server.' });
    }

    const sessionId = req.query.sessionId;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId diperlukan.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Pembayaran belum selesai.', session });
    }

    const existingOrder = findNotificationByStripeSession(session.id);
    if (existingOrder) {
      return res.json({ success: true, order: existingOrder, session });
    }

    const metadata = session.metadata || {};
    const cart = metadata.cart ? JSON.parse(metadata.cart) : [];
    const order = {
      id: Date.now(),
      name: metadata.customerName || session.customer_details?.name || '',
      email: metadata.customerEmail || session.customer_details?.email || '',
      phone: metadata.customerPhone || '',
      address: metadata.customerAddress || '',
      paymentMethod: 'Stripe',
      total: Number(metadata.total) || Number(session.amount_total) || 0,
      cart,
      transferredTo: null,
      transferAmount: Number(session.amount_total) || 0,
      status: 'Paid',
      shipmentStage: 'Menunggu Konfirmasi',
      createdAt: new Date().toISOString(),
      proofPath: null,
      proofName: null,
      stripeSessionId: session.id,
    };

    saveNotification(order);
    res.json({ success: true, order, session });
  } catch (error) {
    console.error('Checkout session retrieval error:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal memuat sesi checkout.' });
  }
});

app.post('/checkout-notification', upload.single('proof'), (req, res) => {
  try {
    const notification = {
      id: Date.now(),
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      paymentMethod: req.body.paymentMethod,
      total: Number(req.body.total) || 0,
      cart: req.body.cart ? JSON.parse(req.body.cart) : [],
      transferredTo: req.body.transferredTo,
      transferAmount: Number(req.body.transferAmount) || 0,
      status: req.body.status || 'Menunggu Konfirmasi',
      shipmentStage: 'Menunggu Konfirmasi',
      createdAt: req.body.createdAt || new Date().toISOString(),
      proofPath: req.file ? `/uploads/${req.file.filename}` : null,
      proofName: req.file ? req.file.originalname : null,
      stripeSessionId: req.body.stripeSessionId || null,
    };
    saveNotification(notification);
    console.log('Notifikasi checkout baru:', notification);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const productsFile = path.join(__dirname, 'data', 'products.json');

function saveProduct(data) {
  const existing = fs.existsSync(productsFile)
    ? JSON.parse(fs.readFileSync(productsFile, 'utf-8'))
    : [];
  existing.push(data);
  fs.writeFileSync(productsFile, JSON.stringify(existing, null, 2));
}

function loadProducts() {
  return fs.existsSync(productsFile)
    ? JSON.parse(fs.readFileSync(productsFile, 'utf-8'))
    : [];
}

function writeProducts(products) {
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

app.get('/products', (req, res) => {
  try {
    const products = loadProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/admin-login', (req, res) => {
  try {
    const password = req.body.password;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Kata sandi diperlukan.' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Kata sandi salah.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/products', upload.single('imageFile'), (req, res) => {
  try {
    const name = req.body.name;
    const price = Number(req.body.price) || 0;
    const category = req.body.category;
    const slug = req.body.slug;
    const description = req.body.description;
    const features = req.body.features ? JSON.parse(req.body.features) : [];
    const imageUrl = req.body.imageUrl && req.body.imageUrl.trim().length > 0
      ? req.body.imageUrl.trim()
      : null;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !price || !category || !slug || !description) {
      return res.status(400).json({ success: false, error: 'Data produk tidak lengkap.' });
    }

    const product = {
      id: Date.now(),
      name,
      price,
      slug,
      category,
      description,
      features,
      image: imagePath || imageUrl,
    };

    saveProduct(product);
    console.log('Produk baru ditambahkan:', product);
    res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/products/:id', upload.single('imageFile'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const products = loadProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });

    const name = req.body.name || products[index].name;
    const price = req.body.price ? Number(req.body.price) : products[index].price;
    const category = req.body.category || products[index].category;
    const slug = req.body.slug || products[index].slug;
    const description = req.body.description || products[index].description;
    const features = req.body.features ? JSON.parse(req.body.features) : products[index].features || [];
    const imageUrl = req.body.imageUrl && req.body.imageUrl.trim().length > 0 ? req.body.imageUrl.trim() : null;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const updated = {
      ...products[index],
      name,
      price,
      category,
      slug,
      description,
      features,
      image: imagePath || imageUrl || products[index].image,
    };

    products[index] = updated;
    writeProducts(products);
    res.json({ success: true, product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const products = loadProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });
    const [removed] = products.splice(index, 1);
    writeProducts(products);
    res.json({ success: true, product: removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/checkout-notifications', (req, res) => {
  try {
    const notifications = fs.existsSync(notificationsFile)
      ? JSON.parse(fs.readFileSync(notificationsFile, 'utf-8'))
      : [];
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/config', (req, res) => {
  res.json({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
});

app.put('/checkout-notification/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const notifications = fs.existsSync(notificationsFile)
      ? JSON.parse(fs.readFileSync(notificationsFile, 'utf-8'))
      : [];

    const index = notifications.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Order tidak ditemukan.' });
    }

    const updatedLocation = req.body.location && typeof req.body.location === 'object'
      ? {
          lat: Number(req.body.location.lat) || notifications[index].location?.lat || null,
          lng: Number(req.body.location.lng) || notifications[index].location?.lng || null,
        }
      : notifications[index].location || null;

    notifications[index] = {
      ...notifications[index],
      ...req.body,
      location: updatedLocation,
      shipmentStage: req.body.shipmentStage || notifications[index].shipmentStage,
      status: req.body.status || notifications[index].status,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
    res.json({ success: true, order: notifications[index] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
