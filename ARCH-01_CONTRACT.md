# ARCH-01 — Architecture Contract (อนุมัติแล้ว)

ผู้ใช้อนุมัติแนวทางหลักแล้ว: มี route สำหรับ Search/Login/Signup, server จัดการ Supabase Auth และ session ผ่าน cookie, Animation รวม movie/tv ในรายการเดียว และรีวิวใช้คะแนนจำนวนเต็ม 1–10 พร้อมข้อความ 1–2000 ตัวอักษร. สถานะงานล่าสุดดูที่ `PROJECT_TICKETS.md`

## 1. ขอบเขตและทิศทางข้อมูล

```text
Browser: app/ → view/ → component/
                    ↓
             api/ (Axios)
                    ↓
Server: routes/ → services/ → TMDB / Supabase Auth / Supabase DB
                    ↑
        middleware/ ตรวจ request และ session
```

- `app/` กำหนด route/layout และ render view เท่านั้น
- `view/` โหลดข้อมูลผ่าน `api/`, จัดสถานะหน้า แล้วประกอบ component
- `component/` แสดงผลตาม props และส่ง event กลับ view; ไม่ติดต่อ TMDB/Supabase เอง
- `api/` ใช้ Axios เรียก `/api/*` ของ server เท่านั้น; รวม request/response/error adapter
- `server/` ติดต่อ TMDB, Supabase Auth และฐานข้อมูล พร้อมตรวจ input/สิทธิ์
- `types/` เก็บชนิดข้อมูลที่เป็น contract; `lib/` เพิ่มเมื่อมี utility ใช้ซ้ำจริง
- TMDB เป็นแหล่งข้อมูลเรื่อง; Supabase เก็บผู้ใช้ Favorite และ Review ไม่คัดลอก catalog ทั้งหมด

## 2. Routes ของเว็บ

| Route | View | หมายเหตุ |
| --- | --- | --- |
| `/` | HomeView | Movie, Series, Animation ยอดนิยมแยกแถว |
| `/movies` | MovieView | รายการ movie |
| `/series` | SeriesView | รายการ tv |
| `/animation` | AnimationView | Animation ทุกประเทศ รวม movie/tv ในรายการเดียว |
| `/movie/:tmdbId` | DetailView | เรียก detail ของ movie ใหม่เมื่อเข้าหน้า |
| `/tv/:tmdbId` | DetailView | เรียก detail ของ tv ใหม่เมื่อเข้าหน้า |
| `/search?q=...` | SearchView | ผลค้นหาจาก Navbar; เป็นหน้า utility ไม่ใช่หมวดเนื้อหาที่ห้า |
| `/login?returnTo=...` | LoginView | กลับไปเรื่องเดิมหลังกด Favorite/Review แล้วล็อกอิน |
| `/signup?returnTo=...` | SignupView | รองรับกรณีต้องยืนยันอีเมล |

ทุกหน้ามี Navbar เดียวกัน. `returnTo` รับเฉพาะ path ภายในเว็บ เพื่อไม่ให้ redirect ไปเว็บอื่น. เข้า URL รายละเอียดโดยตรงต้องทำงานได้ และ route movie/tv ต้องไม่ใช้ ID สลับประเภท

Login และ Signup ใช้ route แยกตามที่ตกลงกัน

## 3. ชนิดข้อมูลฝั่งแอป

```ts
type MediaType = 'movie' | 'tv';
type CatalogCategory = 'movie' | 'series' | 'animation';
type MediaId = { mediaType: MediaType; tmdbId: number };

type TitleSummary = MediaId & {
  title: string;
  date: string | null;           // release_date หรือ first_air_date
  posterPath: string | null;
  backdropPath: string | null;
  tmdbScore: number | null;
  overview: string | null;
};

type PersonCredit = {
  tmdbId: number;
  name: string;
  role: string | null;           // character หรือ job
  profilePath: string | null;
};

type Trailer = {
  site: 'YouTube' | 'Vimeo';
  key: string;
  name: string;
  url: string;
} | null;

type TitleDetail = TitleSummary & {
  genres: { id: number; name: string }[];
  runtimeMinutes: number | null; // movie runtime หรือ tv episode_run_time[0]
  runtimeLabel: 'movie' | 'per_episode';
  cast: PersonCredit[];
  crew: PersonCredit[];
  trailer: Trailer;
  seasonsCount: number | null;   // tv เท่านั้น
  episodesCount: number | null;  // tv เท่านั้น
};

type Favorite = MediaId & { createdAt: string };
type Review = MediaId & {
  id: string;
  authorId: string;
  rating: number;                // integer 1–10
  body: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
};
type ReviewSummary = { average: number | null; count: number };
```

Server แปลง `title`/`name`, `release_date`/`first_air_date` และข้อมูล detail ที่รูปแบบต่างกันให้เป็น contract นี้. Card ใช้ `TitleSummary` เท่านั้น; DetailView เรียก `TitleDetail` ใหม่ด้วย `MediaId`. `CatalogCategory` เป็นหมวดแสดงผลและไม่ใช้เป็นรหัสบันทึก Favorite/Review; Animation อาจเป็นทั้ง movie และ tv

เมื่อ TMDB ไม่มีข้อมูล ให้ใช้ `null` หรือ array ว่าง ไม่สร้างค่าปลอม; score จาก TMDB กับคะแนนสมาชิกแสดงคนละป้าย

## 4. HTTP API ที่เสนอ

ทุก endpoint อยู่ใต้ `/api`. Success ส่ง JSON ตามรูปแบบ `{ data: ... }`; list ส่ง `{ data: TitleSummary[], page, totalPages, hasMore }`. สำหรับ Animation ที่รวมสอง source ให้ `totalPages` เป็นค่าสูงสุดของทั้งคู่ โดยจำกัดไม่เกิน page สูงสุด 500 ที่ server ยอมรับ. Error ส่ง `{ error: { code, message } }`. ตัวอย่างรหัส: `INVALID_INPUT` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `UPSTREAM_UNAVAILABLE` (502). หน้าเว็บไม่แสดง stack trace หรือ secret

### Catalog / Search / Detail (public)

| Endpoint | ข้อมูลที่ได้ | TMDB ที่ server เรียก |
| --- | --- | --- |
| `GET /api/titles/popular?mediaType=movie&page=1` | movie ยอดนิยม | `/movie/popular` |
| `GET /api/titles/popular?mediaType=tv&page=1` | series ยอดนิยม | `/tv/popular` |
| `GET /api/titles/animation?page=1` | animation movie/tv รวมในรายการเดียว | `/discover/movie` และ `/discover/tv` พร้อม genre Animation |
| `GET /api/titles/search?q=...&page=1` | movie/tv จากคำค้น | `/search/multi`, กรองผล `person` ออก |
| `GET /api/titles/movie/:tmdbId` | `TitleDetail` ของ movie | `/movie/{id}` พร้อม credits/videos |
| `GET /api/titles/tv/:tmdbId` | `TitleDetail` ของ tv | `/tv/{id}` พร้อม credits/videos |

ตัวอย่างรายการ: `GET /api/titles/popular?mediaType=movie&page=1` → `{ "data": [{ "mediaType": "movie", "tmdbId": 123, "title": "Example", "date": "2025-01-01", "posterPath": "/poster.jpg", "backdropPath": null, "tmdbScore": 7.4, "overview": null }], "page": 1, "totalPages": 20, "hasMore": true }`

ตัวอย่าง detail: `GET /api/titles/movie/123` → `{ "data": { ...TitleSummary, "genres": [], "runtimeMinutes": 110, "runtimeLabel": "movie", "cast": [], "crew": [], "trailer": null, "seasonsCount": null, "episodesCount": null } }`

ตรวจ `tmdbId` เป็น integer บวก, `mediaType` เฉพาะ movie/tv, `page` เป็นจำนวนเต็มในช่วงที่รองรับ, `q` ไม่ว่างและจำกัดความยาว. Server กำหนด TMDB key และ timeout; UI จัดการ loading/empty/error. Trailer เลือกจากรายการ video ที่ TMDB ส่งมา; ถ้าไม่มีให้ `null`

### Auth (public/สมาชิก)

| Endpoint | หน้าที่ |
| --- | --- |
| `POST /api/auth/signup` | รับ email/password, เรียก Supabase Auth; แจ้งว่าต้องยืนยันอีเมลหรือไม่ |
| `POST /api/auth/login` | รับ email/password, เรียก Supabase Auth และสร้าง session cookie |
| `POST /api/auth/logout` | ออกจากระบบและล้าง session cookie |
| `GET /api/auth/me` | คืนข้อมูลผู้ใช้ที่ตรวจสอบแล้ว หรือ `null` |

ตัวอย่าง `GET /api/auth/me` → `{ "data": { "id": "uuid", "email": "user@example.com" } }` หรือ `{ "data": null }`. ห้ามส่ง refresh/access token กลับใน response body เพื่อให้ frontend เก็บเอง

### Favorite (ต้อง Login)

| Endpoint | หน้าที่ |
| --- | --- |
| `GET /api/favorites` | รายการ `(mediaType, tmdbId, createdAt)` ของผู้ใช้ปัจจุบัน |
| `PUT /api/favorites/:mediaType/:tmdbId` | เพิ่ม Favorite; กดซ้ำได้ผลเดิม |
| `DELETE /api/favorites/:mediaType/:tmdbId` | เอาออก; ลบซ้ำได้ผลเดิม |

ตัวอย่าง `PUT /api/favorites/movie/123` → `{ "data": { "mediaType": "movie", "tmdbId": 123, "createdAt": "2026-09-30T00:00:00Z" } }`. `user_id` มาจาก session ที่ server ตรวจแล้วเท่านั้น. หากทำหน้ารายการโปรดภายหลัง server ใช้ ID ใน Supabase ไปเรียก TMDB เพื่อแสดง card

### Review (อ่าน public; เขียนต้อง Login)

| Endpoint | หน้าที่ |
| --- | --- |
| `GET /api/titles/:mediaType/:tmdbId/reviews?page=1` | รีวิวแบบแบ่งหน้า พร้อม `ReviewSummary` |
| `PUT /api/titles/:mediaType/:tmdbId/my-review` | สร้างหรือแก้รีวิวของผู้ใช้ปัจจุบัน |
| `DELETE /api/titles/:mediaType/:tmdbId/my-review` | ลบรีวิวของผู้ใช้ปัจจุบัน |

ตัวอย่าง `PUT` body: `{ "rating": 8, "body": "ชอบการเล่าเรื่อง" }`. ผลลัพธ์: `{ "data": { "id": "uuid", "mediaType": "movie", "tmdbId": 123, "authorId": "uuid", "rating": 8, "body": "ชอบการเล่าเรื่อง", "createdAt": "...", "updatedAt": "...", "isMine": true } }`. คะแนนเป็น integer 1–10; จำกัดความยาวข้อความ (เสนอ 1–2000 ตัวอักษร). `GET reviews` คืน `{ data: Review[], summary: { average, count }, page, totalPages }`. เมื่อไม่มีรีวิว `average: null, count: 0`

## 5. Session และสิทธิ์ (ข้อเสนอหลัก)

**server เป็นเจ้าของ Auth และ session ตามที่ตกลงกัน:** Browser เรียก Auth endpoint ผ่าน Axios; server ใช้ Supabase Auth ตรวจบัญชี แล้วเก็บ session ใน cookie แบบ `HttpOnly`, `Secure` บน HTTPS และ `SameSite=Lax`. Frontend อ่านสถานะจาก `/api/auth/me` ไม่อ่าน token เอง. Server refresh session ตามอายุ token และตรวจผู้ใช้กับ Supabase ก่อน Favorite/Review; ไม่เชื่อ `user_id` จาก body. Endpoint ที่เปลี่ยนข้อมูลตรวจ Origin/CSRF ตามรูปแบบ cookie session. การอ่าน/เขียน DB ใช้สิทธิ์ของผู้ใช้ที่ตรวจแล้วและ RLS; ไม่ใช้ service-role key กับคำขอสมาชิกทั่วไป

Browser ไม่เรียก Supabase Auth หรือฐานข้อมูลโดยตรง; `api/` เรียก server เท่านั้น

Supabase Auth เป็นแหล่งตัวตน; DB ใช้ unique `(user_id, media_type, tmdb_id)` ทั้ง Favorite และ Review พร้อม RLS. ผู้เยี่ยมชมอ่านข้อมูล TMDB และรีวิวได้; การเขียนต้อง Login. หลัง Login ใช้ `returnTo` กลับหน้ารายละเอียดเดิม

## 6. เกณฑ์ Anime/Cartoon

**ใช้หมวด Animation ของ TMDB ทั้ง movie และ tv โดยไม่กรองประเทศ/ภาษา**. Server เรียก discover movie และ discover tv พร้อม genre Animation แล้วรวมผลเป็นรายการเดียว เรียงตาม popularity. `page=n` ให้ server ดึงหน้า `n` ของทั้งสอง source แล้วรวม/เรียงผลใน batch นั้น; `hasMore` เป็นจริงตราบใดที่ source ใด source หนึ่งยังมีหน้าถัดไป. วิธีนี้ไม่ข้ามหรือซ้ำรายการ แต่จำนวน card ต่อหน้าอาจลดลงเมื่อ source หนึ่งหมดก่อน. AnimationView แสดง grid เดียว; Home ใช้รายการรวมหน้าแรกและเลือกจำนวน card สำหรับแถว Animation. Card ระบุ movie/tv เพื่อเปิด detail ถูกประเภท

เรื่องแอนิเมชันยังปรากฏในหน้า Movie หรือ Series ตาม `mediaType` ได้ด้วย เพราะ Animation เป็นหมวดซ้อน ไม่ใช่ชนิดเรื่องใหม่. Favorite/Review ของเรื่องเดียวกันจึงใช้ ID เดียวกัน ไม่แยกข้อมูลตามหน้าที่เข้ามา

หมวด Animation ของ TMDB อาจไม่ครอบคลุมบางรายการที่ไม่ได้ติด genre นี้ จึงควรตรวจตัวอย่างจริงใน API-01

## 7. การตัดสินใจที่อนุมัติแล้ว

1. ใช้ `/search`, `/login`, `/signup` เป็น route เพิ่มจาก 4 หน้าหมวดหลัก
2. Server จัดการ Supabase Auth และ cookie session; browser ไม่ติดต่อฐานข้อมูลโดยตรง
3. AnimationView รวม movie/tv ใน grid เดียว และ Home รวมทั้งสองแบบในแถว Animation
4. รีวิวใช้คะแนน integer 1–10 และข้อความ 1–2000 ตัวอักษร

ลำดับ ticket และสถานะล่าสุดอยู่ใน `PROJECT_TICKETS.md`

## เอกสารอ้างอิง

- TMDB: [Discover Movie](https://developer.themoviedb.org/reference/discover-movie), [Discover TV](https://developer.themoviedb.org/reference/discover-tv), [Append to Response](https://developer.themoviedb.org/docs/append-to-response), [Search TV](https://developer.themoviedb.org/reference/search-tv)
- Supabase: [Auth](https://supabase.com/docs/guides/auth), [Server-side sessions](https://supabase.com/docs/guides/auth/server-side), [Server package choices](https://supabase.com/docs/guides/auth/choosing-a-server-package), [Session validation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
