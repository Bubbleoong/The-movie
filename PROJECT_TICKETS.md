# The Movie Web — Architecture และ Tickets

สถานะตรวจสอบ ณ 2026-10-01: **ARCH-01 ถึง DB-01, FAV-01 และ REVIEW-01 ผ่านการตรวจตาม ticket; AUTH-01 ยังต้องทดสอบอีเมลกู้คืนและขั้นตอนสมาชิกที่เหลือ; QA-01 และ RELEASE-01 ยังไม่ปิดงาน**
ขอบเขต: เว็บข้อมูล Movie, Series และ Anime/Cartoon จาก TMDB; สมาชิกใช้ Supabase Auth เพื่อบันทึก Favorite และเขียนรีวิว ไม่มีการสตรีมหนัง

## 1. ข้อตกลงด้าน Architecture

ใช้ React + TypeScript ฝั่งเว็บ, Axios ติดต่อ API ของโปรเจกต์, server ติดต่อ TMDB และ Supabase ข้อมูลเรื่องไม่ต้องนำเข้าฐานข้อมูลล่วงหน้า TMDB เป็นแหล่งข้อมูลหลักของเรื่อง; Supabase เก็บบัญชี Favorite และรีวิว

```text
src/
  app/         กำหนด route, layout, provider และเรียก view ของแต่ละหน้า
  view/        ประกอบ component เป็น Home, Movie, Series, Animation, Detail, Auth
  component/   UI ที่ใช้ซ้ำและ feature component เช่น Navbar, TitleCard, DetailCard, Search, ReviewForm
  api/         Axios instance, endpoint functions, แปลง response/error ของ server
  types/       ชนิดข้อมูลร่วมของ title, detail, media identity, favorite, review และ API response
  lib/         utility ที่ใช้ร่วมกันเมื่อจำเป็นเท่านั้น เช่น format date/image URL
server/
  routes/      HTTP routes และการตรวจ input
  services/    ติดต่อ TMDB, Supabase และกฎของแอป
  middleware/  ตรวจ session/ตัวตนและจัดการ error
supabase/
  migrations/  schema, constraint, index และสิทธิ์ฐานข้อมูล
```

กฎขอบเขต:

- `app/` จัด route/layout แล้ว render `view/`; ไม่เรียก TMDB หรือฐานข้อมูลเอง
- `view/` ประกอบหน้าและจัดสถานะของหน้านั้น; ใช้ฟังก์ชันใน `api/` เพื่อโหลดหรือเปลี่ยนข้อมูล
- `component/` รับข้อมูลผ่าน props และส่ง event กลับ; component ที่ใช้ซ้ำไม่เรียกฐานข้อมูลเอง
- `api/` เป็นทางเข้าของ HTTP ฝั่งเว็บ ใช้ Axios เรียก `server/`; ไม่เก็บ TMDB secret ใน bundle
- `server/` เป็นผู้ติดต่อ TMDB และ Supabase, ตรวจ input และสิทธิ์ก่อนเขียนข้อมูล; ไม่เชื่อ `user_id` ที่ client ส่งมา
- `types/` นิยามข้อมูลระหว่างชั้น; `lib/` สร้างเฉพาะเมื่อมี utility ที่ใช้ซ้ำจริง
- แยก `TitleSummary` สำหรับ card ออกจาก `TitleDetail` สำหรับหน้ารายละเอียด การกด card ต้องเรียก detail endpoint ตาม media type และ TMDB ID ใหม่
- รหัสอ้างอิงเรื่องคือ `(media_type, tmdb_id)` โดย `media_type` เป็น `movie` หรือ `tv`; หมวด Anime/Cartoon เป็นหมวดแสดงผลที่รวมแอนิเมชันทุกประเทศและอาจมีได้ทั้ง movie และ tv

## 2. หน้าและเส้นทางที่ตั้งใจใช้

| Route | View | เนื้อหา |
| --- | --- | --- |
| `/` | Home | แถว Movie, Series และ Anime/Cartoon ยอดนิยม |
| `/movies` | Movie | รายการภาพยนตร์ |
| `/series` | Series | รายการซีรีส์ |
| `/animation` | Animation | รายการแอนิเมชันทุกประเทศ ทั้ง movie และ tv |
| `/movie/:tmdbId` | Detail | รายละเอียดภาพยนตร์จาก TMDB detail endpoint |
| `/tv/:tmdbId` | Detail | รายละเอียดซีรีส์จาก TMDB detail endpoint |

ทุกหน้าเนื้อหามี Navbar: ชื่อเว็บ, ลิงก์ Home/Movie/Series/Anime-Cartoon, ช่องค้นหา, Login และ Sign up หรือสถานะบัญชีหลังล็อกอิน ผู้เยี่ยมชมเปิดดูรายการและรายละเอียดได้โดยไม่ต้องเข้าสู่ระบบ

Search ใน Navbar ไปยัง `/search?q=...` และแสดงผลด้วย `SearchView` โดยใช้ `TitleCard` เดิม. `/login` และ `/signup` เป็น route แยกเพื่อรองรับการกลับหน้าที่เริ่มกด Favorite/Review

รายละเอียด route, type, API, cookie session และการรวม Animation อยู่ใน [ARCH-01_CONTRACT.md](./ARCH-01_CONTRACT.md) ซึ่งเป็น contract ที่อนุมัติแล้ว. Server เป็นผู้ติดต่อ Supabase Auth/DB; browser ติดต่อ server ผ่าน Axios เท่านั้น. หน้า Animation รวม movie/tv ในรายการเดียว และ Home รวมสองประเภทในแถว Animation

## 3. ข้อมูลที่ใช้

- **Title Card:** media type, TMDB ID, ชื่อ, วันฉาย/วันออกอากาศ, โปสเตอร์, คะแนน TMDB เท่าที่ list endpoint ส่งมา
- **Title Detail:** เรียก TMDB detail ตาม `(media_type, tmdb_id)` แยกจาก list; แสดงชื่อ, เรื่องย่อ, วันฉาย, โปสเตอร์/ภาพ, ความยาวหนังหรือเวลาเฉลี่ยต่อตอน, แนว, นักแสดง/ทีมงาน, คะแนน TMDB และ Trailer เมื่อมี
- **Favorite:** สมาชิกหนึ่งคนบันทึกเรื่องเดียวกันได้หนึ่งครั้ง โดยใช้ `(user_id, media_type, tmdb_id)`; กดซ้ำเพื่อยกเลิก
- **Review:** สมาชิกหนึ่งคนมีหนึ่งรีวิวต่อเรื่อง โดยใช้ `(user_id, media_type, tmdb_id)`; ให้คะแนน 1–10 พร้อมข้อความ แก้ไขและลบรีวิวตัวเองได้ คะแนนสมาชิกกับคะแนน TMDB ต้องมีป้ายกำกับแยกกัน

## 4. ลำดับ Tickets

ทุก ticket ต้องทำเฉพาะขอบเขตที่ระบุ อ้างอิง Architecture ด้านบน แจ้งไฟล์ที่เปลี่ยน วิธีตรวจ และข้อจำกัดก่อนปิดงาน ไม่เพิ่ม admin, import catalog, streaming หรือฟีเจอร์อื่นนอกขอบเขตเอง

| ลำดับ | ID | งาน | ขึ้นกับ | สถานะ |
| --- | --- | --- | --- | --- |
| 1 | ARCH-01 | ยืนยัน contract ของ route, type และ API | — | เสร็จแล้ว |
| 2 | SET-01 | ตั้ง React, Router, Axios และโครงโฟลเดอร์ | ARCH-01 | เสร็จแล้ว |
| 3 | API-01 | Server proxy สำหรับ TMDB list/search/detail/credits/videos | SET-01 | เสร็จแล้ว |
| 4 | UI-01 | Navbar, layout และ TitleCard | SET-01, ARCH-01 | เสร็จแล้ว |
| 5 | UI-02 | Home พร้อมแถว Movie/Series/Animation | API-01, UI-01 | เสร็จแล้ว |
| 6 | UI-03 | Movie, Series และ Animation views | API-01, UI-01 | เสร็จแล้ว |
| 7 | UI-04 | ค้นหาจาก Navbar | API-01, UI-01 | เสร็จแล้ว |
| 8 | UI-05 | Detail view/card และ Trailer | API-01, UI-01 | เสร็จแล้ว |
| 9 | DB-01 | Migration สำหรับ Favorite, Review, ผู้ดูแล และ Vault | ARCH-01 | เสร็จแล้ว |
| 10 | AUTH-01 | สมัครสมาชิก Login Logout และตรวจ session | SET-01, DB-01 | โค้ดเสร็จ; ทดสอบจริงยังไม่ครบ |
| 11 | FAV-01 | เพิ่ม/ลบ Favorite และแสดงสถานะที่บันทึก | AUTH-01, UI-05 | เสร็จแล้ว; ทดสอบผ่านเว็บจริง |
| 12 | REVIEW-01 | เขียน แก้ไข ลบ และอ่านรีวิว | AUTH-01, UI-05 | เสร็จแล้ว; ทดสอบผ่านเว็บจริง |
| 13 | QA-01 | ตรวจ API, route, สิทธิ์ และเส้นทางผู้ใช้ | UI-02 ถึง REVIEW-01 | ยังไม่ครบ |
| 14 | RELEASE-01 | เอกสาร env, เครดิต TMDB และการรัน/deploy | QA-01 | เตรียมเอกสาร/โครง deploy แล้ว; ยังไม่ยืนยัน production |

### ARCH-01 — Contract ก่อนเขียนฟีเจอร์

- [x] ยืนยัน route และชนิด `media_type`, `TitleSummary`, `TitleDetail`, `Favorite`, `Review`
- [x] ระบุ endpoint ของ server สำหรับรายการตามหมวด, ค้นหา, detail, auth, Favorite และ Review พร้อมตัวอย่าง response/error
- [x] กำหนด cookie session ที่ server และวิธีตรวจตัวตนก่อนเขียน Supabase
- [x] ยืนยัน Animation ทุกประเทศ รวม movie/tv ในรายการเดียว; เรื่องเดียวกันอยู่หลายหมวดได้แต่ Favorite/Review ไม่ซ้ำ
- [x] ทบทวน contract กับผู้ใช้ก่อนเริ่ม SET-01; ticket นี้ไม่ติดตั้ง package หรือสร้าง UI

### SET-01 — โครงโปรเจกต์

- [x] ติดตั้ง React, React DOM, Router, Axios และเครื่องมือ TypeScript ที่จำเป็น; ตรึงเวอร์ชันใน lockfile
- [x] สร้างโครง `app/`, `view/`, `component/`, `api/`, `types/`, `server/`; เพิ่ม `lib/` เมื่อมี utility ที่จำเป็น
- [x] `app/` route ไปยัง view เปล่าตามที่กำหนด และเปิด URL โดยตรงได้
- [x] มีคำสั่งรัน client/server สำหรับ development และ production ที่บันทึกใน README
- [x] Build ผ่าน โดยยังไม่ใส่ข้อมูลจำลองที่ทำให้เข้าใจว่าเชื่อม TMDB แล้ว

### API-01 — TMDB ผ่าน Server

- [x] Server อ่าน TMDB key จาก Supabase Vault ฝั่ง server เท่านั้น; ไม่ส่ง key ให้ frontend
- [x] มี endpoint สำหรับ popular movie, popular tv, animation รวม movie/tv, search, movie detail และ tv detail
- [x] Detail endpoint ดึงข้อมูลนักแสดง/ทีมงานและ Trailer เพิ่ม โดยรองรับกรณีไม่มี Trailer
- [x] ตรวจ media type, ID, query และ pagination; จัดการ timeout/error ด้วยรูปแบบ response เดียวกัน
- [x] `src/api/` ใช้ Axios เรียก server และแปลงผลเป็นชนิดข้อมูลใน `types/`

### UI-01 — Navbar และ TitleCard

- [x] Navbar อยู่บนทุก view ตามรายการในหัวข้อ 2 และรองรับมือถือ/แป้นพิมพ์
- [x] `TitleCard` แสดงเฉพาะข้อมูลจาก `TitleSummary`; ส่ง `(media_type, tmdb_id)` เมื่อกด
- [x] มีภาพสำรอง/ข้อความสำหรับเรื่องที่ไม่มีโปสเตอร์

### UI-02 — Home

- [x] Home แสดง Movie, Series และ Anime/Cartoon ยอดนิยมแยกเป็นแถว
- [x] แต่ละแถวมี loading, empty และ error state โดยแถวหนึ่งล้มเหลวไม่ทำให้แถวอื่นหาย
- [x] กด TitleCard แล้วไป route รายละเอียดตาม media type

### UI-03 — หน้าหมวด

- [x] Movie, Series และ Animation แสดงรายการของหมวดตนเองและรองรับการโหลดรายการเพิ่มเติม/แบ่งหน้า
- [x] Animation รวมทุกประเทศและ movie/tv ในรายการเดียว โดยไม่ใช้ประเทศญี่ปุ่นเป็นเงื่อนไขบังคับ
- [x] มี loading, empty, error state และเข้าแต่ละ route โดยตรงได้

### UI-04 — ค้นหา

- [x] Search ใน Navbar ค้นหาได้จากทุกหน้ารายการ/รายละเอียด
- [x] ผลลัพธ์แสดง media type ชัดเจนและกดไปหน้ารายละเอียดที่ถูกต้อง
- [x] รองรับคำค้นว่าง, ไม่พบผลลัพธ์ และการค้นหาล้มเหลว

### UI-05 — รายละเอียด

- [x] เปิด `/movie/:tmdbId` หรือ `/tv/:tmdbId` แล้วเรียก detail endpoint ใหม่ ไม่ใช้เพียงข้อมูลบน card
- [x] แสดงข้อมูลตามหัวข้อ 3 โดยปรับความยาวให้ตรงกับ movie/tv และแสดง Trailer เมื่อมี
- [x] แสดงป้ายกำกับคะแนน TMDB ชัดเจน; ส่วนคะแนนสมาชิกจะแสดงแยกเมื่อ REVIEW-01 เสร็จ
- [x] มี loading, not found, error และกรณีข้อมูลบางช่องไม่มี

### DB-01 — Supabase Schema

- [x] ทำ migration สำหรับ `favorites` และ `reviews` ที่อ้างอิง Supabase Auth user และ `(media_type, tmdb_id)`
- [x] ตั้ง unique constraint, foreign key, rating range และความยาวรีวิวในฐานข้อมูล; server จะตรวจซ้ำเมื่อทำ REVIEW-01
- [x] จำกัดการอ่าน/เขียนข้อมูลสมาชิกด้วย RLS; ทดสอบ claim ของผู้ใช้คนอื่นว่าอ่าน Favorite และแก้/ลบรีวิวผู้อื่นไม่ได้
- [x] ไม่สร้างตารางเก็บข้อมูล TMDB ทั้ง catalog โดยไม่จำเป็น
- [x] รัน migration บน Supabase Cloud, บันทึก migration history และกำหนดบัญชี Auth คนแรกเป็นผู้ดูแลเว็บ
- [x] ทดสอบ constraint, RLS, สิทธิผู้ดูแล และป้องกันการเพิ่มสิทธิให้ตนเองด้วย transaction ที่ rollback
- [x] เก็บ TMDB API key ใน Supabase Vault; server อ่านจาก Vault และลบ `API_KEY` จาก `.env`
- [x] ทดสอบผู้ดูแลลบรีวิวของบัญชีที่สองด้วย RLS transaction ที่ rollback; API/UI สำหรับจัดการรีวิวอยู่ใน REVIEW-01

### AUTH-01 — สมาชิกและ Session

- [x] เชื่อม Supabase Auth สำหรับ Sign up, Login, Logout และสถานะ session ผ่าน server
- [x] Server เก็บ access/refresh token ใน HttpOnly cookie, ตรวจผู้ใช้กับ Supabase ผ่าน `/api/auth/me`, refresh session และตรวจ Origin สำหรับคำขอเปลี่ยนข้อมูล; endpoint Favorite/Review ยังไม่สร้างใน ticket นี้
- [x] แสดงข้อผิดพลาดและกรณีต้องยืนยันอีเมล; คนไม่ล็อกอินยังดูรายการ/รายละเอียดได้
- [x] Login/Signup รองรับ `returnTo` สำหรับกลับสู่เรื่องเดิมเมื่อ Favorite/Review เริ่มใช้งาน
- [x] เพิ่มหน้าและ API ขออีเมลกู้คืน/ตั้งรหัสผ่านใหม่ผ่าน Supabase Auth โดย server ตรวจ token และเปลี่ยนรหัสผ่าน
- [ ] ยืนยันค่า Reset Password/Site URL ใน Supabase Dashboard และทดสอบลิงก์จริงจากกล่องจดหมายจนตั้งรหัสใหม่สำเร็จ
- [ ] ทดลองสมัคร ยืนยันอีเมล ล็อกอิน refresh session และล็อกเอาต์ด้วยบัญชีจริงให้ครบทุกขั้น (ยืนยันแล้วเฉพาะการล็อกอิน)

### FAV-01 — Favorite

- [x] สมาชิกเพิ่ม/ยกเลิก Favorite ได้; server ใช้ identity ของผู้ใช้ที่ตรวจแล้ว
- [x] เก็บ `(media_type, tmdb_id)` และแสดงสถานะ Favorite ที่ถูกต้องบน card/detail
- [x] ผู้เยี่ยมชมที่กด Favorite ถูกพาไป Login; API ตรวจสิทธิ์, Origin, ID และใช้ insert แบบไม่เพิ่มแถวซ้ำ
- [x] ทดสอบเพิ่ม/ลบ/กดซ้ำ/กลับมา Login ใหม่ด้วยบัญชีจริงผ่านหน้าเว็บ; ยืนยันสถานะหลังรีโหลดและหลัง Login ใหม่

### REVIEW-01 — คะแนนและรีวิวสมาชิก

- [x] สมาชิกให้คะแนน 1–10 และเขียนรีวิวได้หนึ่งรายการต่อเรื่อง
- [x] เจ้าของแก้ไข/ลบรีวิวตัวเองได้; คนอื่นทำไม่ได้ด้วย RLS; ผู้ดูแลลบรีวิวอื่นได้ตามสิทธิ
- [x] หน้า Detail แสดงรายการรีวิว จำนวน และคะแนนเฉลี่ยของสมาชิก แยกจากคะแนน TMDB
- [x] ตรวจข้อความว่าง/ยาวเกิน, คะแนนนอกช่วง และผลลัพธ์เมื่อไม่มีรีวิว
- [x] ทดสอบโพสต์/แก้/ลบผ่านเว็บด้วย session บัญชีจริงและตรวจข้อมูลหลังรีโหลด; ตรวจคะแนนเฉลี่ยและจำนวนรีวิว

### QA-01 — ตรวจการทำงานจริง

- [x] ตรวจสอบ direct URL, เปลี่ยนหน้า, ค้นหา, รายละเอียด movie/tv และ Animation ที่รวมทั้ง movie และ tv
- [ ] ตรวจสอบสิทธิ์ข้ามบัญชี, ID ไม่ถูกต้อง, fallback เมื่อไม่มีโปสเตอร์/Trailer และระบบ error handling ให้ครบ (ยืนยันแล้วบางส่วนจาก API/DB)
- [ ] Build client/server ผ่านแล้ว; ยังต้องตรวจยืนยันว่า TMDB key และ database secrets ไม่อยู่ใน frontend bundle
- [x] ทดสอบ flow บัญชีจริง: guest → Login → Favorite/Review → Logout และกลับเข้าใช้งานอีกครั้ง; ตรวจข้อมูลคงอยู่ก่อนลบ

### RELEASE-01 — คู่มือและเตรียมเผยแพร่

- [x] ทำ `.env.example` ที่มีแต่ชื่อ key; อธิบายการตั้งค่าและคำสั่งรันโดยไม่เผยค่า secret
- [x] แสดงเครดิตและข้อความอ้างอิง TMDB ใน UI ตามเงื่อนไขการใช้ข้อมูล
- [ ] ระบุโฮสต์ที่รัน server ได้แล้ว; ยังต้องตรวจ run และ API/auth ในสภาพแวดล้อม production จริง

## 5. ผลตรวจสถานะล่าสุด (2026-10-01)

- `pnpm build` ผ่านทั้ง TypeScript client/server และ Vite; ยังไม่ใช่หลักฐานว่า deployment จริงทำงาน
- `pnpm test` ไม่ผ่าน เพราะ `package.json` ชี้ไปที่ `scripts/automated-qa-test.mjs` แต่ไม่มีไฟล์นี้ใน workspace; README ที่อ้างว่า automated tests 13 รายการผ่านจึงยังไม่มีหลักฐานที่รันซ้ำได้
- QA ผ่านหน้าเว็บที่ยืนยันแล้ว: เพิ่ม Favorite และคงสถานะหลังรีโหลด; โพสต์/แก้ Review และคงข้อมูลหลังรีโหลด. รีวิวทดสอบถูกลบแล้วและ Favorite ทดสอบถูกเก็บกวาดแล้ว
- ก่อนปิด AUTH-01/FAV-01/REVIEW-01 ให้ทดสอบรายการที่ยังไม่ติ๊กด้วยบัญชีจริง แล้วบันทึกผลและวันที่ โดยไม่บันทึกรหัสผ่านหรือ token
- ก่อนปิด QA-01 ให้เพิ่มชุดทดสอบที่เก็บใน repo และทำให้ `pnpm test` รันได้ หรือแก้ README/package script ให้ตรงกับวิธีทดสอบจริง
- ก่อนปิด RELEASE-01 ให้ยืนยัน deployment จริง พร้อมทดสอบ route, API, cookie/session และ environment variables บนโฮสต์นั้น
- ตรวจซ้ำ 2026-10-01: local `/api/health` และ guest `/api/auth/me` ตอบ 200; guest Favorite/Review write ตอบ 401, คะแนนผิดช่วงตอบ 400, Origin ผิดตอบ 403, ID ผิดตอบ 400, reset token ปลอมตอบ `RESET_LINK_INVALID`; หน้า reset แสดงข้อความลิงก์หมดอายุได้
- พบและแก้การแปล Supabase Auth error: API ส่งชื่อข้อผิดพลาดใน `error_code`; ทดสอบ Login ด้วยบัญชีสมมติและรหัสผิดแล้วได้ `INVALID_CREDENTIALS` พร้อมข้อความที่ตรงกรณี
- การทดสอบ AUTH-01 ด้วยบัญชีจริงยืนยัน Login, Logout และ `returnTo` แล้ว; ยังไม่ได้ทดสอบอีเมลกู้คืน, signup/confirmation และ refresh token หลังหมดอายุ
- ทดสอบผ่านเว็บจริง 2026-10-01 บน movie/550: Login → เพิ่ม Favorite → รีโหลด → โพสต์ Review 8/10 → แก้เป็น 9/10 → Logout → Login ใหม่พร้อม `returnTo` → Favorite/Review ยังอยู่ → ยกเลิก Favorite และลบ Review ผ่านปุ่มยืนยัน → รีโหลดแล้วทั้งสองรายการไม่กลับมา. ข้อมูลทดสอบถูกเก็บกวาดแล้ว
- ตรวจอีเมลกู้คืนจริง 2026-10-01: แพ็กเกจ Supabase Free แก้ Email Template ไม่ได้หากไม่ตั้ง Custom SMTP; จึงปรับหน้า Reset ให้รองรับลิงก์เริ่มต้น `/auth/v1/verify` ที่ส่ง access token ใน URL fragment ด้วย โดยลบ fragment ทันทีและส่ง token ไป server เฉพาะคำขอเปลี่ยนรหัสผ่าน. ทดสอบฟอร์มด้วย token จำลองและตรวจ error จาก token ปลอมแล้ว; ยังต้องขออีเมลใหม่และให้ผู้ใช้ตั้งรหัสจริงเพื่อปิด AUTH-01

## กติกาใช้ AI Agent กับ Tickets นี้

ให้สั่งทีละ ticket โดยแนบ ticket ID และให้ agent อ่าน Architecture ในไฟล์นี้ก่อนลงมือ จำกัดไฟล์/ขอบเขตตาม ticket และให้รายงานข้อขัดแย้งกับ contract ก่อนเปลี่ยน route, schema หรือหน้าที่ของโฟลเดอร์ เมื่อเสร็จให้รายงานไฟล์ที่แก้ ผลการตรวจ และสิ่งที่ยังไม่ได้ทำ แล้วจึงพิจารณา ticket ถัดไป
