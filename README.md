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

เปิด terminal ที่ root ของโปรเจกต์แล้วรัน:

```bash
pnpm dev
```

คำสั่งนี้เปิดทั้ง Vite และ API server ในเครื่อง. เปิด `http://localhost:5173`; Vite ส่งคำขอ `/api/*` ไป server ที่ `http://localhost:3001`. หากต้องการแยกรันสอง terminal ใช้ `pnpm dev:web` กับ `pnpm dev:server`. ทดสอบ server ได้ที่ `http://localhost:3001/api/health`. คำสั่ง `pnpm test` ยังใช้ไม่ได้จนกว่าจะเพิ่มไฟล์ทดสอบที่อ้างใน `package.json`.

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

ใน Supabase Dashboard → Authentication → URL Configuration ตั้ง **Site URL** เป็น URL ของเว็บจริง และเพิ่ม `http://localhost:5173/reset-password` กับ URL production ของหน้า `/reset-password` ใน Redirect URLs. ฝั่ง server ส่ง `redirect_to` เป็น URL ของหน้า reset ตาม Origin ของเว็บที่เรียกใช้งาน จึงใช้ทั้ง dev และ production ได้. **แพ็กเกจ Free ใช้อีเมลเทมเพลตเริ่มต้นได้เลย**; หน้า Reset รองรับ session token ที่ Supabase ส่งกลับใน URL fragment และลบ fragment ออกจากแถบ URL ทันที. Browser ส่ง access token ให้ server เฉพาะคำขอตั้งรหัสผ่านใหม่; server ติดต่อ Supabase Auth และออกจาก recovery session หลังสำเร็จ. ไม่เก็บ token ใน localStorage หรือ cookie ของ browser.

หากใช้ Custom SMTP หรือแพ็กเกจที่แก้ Email Template ได้ สามารถเปลี่ยนลิงก์ของปุ่ม **Reset Password** เป็นรูปแบบ `token_hash` เพื่อให้ browser ไม่ได้รับ session token:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">ตั้งรหัสผ่านใหม่</a>
```

หน้า `/forgot-password` เรียก server เพื่อให้ Supabase ส่งอีเมล. หลังตั้งรหัสใหม่ ผู้ใช้เข้าสู่ระบบอีกครั้ง. ต้องทดสอบด้วยอีเมลจริง; บริการส่งอีเมลเริ่มต้นของ Supabase อาจมีข้อจำกัดการส่งและควรตั้ง SMTP ก่อนใช้งานจริง. อย่าส่ง URL ที่มี token ให้ผู้อื่นหรือวางใน issue/chat.

## Build และรันแบบ production

```bash
pnpm build
pnpm start
```

เปิด `http://localhost:3001`. Server เสิร์ฟไฟล์ใน `dist/` และส่ง `index.html` กลับสำหรับ frontend routes เพื่อให้เปิด URL ตรงหรือรีเฟรชได้. กำหนดพอร์ต server ผ่าน `SERVER_PORT` ได้

### ตัวเลือกการ Deploy บน Production Host

โปรเจกต์นี้รวม Express Backend และ Single-Page Application (SPA) ไว้ด้วยกัน สามารถนำไป deploy ได้บนโฮสต์หลากหลายประเภทที่รองรับ Node.js (v20+):

1. **Vercel (Serverless):**
   - โครงสร้างรองรับ Vercel แล้ว: `server/app.ts` สร้าง Express app, `server/index.ts` ใช้รัน local/Node server และ `api/index.ts` เป็น entry point สำหรับ Vercel Function
   - Import repo ที่ vercel.com/new — Vercel อ่าน `vercel.json` (build ด้วย `pnpm build`, เสิร์ฟ SPA จาก `dist/`, ส่ง `/api/*` ไปที่ Function)
   - ตั้ง Environment Variables ในโปรเจกต์: `DATABASE_URL`, `DATABASE_CA_CERT` (เนื้อหาของ `supabase/ca.crt`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `NODE_ENV=production`, `APP_ORIGIN=https://your-domain.vercel.app`
   - รัน local แบบเหมือน production ด้วย `vercel dev` หรือรัน Node server ปกติด้วย `pnpm build && pnpm start`
2. **PaaS (Render, Railway, Fly.io, Heroku):**
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`
   - **Environment Variables:** ตั้งค่า `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `NODE_ENV=production`, `APP_ORIGIN=https://your-domain.com`
2. **VPS (Ubuntu / Debian + PM2 + Nginx):**
   - รัน `pnpm build` แล้วใช้ `pm2 start dist-server/server/index.js --name "movie-web"`
   - ตั้งค่า Nginx Reverse Proxy ไปยัง `http://127.0.0.1:3001` พร้อมติดตั้ง SSL (Let's Encrypt / Certbot)
4. **Docker Container:**
   - สามารถสร้าง multi-stage Dockerfile รัน `pnpm build` และ `node dist-server/server/index.js`


## โครงสร้าง

| ตำแหน่ง | หน้าที่ |
| --- | --- |
| `src/app/` | จับคู่ URL กับ View และ layout |
| `src/view/` | หน้า Home, Movie, Series, Animation, Detail, Search, Login, Signup |
| `src/component/` | Navbar, TitleCard, TitleShelf, TitleGrid และส่วนประกอบที่ใช้ซ้ำ |
| `src/api/` | Axios client และฟังก์ชันเรียก TMDB API ผ่าน server |
| `src/types/` | ชนิดข้อมูลตาม architecture contract |
| `server/app.ts` | สร้าง Express app ที่ใช้ร่วมกันทั้ง local และ serverless |
| `server/index.ts` | start server บน local/Node host เสิร์ฟ `dist/` และ SPA fallback |
| `api/index.ts` | entry point สำหรับ Vercel Function |
| `vercel.json` | ตั้งค่า build, routing `/api/*` และ SPA fallback บน Vercel |
| `server/routes/` | HTTP routes สำหรับ health, titles, auth, favorites และ reviews |
| `server/services/` | ติดต่อ TMDB, Supabase Auth, database pool และอ่าน Vault |
| `server/middleware/` | จัดรูปแบบ API error |

ไฟล์ `.env` ถูก ignore. `DATABASE_URL` เป็นค่า server-only; ตัวแปร `VITE_` จะอยู่ใน frontend bundle จึงใช้ได้เฉพาะ Supabase URL และ publishable key ที่ตั้งใจให้เป็นสาธารณะ. DB-01 ใช้ migration ใน `supabase/migrations/` และมีผลการตรวจใน `supabase/DB-01_VERIFICATION.md`
