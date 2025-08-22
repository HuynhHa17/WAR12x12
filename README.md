Bạn đã viết sẵn cấu trúc và hướng dẫn khá chi tiết rồi 👍. Dưới đây mình gom lại thành một file **`README.md`** hoàn chỉnh, bạn chỉ cần copy về dự án:

```markdown
# War12x12 — Realtime Battles

Game bắn chiến thuật trên bàn cờ **12×12** chạy realtime bằng **Socket.IO**.  
Frontend **React + Vite (TypeScript, Zustand, Tailwind)**, backend **Node.js + Express + Socket.IO**.

---

## 🌟 Tính năng

- Tạo phòng / vào phòng bằng **mã 6 số**, chat kèm **emoji**.
- Xoay map ngẫu nhiên: Sa mạc, Rừng rậm, Thảo nguyên, Băng giá.
- Pha **xếp quân** có xem trước vùng chiếm chỗ, gỡ nhanh bằng chuột phải, **Random xếp**.
- Vòng chơi theo lượt: **quay đạn (≤15s)** → **chọn hướng** → **bắn (≤60s)**.
- Kết thúc & popup **Chúc mừng/Chia buồn**, **Chơi lại** (rematch) hoặc **Thoát**.
- Điều kiện thắng: **Hạ Chỉ huy**, **bỏ lượt 3 lần**, **đối thủ rời trận**, **hết giờ**, hoặc **diệt mục tiêu**.

---

## 🧰 Công nghệ

- **Client:** React + Vite (TS), Zustand, TailwindCSS, react-hot-toast
- **Server:** Node.js, Express, Socket.IO

---

## 🗂 Cấu trúc dự án

```bash
War12x12/
├── server/                         # Backend (Node.js + Express + Socket.IO)
│   ├── index.js                    # Điểm vào chính của server
│   ├── package.json                # Script & dependencies cho server
│   └── ...                         # (có thể thêm utils/, services/, models/ sau này)
│
├── client/                         # Frontend (React + Vite + TS)
│   ├── index.html                  # Template chính cho Vite
│   ├── package.json                # Script & dependencies cho client
│   ├── public/                     # Static assets (favicon, logo…)
│   └── src/
│       ├── main.tsx                # Entry React, mount App
│       ├── App.tsx                 # Root component
│       ├── store.ts                # Zustand store + Socket wiring
│       ├── types.ts                # Định nghĩa TypeScript chung
│       ├── index.css               # CSS global + board styles
│       │
│       ├── components/             # Các UI components
│       │   ├── BattleUI.tsx        # HUD chính khi vào trận
│       │   ├── BoardEditor.tsx     # Giao diện xếp quân
│       │   ├── BoardGrid.tsx       # Vẽ lưới 12×12
│       │   ├── ChatPanel.tsx       # Chat + emoji
│       │   ├── LegendBar.tsx       # Thanh legend hiển thị quân/đạn
│       │   └── MapSpinner.tsx      # Spinner xoay map ngẫu nhiên
│       │
│       └── assets/                 # Icon, ảnh nền, audio (nếu có)
│
├── .gitignore                      # Ignore node_modules, build, env...
├── README.md                       # Hướng dẫn (tệp bạn đang xem)
└── LICENSE                         # License dự án


---

## ✅ Yêu cầu

- **Node.js 18+** (khuyến nghị LTS)
- **npm** (hoặc pnpm/yarn)
- Cổng mặc định:
  - **Server:** `3000`
  - **Client (Vite dev):** `5173`

---

## 🚀 Cài đặt & Chạy (Development)

> Mở **2 cửa sổ terminal**: một cho `server/`, một cho `client/`.

### 1) Backend (server)

```bash
cd server
npm i
# Dev (khuyên dùng nếu có nodemon):
npm run dev
# Hoặc chạy trực tiếp:
node index.js
````

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
```

Tạo file **client/.env** nếu server KHÔNG chạy ở `http://localhost:3000`:

```env
VITE_WS_URL="http://<ip-hoặc-domain>:3000"
```

Chạy dev:

```bash
npm run dev
# Vite mở http://localhost:5173
```

> Client tự dùng `VITE_WS_URL`; nếu **không** có, mặc định `http://localhost:3000`.

---

## 🏗 Build & Chạy Production

**Client (build tĩnh):**

```bash
cd client
npm run build
npm run preview           # xem thử bản build
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

   * Map ngẫu nhiên → xuất hiện lưới **12×12**.
   * Chọn loại đơn vị, click lên lưới để đặt.
   * **Xoay hướng:** `Q` (trái), `E/R` (phải).
   * **Right-click** để gỡ nhanh đơn vị.
   * **Random xếp** để hệ thống tự đặt hợp lệ.
   * Bấm **Sẵn sàng** khi đủ số lượng.

3. **Đến lượt bạn**

   * Bấm **Space** để **quay đạn** (≤15s).
   * Chọn hướng (Q/E/R) → click ô mục tiêu để bắn (≤60s).

4. **Loại đạn**

   * `1x1`, `1x2`, `1x3`: bắn thẳng theo hướng.
   * `2x2`: nổ hình vuông 2×2.
   * `burst`: nổ ngẫu nhiên quanh tâm.
   * `radar`: quét 5 ô theo hướng (không sát thương).

5. **Kết thúc trận**

   * Điều kiện thắng: hạ Chỉ huy, bỏ lượt 3 lần, đối thủ rời trận, hết giờ, hoặc diệt mục tiêu.
   * Hiện popup: **Chúc mừng/Chia buồn**, chọn **Chơi lại** hoặc **Thoát**.

6. **Chat & Emoji**

   * Chat dưới khung, Enter để gửi.
   * Emoji nhanh: 😄 😡 😢 🔥 ❌ 😜 🍬

---

## ⌨️ Phím tắt

| Phím            | Tác dụng                              |
| --------------- | ------------------------------------- |
| **Q**           | Xoay trái (khi đặt quân / chọn hướng) |
| **E** / **R**   | Xoay phải                             |
| **Space**       | Quay đạn (đúng lượt)                  |
| **Right-click** | Gỡ nhanh toàn đơn vị tại vị trí       |

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

## 🐞 Lỗi thường gặp

* **Client không kết nối WS**

  * Kiểm tra `VITE_WS_URL`.
  * Kiểm tra CORS trên server.

* **Chat bị lặp tin**

  * Tránh chạy nhiều tab dev.
  * `store.ts` có cờ `__WAR12_SOCKET_WIRED__`.

* **Lưới lệch khi zoom**

  * CSS dùng `.board-tight`.
  * Hard-reload nếu vẫn lỗi.

* **Không đặt được đơn vị**

  * Báo “Ra ngoài bản đồ”, “Dính vật cản”… → đổi vị trí/hướng.
  * Dùng **Random xếp**.

* **Port bận**

  * Đổi `PORT` server hoặc `vite preview --port 5174`.

---

## 🤝 Đóng góp

* Tạo branch `feature/<ten-tinh-nang>`, commit nhỏ gọn.
* PR kèm mô tả + ảnh/clip nếu có.

---

## 📄 License

Demo phục vụ mục đích học tập.
Vui lòng kiểm tra license của các thư viện phụ thuộc trước khi dùng thương mại.

```

---

Bạn muốn mình tối ưu README này theo **style GitHub chuyên nghiệp** (có badge, ảnh minh hoạ, demo gif) không?
```
