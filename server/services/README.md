# Services

`tmdb.ts` ติดต่อ TMDB ด้วยคีย์ฝั่ง server และ `titles.ts` แปลงข้อมูลเป็น contract กลาง.
`supabaseAuth.ts` จัดการงานสมัคร/เข้าสู่ระบบและกู้รหัสผ่าน โดยเรียก repositories.
`favorites.ts` และ `reviews.ts` จัดการข้อมูลสำหรับ API; SQL และ Supabase REST อยู่ใน `../repositories/`.
PostgreSQL pool อยู่ใน `../database/config.ts`. ดูโครงสร้างทั้งหมดใน `../README.md`.
