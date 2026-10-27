# 🚚 Field Force Management System

Distribution company ke liye field force app — attendance, GPS tracking, route management, fuel calculation.

---

## 🛠️ Setup (5 minutes)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
```

`.env` file mein apna MongoDB URI daalo:
```
MONGO_URI=mongodb://localhost:27017/field-force-db
JWT_SECRET=kuch_bhi_lamba_likho_yahan_12345
PORT=5000
```

```bash
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:3000` pe chalega.

---

## 🚀 First Time Setup

1. Browser mein jao: `http://localhost:3000/setup`
2. Admin account banao (naam, email, password)
3. Login karo

---

## 📋 Admin Workflow

1. **Settings** → Petrol price set karo (e.g. Rs. 280/liter)
2. **Shops** → Sab shops add karo GPS coordinates ke saath
3. **Employees** → Har employee add karo, bike average set karo
4. **Routes** → Route banao, shops add karo order mein, employee assign karo
5. **Dashboard** → Live dekho sab kuch

### GPS Coordinates kaise milein?
- Google Maps pe shop pe right-click → coordinates copy karo
- Ya admin panel mein shop add karte waqt "Meri Location Use Karo" button dabao

---

## 📱 Employee Workflow (Mobile)

1. `http://localhost:3000` pe login karo
2. **Check-In** button dabao → Live camera khulay ga → Photo lo → GPS auto-detect
3. GPS tracking automatically shuru ho jata hai
4. Route mein har shop pe jao → **📸 In** button → Live photo lo
5. Din ke akhir mein **Check-Out** → Tracking band, fuel calculate

---

## 🔒 Anti-Fake Features

| Feature | Kaise Kaam Karta Hai |
|---------|---------------------|
| Live Camera Only | `getUserMedia` use hota hai — gallery upload band |
| GPS Verification | Attendance pe GPS coordinates record hote hain |
| Shop Check-in Verify | 300m ke andar hona zaroori |
| Route Deviation | Har 30 sec GPS check — 600m+ pe alert |
| Duplicate Ban | Ek din mein ek shop pe sirf ek check-in |

---

## 📍 Deviation Zones

| Distance | Status |
|----------|--------|
| 0 – 500m | ✅ Safe — koi alert nahi |
| 500 – 600m | ⚠️ Buffer — gali/traffic ke liye |
| 600m+ | 🚨 Alert — admin ko notification |

---

## ⛽ Fuel Formula

```
Total KM ÷ Bike Average (km/L) = Liters Used
Liters Used × Petrol Price = Rs. Amount
```

**Example:** Ahmed ne 80km kiye, bike 50km/L, petrol Rs. 280/L
```
80 ÷ 50 = 1.6 liters
1.6 × 280 = Rs. 448
```

---

## 🗂️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT |
| Camera | getUserMedia API (live only) |
| GPS | Geolocation API + Haversine formula |
