# War12x12 — Realtime Battles

Trò chơi bắn chiến thuật 12x12 chạy realtime qua **Socket.IO**.  
Gồm 2 phần:
- **server/**: Node.js + Express + Socket.IO (WS)
- **client/**: React + Vite (TS), Zustand, Tailwind

## 1) Yêu cầu
- **Node.js 18+** (khuyên dùng LTS)
- **npm** (hoặc pnpm/yarn nếu bạn thích)
- Cổng mặc định:
  - Server: **3000**
  - Client (Vite dev): **5173**

## 2) Cài đặt nhanh (Development)

> Mở 2 cửa sổ terminal (một cho server, một cho client).

### Server
```bash
cd server
npm i
# Dev run (nếu đã có nodemon):
# npm run dev
# Hoặc chạy trực tiếp:
node index.js

### Client
```bash
cd client
npm i
# Dev run (nếu đã có nodemon):
# npm run dev
# Hoặc chạy trực tiếp:
node index.js