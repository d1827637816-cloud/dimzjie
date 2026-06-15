const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

const notificationsFile = path.join(__dirname, 'checkout-notifications.json');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

function saveNotification(data) {
  const existing = fs.existsSync(notificationsFile)
    ? JSON.parse(fs.readFileSync(notificationsFile, 'utf-8'))
    : [];
  existing.push(data);
  fs.writeFileSync(notificationsFile, JSON.stringify(existing, null, 2));
}

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
      status: req.body.status || 'menunggu konfirmasi',
      createdAt: req.body.createdAt || new Date().toISOString(),
      proofPath: req.file ? `/uploads/${req.file.filename}` : null,
      proofName: req.file ? req.file.originalname : null,
    };
    saveNotification(notification);
    console.log('Notifikasi checkout baru:', notification);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
