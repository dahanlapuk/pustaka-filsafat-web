# Pustaka Filsafat - Frontend

Web application untuk sistem manajemen perpustakaan Program Studi Ilmu Filsafat FIB UI.

## Tech Stack

- **Vue 3** - Composition API dengan `<script setup>`
- **Vite** - Build tool
- **Vue Router** - Routing
- **Axios** - HTTP client

## Setup

### 1. Prerequisites

- Node.js 18+
- npm atau yarn

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi API

Edit `src/api/index.js` jika backend berjalan di port/host berbeda:

```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})
```

### 4. Development Server

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:5173`

### 5. Build Production

```bash
npm run build
```

Output di folder `dist/`

## Fitur

### Public
- Katalog buku (pencarian, filter kategori)
- Detail buku
- Status peminjaman

### Admin Panel (`/admin`)
- Login dengan password (bcrypt)
- Dashboard statistik
- Kelola buku (CRUD)
- Kelola peminjaman
- Absen buku / inventaris
- Log aktivitas
- Profil admin

## Struktur Folder

```
frontend/
├── public/           # Static assets
├── src/
│   ├── api/          # API client
│   ├── assets/       # CSS, images
│   ├── components/   # Reusable components
│   ├── pages/        # Page components
│   ├── stores/       # State management
│   ├── App.vue       # Root component
│   ├── main.js       # Entry point
│   └── router.js     # Route definitions
├── index.html
├── package.json
└── vite.config.js
```

## Admin Accounts

| Nama | ID | Role |
|------|-----|------|
| Itba Muhammad Kamil | itba | Superadmin |
| Rajendra Rafi Atallah | rajendra | Admin |
| Ikha Putri | ikhaputri | Admin |

## License

MIT
