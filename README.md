<div align="center">

# ⚔️ War12x12 — Realtime Battles

**Bài tập giữa kì môn Lập trình mạng**

Game bắn chiến thuật trên bàn cờ **12×12**, chạy **realtime** với **Socket.IO**.
Frontend **React + Vite (TypeScript, Zustand, Tailwind)** • Backend **Node.js + Express + Socket.IO**

[![Node.js](https://img.shields.io/badge/node-%E2%89%A518+-brightgreen?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18+-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/vite-5+-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/ts-5+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socketdotio)](https://socket.io/)
[![License](https://img.shields.io/badge/license-edu_demo-lightgrey.svg)](#-license)

</div>

<p align="center">
  <img src="client/public/cover.png" alt="War12x12 Cover" width="860"/>
  <br/>
  <em>(đặt ảnh/ảnh động demo vào <code>client/public/cover.png</code> hoặc <code>docs/demo.gif</code>)</em>
</p>

---

## Mục lục

* [🌟 Tính năng](#-tính-năng)
* [🧰 Công nghệ](#-công-nghệ)
* [🗂 Cấu trúc dự án](#-cấu-trúc-dự-án)
* [✅ Yêu cầu](#-yêu-cầu)
* [🚀 Cài đặt & Chạy (Development)](#-cài-đặt--chạy-development)
* [🏗 Build & Chạy Production](#-build--chạy-production)
* [🎮 Cách chơi](#-cách-chơi)
* [⌨️ Phím tắt](#️-phím-tắt)
* [🔧 Scripts mẫu](#-scripts-mẫu)
* [🧩 Cấu hình môi trường](#-cấu-hình-môi-trường)
* [🧭 Kiến trúc nhanh](#-kiến-trúc-nhanh)
* [🐞 Lỗi thường gặp](#-lỗi-thường-gặp)
* [🗺 Lộ trình (Roadmap)](#-lộ-trình-roadmap)
* [🤝 Đóng góp](#-đóng-góp)
* [📄 License](#-license)

---

## 🌟 Tính năng

* Tạo/Vào phòng bằng **mã 6 số**, **chat** kèm emoji.
* Xoay **map ngẫu nhiên**: Sa mạc • Rừng rậm • Thảo nguyên • Băng giá.
* Pha **xếp quân** có preview vùng chiếm chỗ, **gỡ nhanh** (right–click), **Random xếp**.
* Vòng chơi theo lượt: **quay đạn (≤15s)** → **chọn hướng** → **bắn (≤60s)**.
* Kết thúc & popup **Chúc mừng/Chia buồn**, chọn **Chơi lại** (rematch) hoặc **Thoát**.
* Điều kiện thắng: **Hạ Chỉ huy**, **bỏ lượt 3 lần**, **đối thủ rời trận**, **hết giờ**, **diệt mục tiêu**.

---

## 🧰 Công nghệ

* **Client:** React + Vite (TS), Zustand, TailwindCSS, react-hot-toast
* **Server:** Node.js, Express, Socket.IO

---

## 🗂 Cấu trúc dự án

```bash
War12x12/
├── server/                          # Backend (Node.js + Express + Socket.IO)
│   ├── index.js                     # Điểm vào chính của server
│   ├── package.json                 # Scripts & dependencies cho server
│   └── ...                          # utils/, services/, models/ (tùy mở rộng)
│
├── client/                          # Frontend (React + Vite + TS)
│   ├── index.html                   # Template Vite
│   ├── package.json                 # Scripts & dependencies cho client
│   ├── public/                      # Static assets (favicon, logo, cover.png…)
│   └── src/
│       ├── main.tsx                 # Entry React, mount App
│       ├── App.tsx                  # Root component
│       ├── store.ts                 # Zustand store + Socket wiring
│       ├── types.ts                 # Kiểu TS dùng chung
│       ├── index.css                # CSS global + board styles
│       └── components/              # UI components
│           ├── BattleUI.tsx         # HUD chính khi vào trận
│           ├── BoardEditor.tsx      # Giao diện xếp quân
│           ├── BoardGrid.tsx        # Vẽ lưới 12×12
│           ├── ChatPanel.tsx        # Chat + emoji
│           ├── LegendBar.tsx        # Thanh legend hiển thị quân/đạn
│           └── MapSpinner.tsx       # Spinner xoay map ngẫu nhiên
│
├── .gitignore                       # Bỏ qua node_modules, build, env...
├── README.md                        # (tệp bạn đang xem)
└── LICENSE                          # (giấy phép/ghi chú sử dụng)
```

---

## ✅ Yêu cầu

* **Node.js ≥ 18** (khuyến nghị LTS 20)
* **npm** (hoặc pnpm/yarn)
* Cổng mặc định:

  * **Server:** `3000`
  * **Client (Vite dev):** `5173`

---

## 🚀 Cài đặt & Chạy (Development)

> Mở **2 cửa sổ terminal**: một cho `server/`, một cho `client/`.

### 1) Backend (server)

```bash
cd server
npm i
# Dev (nên dùng nếu có nodemon):
npm run dev
# Hoặc chạy trực tiếp:
node index.js
```

Đặt cổng tuỳ chọn:

```bash
# macOS/Linux
PORT=3000 node index.js

# Windows PowerShell
$env:PORT=3000; node index.js
```

### 2) Frontend (client)

```bash
cd client
npm i
npm run dev
# Vite mở http://localhost:5173
```

Nếu server **KHÔNG** chạy ở `http://localhost:3000`, tạo `client/.env`:

```env
VITE_WS_URL="http://<ip-hoac-domain>:3000"
```

> Client tự đọc `VITE_WS_URL`; nếu **không** có, mặc định `http://localhost:3000`.

---

## 🏗 Build & Chạy Production

**Client (build tĩnh):**

```bash
cd client
npm run build
npm run preview        # xem thử bản build
# Hoặc serve thư mục client/dist bằng Nginx/Netlify/S3…
```

**Server (prod):**

```bash
cd server
npm ci --omit=dev
node index.js
```

> Khi deploy: đảm bảo **VITE\_WS\_URL** trỏ đúng domain WS rồi **build lại client**.

---

## 🎮 Cách chơi

1. **Vào game**

   * Nhập **tên** → **Tạo phòng** hoặc **Vào phòng** bằng mã **6 số**.
   * Trong **Lobby**: cả 2 người **Sẵn sàng** để bắt đầu.

2. **Xếp quân (120s)**

   * Map ngẫu nhiên → lưới **12×12**.
   * Chọn đơn vị, click để đặt; **Q** xoay trái, **E/R** xoay phải.
   * **Right–click** để gỡ nhanh; có **Random xếp**.
   * Bấm **Sẵn sàng** khi đủ số lượng.

3. **Đến lượt bạn**

   * **Space** để **quay đạn** (≤15s).
   * Chọn hướng (Q/E/R) → click ô mục tiêu để bắn (≤60s).

4. **Loại đạn**

   * `1x1`, `1x2`, `1x3`: bắn thẳng theo hướng.
   * `2x2`: nổ hình vuông 2×2.
   * `burst`: nổ ngẫu nhiên quanh tâm.
   * `radar`: quét 5 ô theo hướng (không sát thương).

5. **Kết thúc trận**

   * Thắng khi: hạ **Chỉ huy**, **bỏ lượt 3 lần**, **đối thủ rời trận**, **hết giờ**, hoặc **diệt mục tiêu**.
   * Popup: **Chúc mừng/Chia buồn** → **Chơi lại** hoặc **Thoát**.

6. **Chat & Emoji**

   * Chat dưới khung, Enter để gửi.
   * Emoji nhanh: 😄 😡 😢 🔥 ❌ 😜 🍬

---

## ⌨️ Phím tắt

| Phím            | Tác dụng                          |
| --------------- | --------------------------------- |
| **Q**           | Xoay trái (đặt quân / chọn hướng) |
| **E** / **R**   | Xoay phải                         |
| **Space**       | Quay đạn (đến lượt)               |
| **Right–click** | Gỡ nhanh toàn đơn vị tại vị trí   |

---

## 🔧 Scripts mẫu

**server/package.json**

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  }
}
```

**client/package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173"
  }
}
```

---

## 🧩 Cấu hình môi trường

Tạo các file `.env` (tuỳ nhu cầu):

**server/.env**

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**client/.env**

```env
# khi server không ở localhost:3000
VITE_WS_URL="http://<ip-hoac-domain>:3000"
```

> Nếu đổi `VITE_WS_URL`, **build lại** client trước khi deploy.

---

## 🧭 Kiến trúc nhanh

```
[ Client (React + Vite) ]
        │   ↑  Socket.IO (WebSocket)
   HTTP │   │
        ↓   │
[ Server (Express + Socket.IO) ]  ——  State phòng/luật chơi/timer
```

---

## 🐞 Lỗi thường gặp

* **Client không kết nối WS**

  * Kiểm tra `VITE_WS_URL` ở client.
  * Kiểm tra `CORS_ORIGIN` ở server.

* **Chat bị lặp tin**

  * Không mở nhiều tab dev Vite cùng lúc.
  * `store.ts` có cờ `__WAR12_SOCKET_WIRED__` tránh gắn socket trùng.

* **Lưới lệch khi zoom**

  * CSS dùng `.board-tight`; hard-reload/Clear cache nếu cần.

* **Không đặt được đơn vị**

  * Báo “Ra ngoài bản đồ”, “Dính vật cản”… → đổi vị trí/hướng.
  * Dùng **Random xếp** để hệ thống tự đặt hợp lệ.

* **Port bận**

  * Đổi `PORT` server hoặc `vite preview --port 5174`.

---

## 🗺 Lộ trình (Roadmap)

* [ ] Hiệu ứng nổ/âm thanh bắn.
* [ ] Spectator/khán giả phòng.
* [ ] Lưu replays / share mã trận.
* [ ] Matchmaking cơ bản.
* [ ] Bot thử nghiệm (đặt quân, bắn ngẫu nhiên).

---

## 🤝 Đóng góp

Đóng góp ideas/bugfix rất hoan nghênh.
Tạo **issue** hoặc **PR** theo mô tả rõ ràng (môi trường, bước tái hiện, ảnh/ví dụ…).

---

## 📄 License

Demo phục vụ **mục đích học tập** (đặc biệt cho *Bài tập giữa kì môn Lập trình mạng*).
Vui lòng kiểm tra license của các thư viện phụ thuộc trước khi dùng cho mục đích thương mại.
