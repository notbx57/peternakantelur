# Peternakan Telur

Aplikasi manajemen peternakan telur dengan stack CEVN
# APLIKASI RILIS DI : https://peternakantelur.vercel.app/


C: Convex
E: Express.js
V: Vue.js
N: Node.js

## 📋 Prasyarat

- [Node.js](https://nodejs.org/) (versi 16 atau lebih baru)
- NPM (biasanya terinstall bersama Node.js)

## 🚀 Cara Menjalankan Project

### 1. Clone Repository

```bash
git clone https://github.com/notbx57/peternakantelur.git
cd peternakantelur
```

### 2. Setup Server dan Client

Masuk ke folder server, install dependencies, dan konfigurasi environment variables.

```bash
cd server
npm install
```

Kemudian masuk ke folder client, install dependencies, dan konfigurasi environment variables.

```bash
cd client
npm install
```

**Konfigurasi Environment Variables:**
 
tambahkan file bernama [.env.local] di folder /server saja. Tambahkan variabel dibawah ini
```
CONVEX_DEPLOYMENT=dev:limitless-fly-244 # team: rayyen, project: peternakantelur
CONVEX_URL=https://limitless-fly-244.convex.cloud
SESSION_SECRET=GENERATE SENDIRI
JWT_SECRET=GENERATE SENDIRI (BEDA SAMA SESSION SECRET)
```
Untuk Secret, Mohon Generate dengan command dibawah ini (Paste di CMD/Terminal) :
```
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"
```
### 3. Jalankan Server

Ada 3 terminal yang harus dijalankan terpisah

1. Convex :
   ```bash
   cd server
   npx convex dev
   ```
2. Client :
   ```bash
   cd client
   npm run dev
   ```
3. Server :
   ```bash
   cd server
   npm run dev
   ```

Aplikasi client akan berjalan di `http://localhost:5173`.

## 🛠 Project Structure

- **client/**: Frontend menggunakan Vue 3 + Vite + Tailwind CSS.
- **server/**: Backend menggunakan Express.js dan database Convex.
