# dimzjie_outfit
Toko baju lokal dengan checkout manual dan integrasi Stripe.

## Konfigurasi

1. Salin `.env.example` ke `.env`.
2. Tambahkan `STRIPE_SECRET_KEY` Anda di `.env`.
3. Jalankan server:

```bash
npm install
npm start
```

## Checkout Gateway

- Halaman `checkout.html` sekarang mendukung:
  - Transfer manual dengan bukti transfer
  - Pembayaran kartu melalui Stripe Checkout
- Stripe hanya bekerja saat `STRIPE_SECRET_KEY` tersedia di server.
- Setelah pembayaran sukses, user akan diarahkan ke `confirm.html`.
