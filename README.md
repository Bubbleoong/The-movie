# The Movie Web

โครงโปรเจกต์ React + TypeScript + Vite ตาม [ARCH-01_CONTRACT.md](./ARCH-01_CONTRACT.md) และ [PROJECT_TICKETS.md](./PROJECT_TICKETS.md)

## สถานะ

ทุก Ticket ตั้งแต่ ARCH-01 ถึง RELEASE-01 เสร็จสมบูรณ์แล้ว:
- หน้า Home และหน้าหมวด Movie, Series, Animation แสดงข้อมูลจาก TMDB ผ่าน server พร้อมรองรับภาพยนตร์และซีรีส์ในหน้า Animation
- ค้นหาจาก Navbar ได้ที่ `/search?q=...`
- หน้ารายละเอียด `/movie/:tmdbId` และ `/tv/:tmdbId` แสดงเรื่องย่อ ความยาว นักแสดง ทีมงาน คะแนน TMDB และ Trailer เมื่อมี พร้อมระบบ fallback เมื่อภาพเสีย
- AUTH-01 รองรับการสมัคร, ล็อกอิน, ล็อกเอาต์, session ผ่าน HttpOnly cookie และการกู้คืนรหัสผ่าน
- FAV-01 สมาชิกกด Favorite บน card/detail พร้อมการป้องกันการเข้าถึงข้ามบัญชีด้วย RLS
- REVIEW-01 สมาชิกเขียน แก้ไข ลบ และให้คะแนน 1–10 พร้อมแสดงคะแนนเฉลี่ยแยกจาก TMDB
- QA-01 ผ่านการทดสอบ Automated Test Suite 13 รายการ และทดสอบการทำงานจริงผ่าน Browser สำเร็จ
- RELEASE-01 มี `.env.example`, แสดงเครดิต TMDB และรองรับการ Deploy ทั้ง Node.js, Docker, Render, Railway, Fly.io หรือ VPS

## ติดตั้งและรันระหว่างพัฒนา

1. คัดลอก `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
2. ใส่ค่า `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` และ `DATABASE_URL` ใน `.env` (TMDB API Key จัดเก็บปลอดภัยใน Supabase Vault)
3. ติดตั้ง dependencies:
```bash
pnpm install
```

เปิดสอง terminal ที่ root ของโปรเจกต์:

```bash
pnpm dev:server
```

```bash
pnpm dev
```

เปิด `http://localhost:5173`. `pnpm dev:server` ใช้ nodemon เฝ้าไฟล์ใน `server/` และเริ่ม server ผ่าน tsx. Vite ส่งคำขอ `/api/*` ไป server ที่ `http://localhost:3001`. ทดสอบ server ได้ที่ `http://localhost:3001/api/health`. รัน automated tests ได้ด้วยคำสั่ง `pnpm test`.

Server อ่าน TMDB API key จาก Supabase Vault ชื่อ `tmdb_api_key`. `.env` ต้องมี `DATABASE_URL`, `VITE_SUPABASE_URL` และ `VITE_SUPABASE_PUBLISHABLE_KEY`; ไม่มี `API_KEY` แล้ว. การเชื่อม PostgreSQL ตรวจ TLS ด้วย CA ที่ `supabase/ca.crt`. อย่าส่ง `DATABASE_URL` เข้า frontend หรือ commit `.env`. ใช้ endpoints:

| Endpoint | ผลลัพธ์ |
| --- | --- |
| `/api/titles/popular?mediaType=movie&page=1` | Movie ยอดนิยม |
| `/api/titles/popular?mediaType=tv&page=1` | Series ยอดนิยม |
| `/api/titles/animation?page=1` | Animation ทุกประเทศ รวม movie/tv |
| `/api/titles/search?q=avatar&page=1` | ค้นหา movie/tv |
| `/api/titles/movie/550` | รายละเอียด movie พร้อม credits/videos |
| `/api/titles/tv/1396` | รายละเอียด tv พร้อม credits/videos |
| `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | สมัครสมาชิก, เข้า/ออกระบบ และตรวจ session |
| `/api/auth/recover`, `/api/auth/reset-password` | ขออีเมลกู้คืน และตั้งรหัสผ่านใหม่ |
| `GET /api/favorites`, `PUT/DELETE /api/favorites/:mediaType/:tmdbId` | รายการโปรดของสมาชิก เพิ่มและยกเลิกโดยใช้ session และ RLS |
| `GET /api/titles/:mediaType/:tmdbId/reviews?page=1` | รีวิว 10 รายการต่อหน้า พร้อมคะแนนเฉลี่ยและจำนวน |
| `GET/PUT/DELETE /api/titles/:mediaType/:tmdbId/my-review` | อ่าน เขียน/แก้ และลบรีวิวของตนเอง |
| `DELETE /api/titles/:mediaType/:tmdbId/reviews/:reviewId` | เจ้าของหรือผู้ดูแลลบรีวิวตามสิทธิ RLS |

API ส่งรูปแบบ `{ data, page, totalPages, hasMore }` สำหรับรายการ และ `{ data }` สำหรับรายละเอียด. ข้อผิดพลาดส่ง `{ error: { code, message } }`. `src/api/titles.ts` เป็น Axios functions ที่ view ใช้เรียก server

### ตั้งค่าอีเมลลืมรหัสผ่าน

ใน Supabase Dashboard → Authentication → URL Configuration ตั้ง **Site URL** เป็น URL ของเว็บ เช่น `http://localhost:5173` ระหว่างพัฒนา และเพิ่ม URL นี้ในรายการที่อนุญาต. เมื่อ deploy ให้เปลี่ยนเป็น URL เว็บจริง จากนั้นไปที่ Authentication → Email Templates → **Reset Password** แล้วเปลี่ยนเฉพาะลิงก์ของปุ่มเป็น:

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery">ตั้งรหัสผ่านใหม่</a>
```

หน้า `/forgot-password` เรียก server เพื่อให้ Supabase ส่งอีเมล. เมื่อผู้ใช้กดลิงก์ หน้า `/reset-password` รับ `token_hash` แล้วส่งให้ server ตรวจและเปลี่ยนรหัสผ่านด้วย Supabase Auth; token และ session ไม่ถูกส่งกลับเป็น JSON ให้ browser. หลังสำเร็จ ผู้ใช้เข้าสู่ระบบใหม่. ต้องทดสอบด้วยอีเมลจริงหลังตั้งค่า template; บริการส่งอีเมลเริ่มต้นของ Supabase อาจมีข้อจำกัดการส่งและควรตั้ง SMTP ก่อนใช้งานจริง.

## Build และรันแบบ production

```bash
pnpm build
pnpm start
```

เปิด `http://localhost:3001`. Server เสิร์ฟไฟล์ใน `dist/` และส่ง `index.html` กลับสำหรับ frontend routes เพื่อให้เปิด URL ตรงหรือรีเฟรชได้. กำหนดพอร์ต server ผ่าน `SERVER_PORT` ได้

### ตัวเลือกการ Deploy บน Production Host

โปรเจกต์นี้รวม Express Backend และ Single-Page Application (SPA) ไว้ด้วยกัน สามารถนำไป deploy ได้บนโฮสต์หลากหลายประเภทที่รองรับ Node.js (v20+):

1. **PaaS (Render, Railway, Fly.io, Heroku):**
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`
   - **Environment Variables:** ตั้งค่า `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `NODE_ENV=production`, `APP_ORIGIN=https://your-domain.com`
2. **VPS (Ubuntu / Debian + PM2 + Nginx):**
   - รัน `pnpm build` แล้วใช้ `pm2 start dist-server/server/index.js --name "movie-web"`
   - ตั้งค่า Nginx Reverse Proxy ไปยัง `http://127.0.0.1:3001` พร้อมติดตั้ง SSL (Let's Encrypt / Certbot)
3. **Docker Container:**
   - สามารถสร้าง multi-stage Dockerfile รัน `pnpm build` และ `node dist-server/server/index.js`


## โครงสร้าง

| ตำแหน่ง | หน้าที่ |
| --- | --- |
| `src/app/` | จับคู่ URL กับ View และ layout |
| `src/view/` | หน้า Home, Movie, Series, Animation, Detail, Search, Login, Signup |
| `src/component/` | Navbar, TitleCard, TitleShelf, TitleGrid และส่วนประกอบที่ใช้ซ้ำ |
| `src/api/` | Axios client และฟังก์ชันเรียก TMDB API ผ่าน server |
| `src/types/` | ชนิดข้อมูลตาม architecture contract |
| `server/routes/` | HTTP routes สำหรับ health, titles, auth, favorites และ reviews |
| `server/services/` | ติดต่อ TMDB, Supabase Auth, database pool และอ่าน Vault |
| `server/middleware/` | จัดรูปแบบ API error |

ไฟล์ `.env` ถูก ignore. `DATABASE_URL` เป็นค่า server-only; ตัวแปร `VITE_` จะอยู่ใน frontend bundle จึงใช้ได้เฉพาะ Supabase URL และ publishable key ที่ตั้งใจให้เป็นสาธารณะ. DB-01 ใช้ migration ใน `supabase/migrations/` และมีผลการตรวจใน `supabase/DB-01_VERIFICATION.md`
